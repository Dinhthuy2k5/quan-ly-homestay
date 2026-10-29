package vn.edu.hust.homestay.pricing.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.pricing.dto.CreatePriceRuleChangeRequest;
import vn.edu.hust.homestay.pricing.dto.PriceRuleChangeRequestResponse;
import vn.edu.hust.homestay.pricing.dto.ProposedRuleDto;
import vn.edu.hust.homestay.pricing.entity.PriceRule;
import vn.edu.hust.homestay.pricing.entity.PriceRule.AdjustType;
import vn.edu.hust.homestay.pricing.entity.PriceRule.RuleType;
import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest;
import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest.RequestType;
import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest.Status;
import vn.edu.hust.homestay.pricing.repository.PriceRuleChangeRequestRepository;
import vn.edu.hust.homestay.pricing.repository.PriceRuleRepository;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.repository.RoomRepository;

import java.time.Instant;
import java.util.Set;

/**
 * Service xử lý API-PRICE-03: Gửi yêu cầu thay đổi quy tắc giá của Manager.
 * Chưa áp dụng vào bảng price_rules cho đến khi Director phê duyệt (Tuần 4).
 * Ngày thực hiện: 25/10/2026
 */
@Service
public class ManagerPriceRuleChangeRequestService {

    private static final Logger log = LoggerFactory.getLogger(ManagerPriceRuleChangeRequestService.class);
    private static final Set<String> VALID_WEEKDAYS = Set.of("MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN");

    private final PriceRuleChangeRequestRepository changeRequestRepository;
    private final PriceRuleRepository priceRuleRepository;
    private final RoomRepository roomRepository;
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    public ManagerPriceRuleChangeRequestService(
            PriceRuleChangeRequestRepository changeRequestRepository,
            PriceRuleRepository priceRuleRepository,
            RoomRepository roomRepository
    ) {
        this.changeRequestRepository = changeRequestRepository;
        this.priceRuleRepository = priceRuleRepository;
        this.roomRepository = roomRepository;
    }

