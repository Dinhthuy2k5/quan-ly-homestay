package vn.edu.hust.homestay.pricing.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.auth.entity.User;
import vn.edu.hust.homestay.auth.repository.UserRepository;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.common.response.PagedResult;
import vn.edu.hust.homestay.homestay.entity.Homestay;
import vn.edu.hust.homestay.homestay.repository.HomestayRepository;
import vn.edu.hust.homestay.pricing.dto.DirectorPriceRuleChangeRequestSummaryResponse;
import vn.edu.hust.homestay.pricing.dto.ProposedRuleDto;
import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest;
import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest.Status;
import vn.edu.hust.homestay.pricing.repository.PriceRuleChangeRequestRepository;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.repository.RoomRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static vn.edu.hust.homestay.common.constant.ValidationConstants.MAX_PAGE_SIZE;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.MIN_PAGE_SIZE;

/**
 * Service xử lý nghiệp vụ phê duyệt yêu cầu thay đổi quy tắc giá dành cho Giám đốc (Director):
 * - API-DIR-PRICE-01: Danh sách yêu cầu thay đổi giá toàn công ty (lọc trạng thái, cơ sở, khoảng ngày).
 */
@Service
public class DirectorPriceRuleChangeRequestService {

    private static final Logger log = LoggerFactory.getLogger(DirectorPriceRuleChangeRequestService.class);
    private static final ZoneId BUSINESS_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "requestedAt", "id", "status", "requestType", "reviewedAt"
    );

    private final PriceRuleChangeRequestRepository changeRequestRepository;
    private final HomestayRepository homestayRepository;
    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final ObjectMapper objectMapper;

    public DirectorPriceRuleChangeRequestService(
            PriceRuleChangeRequestRepository changeRequestRepository,
            HomestayRepository homestayRepository,
            UserRepository userRepository,
            RoomRepository roomRepository
    ) {
        this.changeRequestRepository = changeRequestRepository;
        this.homestayRepository = homestayRepository;
        this.userRepository = userRepository;
        this.roomRepository = roomRepository;
        this.objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    /**
     * API-DIR-PRICE-01: Danh sách yêu cầu thay đổi giá toàn công ty.
     * - Không truyền status sẽ trả tất cả trạng thái (UI mặc định lọc PENDING_APPROVAL).
     * - fromDate/toDate được quy đổi từ ngày theo giờ Việt Nam (+07:00) sang khoảng nửa mở UTC [from, to+1).
     */
    @Transactional(readOnly = true)
    public PagedResult<DirectorPriceRuleChangeRequestSummaryResponse> listChangeRequests(
            String rawStatus,
            String rawHomestayId,
            String rawFromDate,
            String rawToDate,
            int page,
            int size,
            String rawSort
    ) {
        Status statusFilter = parseOptionalStatus(rawStatus);
        Long homestayIdFilter = parseOptionalPositiveId(rawHomestayId, "homestayId phải là số nguyên dương hợp lệ");
        LocalDate fromDate = parseOptionalDate(rawFromDate);
        LocalDate toDate = parseOptionalDate(rawToDate);
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw BusinessException.badRequest(
                    "INVALID_DATE_RANGE",
                    "Ngày bắt đầu không được sau ngày kết thúc"
            );
        }

        Instant fromInstant = fromDate == null
                ? null
                : fromDate.atStartOfDay(BUSINESS_TIME_ZONE).toInstant();
        Instant toExclusiveInstant = toDate == null
                ? null
                : toDate.plusDays(1).atStartOfDay(BUSINESS_TIME_ZONE).toInstant();

        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(MIN_PAGE_SIZE, size), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(safePage, safeSize, parseSort(rawSort));

        Page<PriceRuleChangeRequest> requestPage = changeRequestRepository.searchForDirector(
                statusFilter,
                homestayIdFilter,
                fromInstant,
                toExclusiveInstant,
                pageable
        );

        List<PriceRuleChangeRequest> rows = requestPage.getContent();
        if (rows.isEmpty()) {
            return PagedResult.of(requestPage, List.of());
        }

        // Parse proposed_rule 1 lần cho mỗi dòng và gom ID để nạp batch (không N+1)
        Map<Long, ParsedProposal> parsedById = new HashMap<>(rows.size());
        Set<Long> homestayIds = new HashSet<>();
        Set<Long> userIds = new HashSet<>();
        Set<Long> roomIds = new HashSet<>();

        for (PriceRuleChangeRequest row : rows) {
            homestayIds.add(row.getHomestayId());
            if (row.getRequestedBy() != null) {
                userIds.add(row.getRequestedBy());
            }
            if (row.getReviewedBy() != null) {
                userIds.add(row.getReviewedBy());
            }
            ParsedProposal parsed = parseProposalSafely(row);
            parsedById.put(row.getId(), parsed);
            if (parsed.roomId() != null) {
                roomIds.add(parsed.roomId());
            }
        }

        Map<Long, String> homestayNameById = homestayRepository.findAllById(homestayIds).stream()
                .collect(Collectors.toMap(Homestay::getId, Homestay::getName, (a, b) -> a));

        Map<Long, User> userById = userIds.isEmpty()
                ? Map.of()
                : userRepository.findAllById(userIds).stream()
                        .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));

        Map<Long, String> roomNameById = roomIds.isEmpty()
                ? Map.of()
                : roomRepository.findAllById(roomIds).stream()
                        .collect(Collectors.toMap(Room::getId, Room::getName, (a, b) -> a));

        List<DirectorPriceRuleChangeRequestSummaryResponse> items = new ArrayList<>(rows.size());
        for (PriceRuleChangeRequest row : rows) {
            User requester = row.getRequestedBy() == null ? null : userById.get(row.getRequestedBy());
            User reviewer = row.getReviewedBy() == null ? null : userById.get(row.getReviewedBy());
            ParsedProposal parsed = parsedById.get(row.getId());
            Long roomId = parsed != null ? parsed.roomId() : null;

            items.add(new DirectorPriceRuleChangeRequestSummaryResponse(
                    row.getId(),
                    row.getHomestayId(),
                    homestayNameById.get(row.getHomestayId()),
                    row.getTargetRuleId(),
                    row.getRequestType(),
                    row.getStatus(),
                    row.getRequestedBy(),
                    requester != null ? requester.getFullName() : null,
                    requester != null ? requester.getEmail() : null,
                    row.getRequestedAt(),
                    row.getReviewedBy(),
                    reviewer != null ? reviewer.getFullName() : null,
                    row.getReviewedAt(),
                    row.getRejectionReason(),
                    roomId,
                    roomId != null ? roomNameById.get(roomId) : null,
                    parsed != null ? parsed.payload() : null
            ));
        }

        return PagedResult.of(requestPage, items);
    }

    /**
     * Đọc cột JSON proposed_rule sang ProposedRuleDto để tự động chuẩn hóa LocalDate
     * (kể cả khi dữ liệu cũ trong DB lưu dạng mảng [yyyy, MM, dd]) về chuỗi ISO YYYY-MM-DD.
     * Nếu gặp dữ liệu JSON không đúng cấu trúc DTO thì fallback sang Object để tránh làm hỏng cả trang.
     */
    private ParsedProposal parseProposalSafely(PriceRuleChangeRequest row) {
        String rawJson = row.getProposedRule();
        if (rawJson == null || rawJson.isBlank()) {
            return new ParsedProposal(null, null);
        }
        try {
            ProposedRuleDto dto = objectMapper.readValue(rawJson, ProposedRuleDto.class);
            return new ParsedProposal(dto.getRoomId(), dto);
        } catch (JsonProcessingException dtoException) {
            log.warn("Không thể ánh xạ proposed_rule của yêu cầu giá id={} sang ProposedRuleDto, dùng fallback JSON: {}",
                    row.getId(), dtoException.getMessage());
            try {
                Object fallback = objectMapper.readValue(rawJson, Object.class);
                Long extractedRoomId = null;
                if (fallback instanceof Map<?, ?> map && map.get("roomId") instanceof Number num) {
                    extractedRoomId = num.longValue();
                }
                return new ParsedProposal(extractedRoomId, fallback);
            } catch (JsonProcessingException rawException) {
                log.error("Dữ liệu JSON proposed_rule bị hỏng ở yêu cầu giá id={}", row.getId(), rawException);
                return new ParsedProposal(null, null);
            }
        }
    }

    private Status parseOptionalStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        try {
            return Status.valueOf(normalized);
        } catch (IllegalArgumentException exception) {
            throw BusinessException.badRequest(
                    "VALIDATION_ERROR",
                    "Trạng thái yêu cầu chỉ hỗ trợ PENDING_APPROVAL, APPROVED hoặc REJECTED"
            );
        }
    }

    private Long parseOptionalPositiveId(String raw, String message) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            long id = Long.parseLong(raw.trim());
            if (id <= 0) {
                throw BusinessException.badRequest("VALIDATION_ERROR", message);
            }
            return id;
        } catch (NumberFormatException exception) {
            throw BusinessException.badRequest("VALIDATION_ERROR", message);
        }
    }

    private LocalDate parseOptionalDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(raw.trim());
        } catch (DateTimeParseException exception) {
            throw BusinessException.badRequest("INVALID_DATE_RANGE", "Ngày phải theo định dạng YYYY-MM-DD");
        }
    }

    private Sort parseSort(String rawSort) {
        if (rawSort == null || rawSort.isBlank()) {
            return Sort.by(Sort.Order.desc("requestedAt"), Sort.Order.desc("id"));
        }
        String[] parts = rawSort.trim().split(",", 2);
        String property = parts[0].trim();
        if (!ALLOWED_SORT_FIELDS.contains(property)) {
            throw BusinessException.badRequest("INVALID_SORT", "Trường sort không được hỗ trợ");
        }
        Sort.Direction direction;
        try {
            direction = parts.length > 1 ? Sort.Direction.fromString(parts[1].trim()) : Sort.Direction.DESC;
        } catch (IllegalArgumentException exception) {
            throw BusinessException.badRequest("INVALID_SORT", "Chiều sort chỉ nhận asc hoặc desc");
        }
        if ("id".equals(property)) {
            return Sort.by(new Sort.Order(direction, "id"));
        }
        return Sort.by(new Sort.Order(direction, property), Sort.Order.desc("id"));
    }

    private record ParsedProposal(Long roomId, Object payload) {}
}
