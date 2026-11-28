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
import vn.edu.hust.homestay.pricing.dto.DirectorPriceRuleChangeRequestSummaryResponse.CurrentRuleSummary;
import vn.edu.hust.homestay.pricing.dto.DirectorPriceRuleChangeRequestSummaryResponse.HomestayScopeSummary;
import vn.edu.hust.homestay.pricing.dto.DirectorPriceRuleChangeRequestSummaryResponse.PriceComparisonSummary;
import vn.edu.hust.homestay.pricing.dto.DirectorPriceRuleChangeRequestSummaryResponse.RoomSummary;
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
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;
import vn.edu.hust.homestay.room.entity.RoomType;
import vn.edu.hust.homestay.room.repository.HomestayRoomCountProjection;
import vn.edu.hust.homestay.room.repository.RoomRepository;
import vn.edu.hust.homestay.room.repository.RoomTypeRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import static vn.edu.hust.homestay.common.constant.ValidationConstants.MAX_PAGE_SIZE;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.MIN_PAGE_SIZE;

/**
 * Service xử lý nghiệp vụ phê duyệt yêu cầu thay đổi quy tắc giá dành cho Giám đốc (Director):
 * - API-DIR-PRICE-01: Danh sách yêu cầu thay đổi giá toàn công ty kèm đối chiếu giá hiện tại → đề xuất
 *   và tóm tắt phòng/phạm vi cơ sở (batch-load, không N+1).
 */
@Service
public class DirectorPriceRuleChangeRequestService {