    /**
     * API-PRICE-03: Gửi yêu cầu CREATE, UPDATE hoặc DEACTIVATE quy tắc giá.
     */
    @Transactional
    public PriceRuleChangeRequestResponse createChangeRequest(
            UserPrincipal principal,
            CreatePriceRuleChangeRequest req
    ) {
        Long homestayId = requireHomestayId(principal);

        if (req.getRequestType() == null) {
            throw BusinessException.badRequest("INVALID_PRICE_RULE", "requestType không được để trống (CREATE, UPDATE, DEACTIVATE)");
        }

        ProposedRuleDto proposed = req.getProposedRule();

        switch (req.getRequestType()) {
            case CREATE -> {
                if (req.getTargetRuleId() != null) {
                    throw BusinessException.badRequest("INVALID_PRICE_RULE", "targetRuleId phải là null khi tạo mới đề xuất (CREATE)");
                }
                if (proposed == null) {
                    throw BusinessException.badRequest("INVALID_PRICE_RULE", "proposedRule không được để trống khi tạo mới đề xuất");
                }
                validateProposedRule(proposed, homestayId, true);
            }
            case UPDATE -> {
                if (req.getTargetRuleId() == null) {
                    throw BusinessException.badRequest("INVALID_PRICE_RULE", "targetRuleId không được để trống với yêu cầu UPDATE");
                }
                PriceRule target = findAndValidateTargetRule(req.getTargetRuleId(), homestayId);
                if (target.getStatus() == PriceRule.Status.EXPIRED) {
                    throw BusinessException.badRequest("INVALID_PRICE_RULE", "Không thể sửa quy tắc giá đã hết hạn (EXPIRED)");
                }
                if (changeRequestRepository.existsByTargetRuleIdAndStatus(target.getId(), Status.PENDING_APPROVAL)) {
                    throw BusinessException.conflict("PRICE_REQUEST_ALREADY_PENDING", "Đang có yêu cầu thay đổi cho quy tắc này chờ Giám đốc duyệt");
                }
                if (proposed == null) {
                    throw BusinessException.badRequest("INVALID_PRICE_RULE", "proposedRule không được để trống với yêu cầu UPDATE");
                }
                if (proposed.getRuleType() == null) {
                    proposed.setRuleType(target.getRuleType());
                } else if (proposed.getRuleType() != target.getRuleType()) {
                    throw BusinessException.badRequest("INVALID_PRICE_RULE", "Không thể thay đổi ruleType của quy tắc hiện có");
                }
                if (target.getRuleType() == RuleType.BASE
                        && !target.getRoomId().equals(proposed.getRoomId())) {
                    throw BusinessException.badRequest(
                            "INVALID_PRICE_RULE",
                            "Không thể chuyển giá cơ bản sang phòng khác khi cập nhật quy tắc"
                    );
                }
                validateProposedRule(proposed, homestayId, false);
            }
            case DEACTIVATE -> {
                if (req.getTargetRuleId() == null) {
                    throw BusinessException.badRequest("INVALID_PRICE_RULE", "targetRuleId không được để trống với yêu cầu DEACTIVATE");
                }
                PriceRule target = findAndValidateTargetRule(req.getTargetRuleId(), homestayId);
                if (target.getStatus() != PriceRule.Status.ACTIVE) {
                    throw BusinessException.badRequest("INVALID_PRICE_RULE", "Chỉ có thể yêu cầu ngừng quy tắc đang hoạt động (ACTIVE)");
                }
                if (changeRequestRepository.existsByTargetRuleIdAndStatus(target.getId(), Status.PENDING_APPROVAL)) {
                    throw BusinessException.conflict("PRICE_REQUEST_ALREADY_PENDING", "Đang có yêu cầu thay đổi cho quy tắc này chờ Giám đốc duyệt");
                }
                if (target.getRuleType() == RuleType.BASE) {
                    throw BusinessException.conflict(
                            "PRICE_RULE_CONFLICT",
                            "Không thể ngừng giá cơ bản duy nhất của phòng. Hãy gửi đề xuất cập nhật giá mới thay thế"
                    );
                }
                if (proposed == null) {
                    proposed = ProposedRuleDto.builder()
                            .roomId(target.getRoomId())
                            .ruleType(target.getRuleType())
                            .name(target.getName())
                            .action("DEACTIVATE")
                            .build();
                }
            }
        }

        String jsonProposed;
        try {
            jsonProposed = objectMapper.writeValueAsString(proposed);
        } catch (JsonProcessingException e) {
            log.error("Lỗi chuyển đổi proposedRule sang JSON: {}", e.getMessage());
            throw BusinessException.badRequest("INVALID_PRICE_RULE", "Dữ liệu proposedRule không thể chuyển đổi thành JSON hợp lệ");
        }

        PriceRuleChangeRequest entity = new PriceRuleChangeRequest();
        entity.setHomestayId(homestayId);
        entity.setTargetRuleId(req.getTargetRuleId());
        entity.setRequestType(req.getRequestType());
        entity.setProposedRule(jsonProposed);
        entity.setStatus(Status.PENDING_APPROVAL);
        entity.setRequestedBy(principal.getId());
        entity.setRequestedAt(Instant.now());

        PriceRuleChangeRequest saved = changeRequestRepository.save(entity);
        return PriceRuleChangeRequestResponse.from(saved, proposed);
    }

    /** API-PRICE-04: Manager theo dõi yêu cầu của homestay mình. */
    @Transactional(readOnly = true)
    public Page<PriceRuleChangeRequestResponse> getChangeRequests(
            UserPrincipal principal,
            Status status,
            Pageable pageable
    ) {
        Long homestayId = requireHomestayId(principal);
        Page<PriceRuleChangeRequest> requests = status == null
                ? changeRequestRepository.findByHomestayId(homestayId, pageable)
                : changeRequestRepository.findByHomestayIdAndStatus(homestayId, status, pageable);

        return requests.map(request -> {
            try {
                Object proposedRule = objectMapper.readValue(request.getProposedRule(), Object.class);
                return PriceRuleChangeRequestResponse.from(request, proposedRule);
            } catch (JsonProcessingException e) {
                log.error("Không thể đọc proposed_rule của yêu cầu giá id={}", request.getId(), e);
                throw BusinessException.badRequest(
                        "INVALID_PRICE_RULE",
                        "Dữ liệu yêu cầu thay đổi giá không hợp lệ"
                );
            }
        });
    }

    private void validateProposedRule(ProposedRuleDto proposed, Long homestayId, boolean isCreate) {
        if (proposed.getRuleType() == null) {
            throw BusinessException.badRequest("INVALID_PRICE_RULE", "ruleType trong proposedRule không được để trống (BASE hoặc ADJUSTMENT)");
        }

        if (proposed.getRuleType() == RuleType.BASE) {
            if (proposed.getRoomId() == null) {
                throw BusinessException.badRequest("INVALID_PRICE_RULE", "Quy tắc giá BASE bắt buộc phải chỉ định phòng (roomId)");
            }
            Room room = roomRepository.findById(proposed.getRoomId())
                    .orElseThrow(() -> BusinessException.notFound("ROOM_NOT_FOUND", "Không tìm thấy phòng đã chọn"));
            if (!room.getHomestayId().equals(homestayId)) {
                throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Phòng không thuộc cơ sở homestay được giao");
            }
            if (proposed.getBasePrice() == null || proposed.getBasePrice() <= 0) {
                throw BusinessException.badRequest("INVALID_PRICE_RULE", "Giá cơ bản (basePrice) phải lớn hơn 0");
            }
            if (isCreate && changeRequestRepository.existsPendingCreateBaseRequestForRoom(homestayId, proposed.getRoomId())) {
                throw BusinessException.conflict(
                        "PRICE_REQUEST_ALREADY_PENDING",
                        "Đang có đề xuất giá cơ bản của phòng này chờ Giám đốc duyệt"
                );
            }
            if (proposed.getName() == null || proposed.getName().trim().isEmpty()) {
                proposed.setName("Giá cơ bản - " + room.getName());
            } else {
                proposed.setName(proposed.getName().trim());
            }
        } else {
            // ADJUSTMENT
            if (proposed.getName() == null || proposed.getName().trim().isEmpty()) {
                throw BusinessException.badRequest("INVALID_PRICE_RULE", "Tên quy tắc điều chỉnh giá không được để trống");
            }
            proposed.setName(proposed.getName().trim());

            if (proposed.getRoomId() != null) {
                Room room = roomRepository.findById(proposed.getRoomId())
                        .orElseThrow(() -> BusinessException.notFound("ROOM_NOT_FOUND", "Không tìm thấy phòng"));
                if (!room.getHomestayId().equals(homestayId)) {
                    throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Phòng không thuộc cơ sở homestay được giao");
                }
            }

            if (proposed.getAdjustType() == null) {
                throw BusinessException.badRequest("INVALID_PRICE_RULE", "adjustType phải là PERCENT hoặc FIXED_PRICE");
            }
            if (proposed.getAdjustValue() == null) {
                throw BusinessException.badRequest("INVALID_PRICE_RULE", "Giá trị điều chỉnh (adjustValue) không được để trống");
            }

            if (proposed.getAdjustType() == AdjustType.PERCENT) {
                if (proposed.getAdjustValue() == 0 || proposed.getAdjustValue() < -99 || proposed.getAdjustValue() > 500) {
                    throw BusinessException.badRequest("INVALID_PRICE_RULE", "Tỷ lệ phần trăm điều chỉnh giá phải từ -99% đến +500% và khác 0");
                }
            } else if (proposed.getAdjustType() == AdjustType.FIXED_PRICE) {
                if (proposed.getAdjustValue() <= 0) {
                    throw BusinessException.badRequest("INVALID_PRICE_RULE", "Giá cố định theo đêm (FIXED_PRICE) phải lớn hơn 0");
                }
            }

            if (proposed.getWeekdays() != null && !proposed.getWeekdays().isEmpty()) {
                for (String day : proposed.getWeekdays()) {
                    if (day == null || !VALID_WEEKDAYS.contains(day.trim().toUpperCase())) {
                        throw BusinessException.badRequest("INVALID_PRICE_RULE", "Thứ trong tuần không hợp lệ: " + day + " (chỉ chấp nhận MON, TUE, WED, THU, FRI, SAT, SUN)");
                    }
                }
            }

            if (proposed.getStartDate() != null && proposed.getEndDate() != null
                    && proposed.getStartDate().isAfter(proposed.getEndDate())) {
                throw BusinessException.badRequest("INVALID_PRICE_RULE", "startDate không được sau endDate");
            }

            if (proposed.getPriority() == null) {
                proposed.setPriority((short) 10);
            }
        }
    }

    private PriceRule findAndValidateTargetRule(Long targetRuleId, Long homestayId) {
        PriceRule target = priceRuleRepository.findById(targetRuleId)
                .orElseThrow(() -> BusinessException.notFound("PRICE_RULE_NOT_FOUND", "Không tìm thấy quy tắc giá mục tiêu"));
        if (!target.getHomestayId().equals(homestayId)) {
            throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Không có quyền thao tác trên quy tắc giá thuộc cơ sở khác");
        }
        return target;
    }

    private Long requireHomestayId(UserPrincipal principal) {
        if (principal == null || principal.getHomestayId() == null) {
            throw BusinessException.badRequest("HOMESTAY_NOT_ASSIGNED", "Tài khoản quản lý chưa được phân công cơ sở");
        }
        return principal.getHomestayId();
    }
}