    private static final Logger log = LoggerFactory.getLogger(DirectorPriceRuleChangeRequestService.class);
    private static final ZoneId BUSINESS_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "requestedAt", "id", "status", "requestType", "reviewedAt"
    );

    private final PriceRuleChangeRequestRepository changeRequestRepository;
    private final PriceRuleRepository priceRuleRepository;
    private final HomestayRepository homestayRepository;
    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final ObjectMapper objectMapper;

    public DirectorPriceRuleChangeRequestService(
            PriceRuleChangeRequestRepository changeRequestRepository,
            PriceRuleRepository priceRuleRepository,
            HomestayRepository homestayRepository,
            UserRepository userRepository,
            RoomRepository roomRepository,
            RoomTypeRepository roomTypeRepository
    ) {
        this.changeRequestRepository = changeRequestRepository;
        this.priceRuleRepository = priceRuleRepository;
        this.homestayRepository = homestayRepository;
        this.userRepository = userRepository;
        this.roomRepository = roomRepository;
        this.roomTypeRepository = roomTypeRepository;
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

        // 1. Parse proposed_rule 1 lần và gom tập ID để nạp batch (không N+1)
        Map<Long, ParsedProposal> parsedById = new HashMap<>(rows.size());
        Set<Long> homestayIds = new HashSet<>();
        Set<Long> userIds = new HashSet<>();
        Set<Long> targetRuleIds = new HashSet<>();

        for (PriceRuleChangeRequest row : rows) {
            homestayIds.add(row.getHomestayId());
            if (row.getRequestedBy() != null) {
                userIds.add(row.getRequestedBy());
            }
            if (row.getReviewedBy() != null) {
                userIds.add(row.getReviewedBy());
            }
            if (row.getTargetRuleId() != null) {
                targetRuleIds.add(row.getTargetRuleId());
            }
            parsedById.put(row.getId(), parseProposalSafely(row));
        }

        // 2. Nạp batch cơ sở, người dùng, quy tắc mục tiêu và toàn bộ quy tắc ACTIVE của các cơ sở trên trang
        Map<Long, String> homestayNameById = homestayRepository.findAllById(homestayIds).stream()
                .collect(Collectors.toMap(Homestay::getId, Homestay::getName, (a, b) -> a));

        Map<Long, User> userById = userIds.isEmpty()
                ? Map.of()
                : userRepository.findAllById(userIds).stream()
                        .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));

        Map<Long, PriceRule> targetRuleById = targetRuleIds.isEmpty()
                ? Map.of()
                : priceRuleRepository.findAllById(targetRuleIds).stream()
                        .collect(Collectors.toMap(PriceRule::getId, r -> r, (a, b) -> a));

        List<PriceRule> activeRules = priceRuleRepository.findByHomestayIdInAndStatus(homestayIds, PriceRule.Status.ACTIVE);
        Map<Long, PriceRule> activeBaseRuleByRoomId = new HashMap<>();
        Map<Long, List<PriceRule>> activeBaseRulesByHomestayId = new HashMap<>();
        for (PriceRule rule : activeRules) {
            if (rule.getRuleType() == RuleType.BASE && rule.getRoomId() != null) {
                activeBaseRuleByRoomId.put(rule.getRoomId(), rule);
                activeBaseRulesByHomestayId.computeIfAbsent(rule.getHomestayId(), k -> new ArrayList<>()).add(rule);
            }
        }

        // 3. Xác định roomId hiệu lực của từng yêu cầu, gom phòng cụ thể và homestay áp dụng toàn cơ sở
        Map<Long, Long> effectiveRoomIdByRequestId = new HashMap<>(rows.size());
        Set<Long> roomIds = new HashSet<>();
        Set<Long> homestayWideIds = new HashSet<>();

        for (PriceRuleChangeRequest row : rows) {
            ParsedProposal parsed = parsedById.get(row.getId());
            PriceRule targetRule = row.getTargetRuleId() == null ? null : targetRuleById.get(row.getTargetRuleId());
            Long effectiveRoomId = resolveEffectiveRoomId(row, parsed, targetRule);
            effectiveRoomIdByRequestId.put(row.getId(), effectiveRoomId);
            if (effectiveRoomId != null) {
                roomIds.add(effectiveRoomId);
            } else {
                homestayWideIds.add(row.getHomestayId());
            }
        }

        Map<Long, Room> roomById = roomIds.isEmpty()
                ? Map.of()
                : roomRepository.findAllById(roomIds).stream()
                        .collect(Collectors.toMap(Room::getId, r -> r, (a, b) -> a));

        Set<Long> roomTypeIds = roomById.values().stream()
                .map(Room::getRoomTypeId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, String> roomTypeNameById = roomTypeIds.isEmpty()
                ? Map.of()
                : roomTypeRepository.findAllById(roomTypeIds).stream()
                        .collect(Collectors.toMap(RoomType::getId, RoomType::getName, (a, b) -> a));

        Map<Long, HomestayScopeSummary> homestayScopeSummaryById = buildHomestayScopeSummaries(
                homestayWideIds,
                activeBaseRulesByHomestayId
        );

        // 4. Lắp ráp DTO phản hồi đầy đủ ngữ cảnh cho từng dòng
        List<DirectorPriceRuleChangeRequestSummaryResponse> items = new ArrayList<>(rows.size());

        for (PriceRuleChangeRequest row : rows) {
            User requester = row.getRequestedBy() == null ? null : userById.get(row.getRequestedBy());
            User reviewer = row.getReviewedBy() == null ? null : userById.get(row.getReviewedBy());
            ParsedProposal parsed = parsedById.get(row.getId());
            ProposedRuleDto proposedDto = parsed != null ? parsed.dto() : null;
            PriceRule targetRule = row.getTargetRuleId() == null ? null : targetRuleById.get(row.getTargetRuleId());
            Long roomId = effectiveRoomIdByRequestId.get(row.getId());
            Room room = roomId == null ? null : roomById.get(roomId);
            PriceRule activeBaseForRoom = roomId == null ? null : activeBaseRuleByRoomId.get(roomId);

            RoomSummary roomSummary = room == null ? null : new RoomSummary(
                    room.getId(),
                    room.getName(),
                    roomTypeNameById.get(room.getRoomTypeId()),
                    room.getMaxGuests() == null ? null : Byte.toUnsignedInt(room.getMaxGuests()),
                    room.getStatus(),
                    room.getStatusReason(),
                    activeBaseForRoom != null ? activeBaseForRoom.getBasePrice() : null
            );

            HomestayScopeSummary scopeSummary = roomId == null
                    ? homestayScopeSummaryById.get(row.getHomestayId())
                    : null;

            PriceRule referenceCurrentRule = resolveReferenceCurrentRule(row, proposedDto, targetRule, activeBaseForRoom);
            CurrentRuleSummary currentRuleSummary = referenceCurrentRule == null
                    ? null
                    : toCurrentRuleSummary(referenceCurrentRule);

            // Chỉ tính đối chiếu giá trước→sau cho yêu cầu PENDING_APPROVAL
            // (yêu cầu APPROVED đã ghi đè price_rules nên không tạo diff giả 0%).
            PriceComparisonSummary priceComparison = row.getStatus() == Status.PENDING_APPROVAL
                    ? buildPriceComparison(
                            row,
                            proposedDto,
                            targetRule,
                            referenceCurrentRule,
                            activeBaseForRoom,
                            scopeSummary
                    )
                    : null;

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
                    room != null ? room.getName() : null,
                    parsed != null ? parsed.payload() : null,
                    roomSummary,
                    scopeSummary,
                    currentRuleSummary,
                    priceComparison
            ));
        }

        return PagedResult.of(requestPage, items);
    }

    private Long resolveEffectiveRoomId(PriceRuleChangeRequest row, ParsedProposal parsed, PriceRule targetRule) {
        if (row.getRequestType() == RequestType.DEACTIVATE) {
            return targetRule != null ? targetRule.getRoomId() : (parsed != null ? parsed.roomId() : null);
        }
        Long proposedRoomId = parsed != null ? parsed.roomId() : null;
        RuleType effectiveType = parsed != null && parsed.dto() != null && parsed.dto().getRuleType() != null
                ? parsed.dto().getRuleType()
                : (targetRule != null ? targetRule.getRuleType() : null);
        if (effectiveType == RuleType.BASE && proposedRoomId == null && targetRule != null) {
            return targetRule.getRoomId();
        }
        return proposedRoomId;
    }

    private Map<Long, HomestayScopeSummary> buildHomestayScopeSummaries(
            Set<Long> homestayWideIds,
            Map<Long, List<PriceRule>> activeBaseRulesByHomestayId
    ) {
        if (homestayWideIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, HomestayRoomCountProjection> statsByHomestayId = roomRepository
                .countRoomStatsByHomestayIds(homestayWideIds)
                .stream()
                .collect(Collectors.toMap(HomestayRoomCountProjection::getHomestayId, s -> s, (a, b) -> a));

        Map<Long, Set<Long>> activeRoomIdsByHomestayId = new HashMap<>();
        for (Room activeRoom : roomRepository.findByHomestayIdInAndStatus(homestayWideIds, RoomStatus.ACTIVE)) {
            activeRoomIdsByHomestayId
                    .computeIfAbsent(activeRoom.getHomestayId(), k -> new HashSet<>())
                    .add(activeRoom.getId());
        }

        Map<Long, HomestayScopeSummary> result = new HashMap<>(homestayWideIds.size());
        for (Long hsId : homestayWideIds) {
            HomestayRoomCountProjection stats = statsByHomestayId.get(hsId);
            long activeRooms = stats != null && stats.getActiveRooms() != null ? stats.getActiveRooms() : 0L;
            long totalRooms = stats != null && stats.getTotalRooms() != null ? stats.getTotalRooms() : 0L;

            Set<Long> activeRoomIds = activeRoomIdsByHomestayId.getOrDefault(hsId, Set.of());
            List<Long> activeRoomBasePrices = activeBaseRulesByHomestayId.getOrDefault(hsId, List.of()).stream()
                    .filter(rule -> rule.getBasePrice() != null && activeRoomIds.contains(rule.getRoomId()))
                    .map(PriceRule::getBasePrice)
                    .toList();

            Long minBase = activeRoomBasePrices.isEmpty()
                    ? null
                    : activeRoomBasePrices.stream().min(Long::compareTo).orElse(null);
            Long maxBase = activeRoomBasePrices.isEmpty()
                    ? null
                    : activeRoomBasePrices.stream().max(Long::compareTo).orElse(null);

            result.put(hsId, new HomestayScopeSummary(activeRooms, totalRooms, minBase, maxBase));
        }
        return result;
    }

    private PriceRule resolveReferenceCurrentRule(
            PriceRuleChangeRequest row,
            ProposedRuleDto proposedDto,
            PriceRule targetRule,
            PriceRule activeBaseForRoom
    ) {
        if (targetRule != null) {
            return targetRule;
        }
        if (row.getStatus() == Status.PENDING_APPROVAL
                && row.getRequestType() == RequestType.CREATE
                && proposedDto != null
                && proposedDto.getRuleType() == RuleType.BASE) {
            return activeBaseForRoom;
        }
        return null;
    }

    private CurrentRuleSummary toCurrentRuleSummary(PriceRule rule) {
        return new CurrentRuleSummary(
                rule.getId(),
                rule.getRoomId(),
                rule.getRuleType(),
                rule.getName(),
                rule.getBasePrice(),
                rule.getAdjustType(),
                rule.getAdjustValue(),
                parseWeekdaysCsv(rule.getWeekdays()),
                rule.getStartDate(),
                rule.getEndDate(),
                rule.getPriority(),
                rule.getStatus()
        );
    }

    private PriceComparisonSummary buildPriceComparison(
            PriceRuleChangeRequest row,
            ProposedRuleDto proposed,
            PriceRule targetRule,
            PriceRule referenceCurrentRule,
            PriceRule activeBaseForRoom,
            HomestayScopeSummary scopeSummary
    ) {
        Long roomBasePrice = activeBaseForRoom != null ? activeBaseForRoom.getBasePrice() : null;
        RuleType effectiveType = proposed != null && proposed.getRuleType() != null
                ? proposed.getRuleType()
                : (referenceCurrentRule != null ? referenceCurrentRule.getRuleType() : null);

        if (row.getRequestType() == RequestType.DEACTIVATE) {
            if (referenceCurrentRule == null || referenceCurrentRule.getRuleType() != RuleType.ADJUSTMENT) {
                return null;
            }
            if (referenceCurrentRule.getRoomId() != null && roomBasePrice != null) {
                Long currentNightly = calculateAdjustedPrice(
                        roomBasePrice,
                        referenceCurrentRule.getAdjustType(),
                        referenceCurrentRule.getAdjustValue()
                );
                if (currentNightly != null) {
                    long delta = roomBasePrice - currentNightly;
                    return new PriceComparisonSummary(
                            currentNightly,
                            roomBasePrice,
                            delta,
                            computeDeltaPercent(currentNightly, roomBasePrice),
                            null,
                            null,
                            false,
                            List.of()
                    );
                }
            }
            if (referenceCurrentRule.getAdjustType() == AdjustType.FIXED_PRICE) {
                return new PriceComparisonSummary(
                        referenceCurrentRule.getAdjustValue(),
                        null,
                        null,
                        null,
                        scopeSummary != null ? scopeSummary.minBasePrice() : null,
                        scopeSummary != null ? scopeSummary.maxBasePrice() : null,
                        false,
                        List.of()
                );
            }
            return null;
        }

        if (proposed == null || effectiveType == null) {
            return null;
        }

        if (effectiveType == RuleType.BASE) {
            Long currentAmount = referenceCurrentRule != null ? referenceCurrentRule.getBasePrice() : null;
            Long proposedAmount = proposed.getBasePrice();
            Long deltaAmount = (currentAmount != null && proposedAmount != null)
                    ? proposedAmount - currentAmount
                    : null;
            Double deltaPercent = (currentAmount != null && proposedAmount != null)
                    ? computeDeltaPercent(currentAmount, proposedAmount)
                    : null;
            boolean replacesActiveBase = row.getRequestType() == RequestType.CREATE && referenceCurrentRule != null;
            List<String> changedFields = row.getRequestType() == RequestType.UPDATE && targetRule != null
                    ? computeChangedFields(targetRule, proposed)
                    : List.of();
            return new PriceComparisonSummary(
                    currentAmount,
                    proposedAmount,
                    deltaAmount,
                    deltaPercent,
                    null,
                    null,
                    replacesActiveBase,
                    changedFields
            );
        }

        // Quy tắc ADJUSTMENT (CREATE hoặc UPDATE)
        boolean isRoomScoped = proposed.getRoomId() != null;
        List<String> changedFields = row.getRequestType() == RequestType.UPDATE && targetRule != null
                ? computeChangedFields(targetRule, proposed)
                : List.of();

        if (row.getRequestType() == RequestType.CREATE) {
            if (isRoomScoped) {
                if (roomBasePrice != null) {
                    Long proposedNightly = calculateAdjustedPrice(roomBasePrice, proposed.getAdjustType(), proposed.getAdjustValue());
                    Long deltaAmount = proposedNightly != null ? proposedNightly - roomBasePrice : null;
                    Double deltaPercent = proposedNightly != null ? computeDeltaPercent(roomBasePrice, proposedNightly) : null;
                    return new PriceComparisonSummary(
                            roomBasePrice,
                            proposedNightly,
                            deltaAmount,
                            deltaPercent,
                            null,
                            null,
                            false,
                            List.of()
                    );
                }
                Long proposedFixed = proposed.getAdjustType() == AdjustType.FIXED_PRICE ? proposed.getAdjustValue() : null;
                Double deltaPct = proposed.getAdjustType() == AdjustType.PERCENT && proposed.getAdjustValue() != null
                        ? proposed.getAdjustValue().doubleValue()
                        : null;
                return new PriceComparisonSummary(null, proposedFixed, null, deltaPct, null, null, false, List.of());
            }

            // Toàn cơ sở (CREATE ADJUSTMENT)
            Long projectedMin = projectScopePrice(scopeSummary != null ? scopeSummary.minBasePrice() : null, proposed);
            Long projectedMax = projectScopePrice(scopeSummary != null ? scopeSummary.maxBasePrice() : null, proposed);
            Long proposedFixed = proposed.getAdjustType() == AdjustType.FIXED_PRICE ? proposed.getAdjustValue() : null;
            Double deltaPct = proposed.getAdjustType() == AdjustType.PERCENT && proposed.getAdjustValue() != null
                    ? proposed.getAdjustValue().doubleValue()
                    : null;
            return new PriceComparisonSummary(null, proposedFixed, null, deltaPct, projectedMin, projectedMax, false, List.of());
        }

        // UPDATE ADJUSTMENT
        if (isRoomScoped) {
            Long currentNightly = null;
            Long proposedNightly = null;
            if (roomBasePrice != null) {
                if (targetRule != null) {
                    currentNightly = calculateAdjustedPrice(roomBasePrice, targetRule.getAdjustType(), targetRule.getAdjustValue());
                }
                proposedNightly = calculateAdjustedPrice(roomBasePrice, proposed.getAdjustType(), proposed.getAdjustValue());
            } else {
                if (targetRule != null && targetRule.getAdjustType() == AdjustType.FIXED_PRICE) {
                    currentNightly = targetRule.getAdjustValue();
                }
                if (proposed.getAdjustType() == AdjustType.FIXED_PRICE) {
                    proposedNightly = proposed.getAdjustValue();
                }
            }
            Long deltaAmount = (currentNightly != null && proposedNightly != null)
                    ? proposedNightly - currentNightly
                    : null;
            Double deltaPercent = (currentNightly != null && proposedNightly != null)
                    ? computeDeltaPercent(currentNightly, proposedNightly)
                    : computePercentToPercentEffectiveDelta(targetRule, proposed);
            return new PriceComparisonSummary(
                    currentNightly,
                    proposedNightly,
                    deltaAmount,
                    deltaPercent,
                    null,
                    null,
                    false,
                    changedFields
            );
        }

        // UPDATE ADJUSTMENT toàn cơ sở
        Long projectedMin = projectScopePrice(scopeSummary != null ? scopeSummary.minBasePrice() : null, proposed);
        Long projectedMax = projectScopePrice(scopeSummary != null ? scopeSummary.maxBasePrice() : null, proposed);
        Long currentAmount = null;
        Long proposedAmount = null;
        Long deltaAmount = null;
        Double deltaPercent = null;

        if (targetRule != null
                && targetRule.getAdjustType() == AdjustType.FIXED_PRICE
                && proposed.getAdjustType() == AdjustType.FIXED_PRICE
                && targetRule.getAdjustValue() != null
                && proposed.getAdjustValue() != null) {
            currentAmount = targetRule.getAdjustValue();
            proposedAmount = proposed.getAdjustValue();
            deltaAmount = proposedAmount - currentAmount;
            deltaPercent = computeDeltaPercent(currentAmount, proposedAmount);
        } else {
            if (proposed.getAdjustType() == AdjustType.FIXED_PRICE) {
                proposedAmount = proposed.getAdjustValue();
            }
            if (targetRule != null && targetRule.getAdjustType() == AdjustType.FIXED_PRICE) {
                currentAmount = targetRule.getAdjustValue();
            }
            deltaPercent = computePercentToPercentEffectiveDelta(targetRule, proposed);
        }

        return new PriceComparisonSummary(
                currentAmount,
                proposedAmount,
                deltaAmount,
                deltaPercent,
                projectedMin,
                projectedMax,
                false,
                changedFields
        );
    }

    private List<String> computeChangedFields(PriceRule target, ProposedRuleDto proposed) {
        List<String> changed = new ArrayList<>();
        if (!Objects.equals(trimToNull(target.getName()), trimToNull(proposed.getName()))) {
            changed.add("name");
        }
        if (target.getRuleType() == RuleType.BASE) {
            if (!Objects.equals(target.getBasePrice(), proposed.getBasePrice())) {
                changed.add("basePrice");
            }
            return changed;
        }
        if (!Objects.equals(target.getRoomId(), proposed.getRoomId())) {
            changed.add("roomId");
        }
        if (!Objects.equals(target.getAdjustType(), proposed.getAdjustType())) {
            changed.add("adjustType");
        }
        if (!Objects.equals(target.getAdjustValue(), proposed.getAdjustValue())) {
            changed.add("adjustValue");
        }
        if (!normalizeWeekdaySet(parseWeekdaysCsv(target.getWeekdays())).equals(normalizeWeekdaySet(proposed.getWeekdays()))) {
            changed.add("weekdays");
        }
        if (!Objects.equals(target.getStartDate(), proposed.getStartDate())
                || !Objects.equals(target.getEndDate(), proposed.getEndDate())) {
            changed.add("dateRange");
        }
        short targetPriority = target.getPriority() != null ? target.getPriority() : (short) 0;
        short proposedPriority = proposed.getPriority() != null ? proposed.getPriority() : targetPriority;
        if (targetPriority != proposedPriority) {
            changed.add("priority");
        }
        return changed;
    }

    private Long calculateAdjustedPrice(Long basePrice, AdjustType adjustType, Long adjustValue) {
        if (adjustType == null || adjustValue == null) {
            return null;
        }
        if (adjustType == AdjustType.FIXED_PRICE) {
            return adjustValue;
        }
        if (basePrice == null || basePrice < 0) {
            return null;
        }
        return BigDecimal.valueOf(basePrice)
                .multiply(BigDecimal.valueOf(100L).add(BigDecimal.valueOf(adjustValue)))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                .longValueExact();
    }

    private Long projectScopePrice(Long scopeBasePrice, ProposedRuleDto proposed) {
        if (proposed == null || proposed.getAdjustType() == null || proposed.getAdjustValue() == null) {
            return null;
        }
        if (proposed.getAdjustType() == AdjustType.FIXED_PRICE) {
            return proposed.getAdjustValue();
        }
        return calculateAdjustedPrice(scopeBasePrice, proposed.getAdjustType(), proposed.getAdjustValue());
    }

    private Double computePercentToPercentEffectiveDelta(PriceRule targetRule, ProposedRuleDto proposed) {
        if (targetRule == null
                || proposed == null
                || targetRule.getAdjustType() != AdjustType.PERCENT
                || proposed.getAdjustType() != AdjustType.PERCENT
                || targetRule.getAdjustValue() == null
                || proposed.getAdjustValue() == null) {
            return null;
        }
        long oldMultiplier = 100L + targetRule.getAdjustValue();
        long newMultiplier = 100L + proposed.getAdjustValue();
        return computeDeltaPercent(oldMultiplier, newMultiplier);
    }

    private Double computeDeltaPercent(long before, long after) {
        if (before <= 0) {
            return null;
        }
        return BigDecimal.valueOf(after - before)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(before), 1, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private List<String> parseWeekdaysCsv(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toUpperCase(Locale.ROOT))
                .toList();
    }

    private Set<String> normalizeWeekdaySet(List<String> weekdays) {
        if (weekdays == null || weekdays.isEmpty()) {
            return Set.of();
        }
        return weekdays.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toUpperCase(Locale.ROOT))
                .collect(Collectors.toSet());
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * Đọc cột JSON proposed_rule sang ProposedRuleDto để tự động chuẩn hóa LocalDate
     * (kể cả khi dữ liệu cũ trong DB lưu dạng mảng [yyyy, MM, dd]) về chuỗi ISO YYYY-MM-DD.
     * Nếu gặp dữ liệu JSON không đúng cấu trúc DTO thì fallback sang Object để tránh làm hỏng cả trang.
     */
    private ParsedProposal parseProposalSafely(PriceRuleChangeRequest row) {
        String rawJson = row.getProposedRule();
        if (rawJson == null || rawJson.isBlank()) {
            return new ParsedProposal(null, null, null);
        }
        try {
            ProposedRuleDto dto = objectMapper.readValue(rawJson, ProposedRuleDto.class);
            return new ParsedProposal(dto.getRoomId(), dto, dto);
        } catch (JsonProcessingException dtoException) {
            log.warn("Không thể ánh xạ proposed_rule của yêu cầu giá id={} sang ProposedRuleDto, dùng fallback JSON: {}",
                    row.getId(), dtoException.getMessage());
            try {
                Object fallback = objectMapper.readValue(rawJson, Object.class);
                Long extractedRoomId = null;
                if (fallback instanceof Map<?, ?> map && map.get("roomId") instanceof Number num) {
                    extractedRoomId = num.longValue();
                }
                return new ParsedProposal(extractedRoomId, null, fallback);
            } catch (JsonProcessingException rawException) {
                log.error("Dữ liệu JSON proposed_rule bị hỏng ở yêu cầu giá id={}", row.getId(), rawException);
                return new ParsedProposal(null, null, null);
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

    private record ParsedProposal(Long roomId, ProposedRuleDto dto, Object payload) {}
}
