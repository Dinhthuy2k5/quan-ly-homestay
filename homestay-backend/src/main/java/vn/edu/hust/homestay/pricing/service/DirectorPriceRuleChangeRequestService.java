package vn.edu.hust.homestay.pricing.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
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
import vn.edu.hust.homestay.media.entity.Media;
import vn.edu.hust.homestay.media.entity.Media.OwnerType;
import vn.edu.hust.homestay.media.repository.MediaRepository;
import vn.edu.hust.homestay.pricing.dto.DirectorPriceRuleChangeRequestDetailResponse;
import vn.edu.hust.homestay.pricing.dto.DirectorPriceRuleChangeRequestDetailResponse.ActiveRuleItem;
import vn.edu.hust.homestay.pricing.dto.DirectorPriceRuleChangeRequestDetailResponse.AffectedRoomPreview;
import vn.edu.hust.homestay.pricing.dto.DirectorPriceRuleChangeRequestDetailResponse.HomestayScopeDetail;
import vn.edu.hust.homestay.pricing.dto.DirectorPriceRuleChangeRequestDetailResponse.PeerPriceBenchmark;
import vn.edu.hust.homestay.pricing.dto.DirectorPriceRuleChangeRequestDetailResponse.RoomDetailContext;
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
import java.util.Comparator;
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
 * - API-DIR-PRICE-02: Chi tiết yêu cầu phê duyệt giá kèm quy tắc hiện hành, hồ sơ phòng & mặt bằng giá
 *   cùng hạng/cơ sở và danh sách quy tắc đang hiệu lực.
 */
@Service
public class DirectorPriceRuleChangeRequestService {

    private static final Logger log = LoggerFactory.getLogger(DirectorPriceRuleChangeRequestService.class);
    /** Múi giờ nghiệp vụ Việt Nam (+07:00) dùng để quy đổi bộ lọc ngày fromDate/toDate sang UTC Instant. */
    private static final ZoneId BUSINESS_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    /** Danh sách trắng các cột được phép truyền vào tham số sort (tránh lỗi/lộ cột nhạy cảm). */
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "requestedAt", "id", "status", "requestType", "reviewedAt"
    );

    private final PriceRuleChangeRequestRepository changeRequestRepository;
    private final PriceRuleRepository priceRuleRepository;
    private final HomestayRepository homestayRepository;
    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final MediaRepository mediaRepository;
    /** ObjectMapper riêng cấu hình chuẩn hóa LocalDate sang chuỗi ISO YYYY-MM-DD và bỏ qua field thừa. */
    private final ObjectMapper objectMapper;

    public DirectorPriceRuleChangeRequestService(
            PriceRuleChangeRequestRepository changeRequestRepository,
            PriceRuleRepository priceRuleRepository,
            HomestayRepository homestayRepository,
            UserRepository userRepository,
            RoomRepository roomRepository,
            RoomTypeRepository roomTypeRepository,
            MediaRepository mediaRepository
    ) {
        this.changeRequestRepository = changeRequestRepository;
        this.priceRuleRepository = priceRuleRepository;
        this.homestayRepository = homestayRepository;
        this.userRepository = userRepository;
        this.roomRepository = roomRepository;
        this.roomTypeRepository = roomTypeRepository;
        this.mediaRepository = mediaRepository;
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
        // --- Bước 0: Validate và chuẩn hóa các tham số lọc & phân trang từ query string ---
        // Trạng thái cần lọc (null = lấy tất cả trạng thái)
        Status statusFilter = parseOptionalStatus(rawStatus);
        // ID cơ sở homestay cần lọc (null = lấy toàn công ty)
        Long homestayIdFilter = parseOptionalPositiveId(rawHomestayId, "homestayId phải là số nguyên dương hợp lệ");
        // Ngày bắt đầu / kết thúc lọc theo lịch Việt Nam (YYYY-MM-DD, inclusive)
        LocalDate fromDate = parseOptionalDate(rawFromDate);
        LocalDate toDate = parseOptionalDate(rawToDate);
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw BusinessException.badRequest(
                    "INVALID_DATE_RANGE",
                    "Ngày bắt đầu không được sau ngày kết thúc"
            );
        }

        // Mốc UTC đầu ngày fromDate (00:00:00 +07:00, bao gồm mốc này)
        Instant fromInstant = fromDate == null
                ? null
                : fromDate.atStartOfDay(BUSINESS_TIME_ZONE).toInstant();
        // Mốc UTC đầu ngày kế tiếp sau toDate ((toDate + 1) 00:00:00 +07:00, không bao gồm mốc này)
        Instant toExclusiveInstant = toDate == null
                ? null
                : toDate.plusDays(1).atStartOfDay(BUSINESS_TIME_ZONE).toInstant();

        // Chỉ số trang an toàn (>= 0) và kích thước trang nằm trong [MIN_PAGE_SIZE, MAX_PAGE_SIZE]
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(MIN_PAGE_SIZE, size), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(safePage, safeSize, parseSort(rawSort));

        // Trang kết quả thô truy vấn từ bảng price_rule_change_requests
        Page<PriceRuleChangeRequest> requestPage = changeRequestRepository.searchForDirector(
                statusFilter,
                homestayIdFilter,
                fromInstant,
                toExclusiveInstant,
                pageable
        );

        // Danh sách các bản ghi yêu cầu trên trang hiện tại
        List<PriceRuleChangeRequest> rows = requestPage.getContent();
        if (rows.isEmpty()) {
            return PagedResult.of(requestPage, List.of());
        }

        // --- Bước 1: Giải mã cột JSON proposed_rule 1 lần và gom các tập ID để truy vấn batch (tránh N+1) ---
        // Map: requestId (ID yêu cầu) -> kết quả giải mã JSON proposed_rule (roomId, DTO chuẩn hóa, payload trả JSON)
        Map<Long, ParsedProposal> parsedById = new HashMap<>(rows.size());
        // Tập homestayId xuất hiện trên trang để nạp tên cơ sở và quy tắc giá đang ACTIVE
        Set<Long> homestayIds = new HashSet<>();
        // Tập userId của cả người gửi (requestedBy) và người duyệt (reviewedBy)
        Set<Long> userIds = new HashSet<>();
        // Tập targetRuleId (ID quy tắc gốc trong price_rules của các yêu cầu UPDATE / DEACTIVATE)
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

        // --- Bước 2: Nạp batch dữ liệu tham chiếu từ DB theo các tập ID đã gom ---
        // Map: homestayId -> tên cơ sở homestay
        Map<Long, String> homestayNameById = homestayRepository.findAllById(homestayIds).stream()
                .collect(Collectors.toMap(Homestay::getId, Homestay::getName, (a, b) -> a));

        // Map: userId -> thực thể User (dùng lấy họ tên, email người gửi và họ tên người duyệt)
        Map<Long, User> userById = userIds.isEmpty()
                ? Map.of()
                : userRepository.findAllById(userIds).stream()
                        .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));

        // Map: targetRuleId -> quy tắc giá gốc trong bảng price_rules (cho yêu cầu UPDATE / DEACTIVATE)
        Map<Long, PriceRule> targetRuleById = targetRuleIds.isEmpty()
                ? Map.of()
                : priceRuleRepository.findAllById(targetRuleIds).stream()
                        .collect(Collectors.toMap(PriceRule::getId, r -> r, (a, b) -> a));

        // Toàn bộ quy tắc giá đang ACTIVE của các cơ sở xuất hiện trên trang
        List<PriceRule> activeRules = priceRuleRepository.findByHomestayIdInAndStatus(homestayIds, PriceRule.Status.ACTIVE);
        // Map: roomId -> quy tắc giá cơ bản (BASE) đang ACTIVE của phòng đó (mỗi phòng tối đa 1 dòng)
        Map<Long, PriceRule> activeBaseRuleByRoomId = new HashMap<>();
        // Map: homestayId -> danh sách tất cả quy tắc giá cơ bản (BASE) đang ACTIVE thuộc cơ sở đó
        Map<Long, List<PriceRule>> activeBaseRulesByHomestayId = new HashMap<>();
        for (PriceRule rule : activeRules) {
            if (rule.getRuleType() == RuleType.BASE && rule.getRoomId() != null) {
                activeBaseRuleByRoomId.put(rule.getRoomId(), rule);
                activeBaseRulesByHomestayId.computeIfAbsent(rule.getHomestayId(), k -> new ArrayList<>()).add(rule);
            }
        }

        // --- Bước 3: Xác định phạm vi (phòng cụ thể hay toàn cơ sở) và nạp batch thông tin phòng/loại phòng ---
        // Map: requestId -> roomId hiệu lực của yêu cầu (null nếu yêu cầu áp dụng cho toàn cơ sở)
        Map<Long, Long> effectiveRoomIdByRequestId = new HashMap<>(rows.size());
        // Tập roomId cần nạp chi tiết phòng (tên, loại phòng, sức chứa, trạng thái)
        Set<Long> roomIds = new HashSet<>();
        // Tập homestayId có ít nhất 1 yêu cầu phạm vi toàn cơ sở (roomId == null) để tính thống kê cơ sở
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

        // Map: roomId -> thực thể Room (chứa tên phòng, roomTypeId, maxGuests, status, statusReason)
        Map<Long, Room> roomById = roomIds.isEmpty()
                ? Map.of()
                : roomRepository.findAllById(roomIds).stream()
                        .collect(Collectors.toMap(Room::getId, r -> r, (a, b) -> a));

        // Tập roomTypeId cần nạp tên loại/hạng phòng
        Set<Long> roomTypeIds = roomById.values().stream()
                .map(Room::getRoomTypeId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        // Map: roomTypeId -> tên loại phòng (VD: Deluxe, Standard...)
        Map<Long, String> roomTypeNameById = roomTypeIds.isEmpty()
                ? Map.of()
                : roomTypeRepository.findAllById(roomTypeIds).stream()
                        .collect(Collectors.toMap(RoomType::getId, RoomType::getName, (a, b) -> a));

        // Map: homestayId -> tóm tắt phạm vi toàn cơ sở (số phòng đang nhận đặt, tổng phòng, dải giá cơ bản min–max)
        Map<Long, HomestayScopeSummary> homestayScopeSummaryById = buildHomestayScopeSummaries(
                homestayWideIds,
                activeBaseRulesByHomestayId
        );

        // --- Bước 4: Lắp ráp danh sách DTO phản hồi đầy đủ ngữ cảnh cho từng yêu cầu ---
        List<DirectorPriceRuleChangeRequestSummaryResponse> items = new ArrayList<>(rows.size());

        for (PriceRuleChangeRequest row : rows) {
            // Người gửi yêu cầu (Manager) và người đã duyệt/từ chối (Director, nếu đã xử lý)
            User requester = row.getRequestedBy() == null ? null : userById.get(row.getRequestedBy());
            User reviewer = row.getReviewedBy() == null ? null : userById.get(row.getReviewedBy());
            // Kết quả giải mã cột proposed_rule và DTO đã ép kiểu (có thể null nếu JSON cũ bị lệch cấu trúc)
            ParsedProposal parsed = parsedById.get(row.getId());
            ProposedRuleDto proposedDto = parsed != null ? parsed.dto() : null;
            // Quy tắc gốc trong price_rules ứng với targetRuleId (null nếu là yêu cầu CREATE)
            PriceRule targetRule = row.getTargetRuleId() == null ? null : targetRuleById.get(row.getTargetRuleId());
            // Phòng bị tác động (null nếu là quy tắc giá điều chỉnh toàn cơ sở)
            Long roomId = effectiveRoomIdByRequestId.get(row.getId());
            Room room = roomId == null ? null : roomById.get(roomId);
            // Quy tắc giá cơ bản (BASE) đang ACTIVE hiện tại của phòng đó (dùng đối chiếu hoặc quy đổi giá điều chỉnh)
            PriceRule activeBaseForRoom = roomId == null ? null : activeBaseRuleByRoomId.get(roomId);

            // Tóm tắt thông tin phòng (chỉ có khi quy tắc gắn với 1 phòng cụ thể)
            RoomSummary roomSummary = room == null ? null : new RoomSummary(
                    room.getId(),
                    room.getName(),
                    roomTypeNameById.get(room.getRoomTypeId()),
                    room.getMaxGuests() == null ? null : Byte.toUnsignedInt(room.getMaxGuests()),
                    room.getStatus(),
                    room.getStatusReason(),
                    activeBaseForRoom != null ? activeBaseForRoom.getBasePrice() : null
            );

            // Tóm tắt phạm vi cơ sở (chỉ có khi quy tắc áp dụng toàn cơ sở, roomId == null)
            HomestayScopeSummary scopeSummary = roomId == null
                    ? homestayScopeSummaryById.get(row.getHomestayId())
                    : null;

            // Quy tắc hiện hành dùng để đối chiếu: ưu tiên targetRule; với CREATE BASE đang chờ duyệt thì lấy BASE hiện tại của phòng
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

    /**
     * API-DIR-PRICE-02: Chi tiết yêu cầu phê duyệt thay đổi quy tắc giá.
     * Trả đầy đủ quy tắc hiện hành, proposedRule, thông tin người gửi/duyệt, hồ sơ phòng kèm mặt bằng giá
     * cùng hạng/cơ sở (hoặc danh sách phòng bị ảnh hưởng nếu áp dụng toàn cơ sở) và các quy tắc đang ACTIVE.
     */
    @Transactional(readOnly = true)
    public DirectorPriceRuleChangeRequestDetailResponse getChangeRequestDetail(Long requestId) {
        if (requestId == null || requestId <= 0) {
            throw BusinessException.notFound("PRICE_REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu thay đổi quy tắc giá");
        }

        // 1. Nạp bản ghi yêu cầu thay đổi giá theo ID (không tìm thấy -> 404 PRICE_REQUEST_NOT_FOUND)
        PriceRuleChangeRequest row = changeRequestRepository.findById(requestId)
                .orElseThrow(() -> BusinessException.notFound(
                        "PRICE_REQUEST_NOT_FOUND",
                        "Không tìm thấy yêu cầu thay đổi quy tắc giá"
                ));

        // 2. Giải mã proposed_rule và nạp thông tin cơ sở + người gửi/người duyệt
        ParsedProposal parsed = parseProposalSafely(row);
        ProposedRuleDto proposedDto = parsed.dto();
        Homestay homestay = homestayRepository.findById(row.getHomestayId()).orElse(null);

        Set<Long> userIds = new HashSet<>();
        if (row.getRequestedBy() != null) {
            userIds.add(row.getRequestedBy());
        }
        if (row.getReviewedBy() != null) {
            userIds.add(row.getReviewedBy());
        }
        // Map: userId -> thực thể User (dùng lấy thông tin người gửi và người duyệt trong 1 truy vấn)
        Map<Long, User> userById = userIds.isEmpty()
                ? Map.of()
                : userRepository.findAllById(userIds).stream()
                        .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
        User requester = row.getRequestedBy() == null ? null : userById.get(row.getRequestedBy());
        User reviewer = row.getReviewedBy() == null ? null : userById.get(row.getReviewedBy());

        // 3. Nạp toàn bộ quy tắc giá đang ACTIVE của cơ sở đó trong 1 truy vấn
        List<PriceRule> activeHomestayRules = priceRuleRepository.findByHomestayIdInAndStatus(
                List.of(row.getHomestayId()),
                PriceRule.Status.ACTIVE
        );
        // Map: priceRuleId -> quy tắc ACTIVE của cơ sở (để tra nhanh targetRule nếu vẫn còn ACTIVE)
        Map<Long, PriceRule> activeRuleById = activeHomestayRules.stream()
                .collect(Collectors.toMap(PriceRule::getId, r -> r, (a, b) -> a));
        // Map: roomId -> quy tắc giá cơ bản (BASE) đang ACTIVE của phòng đó
        Map<Long, PriceRule> activeBaseRuleByRoomId = new HashMap<>();
        for (PriceRule rule : activeHomestayRules) {
            if (rule.getRuleType() == RuleType.BASE && rule.getRoomId() != null) {
                activeBaseRuleByRoomId.put(rule.getRoomId(), rule);
            }
        }

        // Quy tắc gốc của UPDATE / DEACTIVATE (ưu tiên lấy từ tập ACTIVE đã nạp; fallback truy vấn DB nếu đã INACTIVE/EXPIRED)
        PriceRule targetRule = null;
        if (row.getTargetRuleId() != null) {
            targetRule = activeRuleById.get(row.getTargetRuleId());
            if (targetRule == null) {
                targetRule = priceRuleRepository.findById(row.getTargetRuleId()).orElse(null);
            }
        }

        // 4. Nạp toàn bộ phòng & loại phòng của cơ sở đó (phục vụ hồ sơ phòng, so sánh ngang cùng hạng và bảng toàn cơ sở)
        List<Room> homestayRooms = roomRepository.findByHomestayIdOrderByIdAsc(row.getHomestayId());
        // Map: roomId -> thực thể Room trong cơ sở
        Map<Long, Room> roomById = homestayRooms.stream()
                .collect(Collectors.toMap(Room::getId, r -> r, (a, b) -> a));
        // Map: roomTypeId -> tên hạng/loại phòng trong cơ sở
        Map<Long, String> roomTypeNameById = roomTypeRepository.findByHomestayIdOrderByNameAsc(row.getHomestayId())
                .stream()
                .collect(Collectors.toMap(RoomType::getId, RoomType::getName, (a, b) -> a));

        // Xác định phòng bị tác động (null nếu quy tắc áp dụng toàn cơ sở)
        Long roomId = resolveEffectiveRoomId(row, parsed, targetRule);
        Room targetRoom = roomId == null ? null : roomById.get(roomId);
        // Quy tắc giá cơ bản (BASE) đang ACTIVE hiện tại của phòng mục tiêu
        PriceRule activeBaseForRoom = roomId == null ? null : activeBaseRuleByRoomId.get(roomId);

        // 5. Dựng ngữ cảnh phạm vi: hồ sơ chi tiết phòng (roomDetail) HOẶC chi tiết toàn cơ sở (homestayScopeDetail)
        RoomDetailContext roomDetail = null;
        HomestayScopeSummary scopeSummaryForComparison = null;
        HomestayScopeDetail homestayScopeDetail = null;

        if (targetRoom != null) {
            // Ảnh đại diện đầu tiên của phòng theo sortOrder (nếu có trong bảng media)
            String coverImageUrl = mediaRepository
                    .findFirstByOwnerTypeAndOwnerIdOrderBySortOrderAsc(OwnerType.ROOM, targetRoom.getId())
                    .map(Media::getUrl)
                    .orElse(null);

            // Mặt bằng giá cơ bản của các phòng ACTIVE khác cùng hạng phòng và toàn cơ sở
            PeerPriceBenchmark sameTypeBenchmark = computePeerBenchmark(
                    homestayRooms, activeBaseRuleByRoomId, targetRoom.getId(), targetRoom.getRoomTypeId()
            );
            PeerPriceBenchmark homestayBenchmark = computePeerBenchmark(
                    homestayRooms, activeBaseRuleByRoomId, targetRoom.getId(), null
            );

            roomDetail = new RoomDetailContext(
                    targetRoom.getId(),
                    targetRoom.getName(),
                    targetRoom.getRoomTypeId(),
                    roomTypeNameById.get(targetRoom.getRoomTypeId()),
                    targetRoom.getMaxGuests() == null ? null : Byte.toUnsignedInt(targetRoom.getMaxGuests()),
                    targetRoom.getStatus(),
                    targetRoom.getStatusReason(),
                    targetRoom.getDescription(),
                    parseAmenitiesSafely(targetRoom),
                    coverImageUrl,
                    activeBaseForRoom != null ? activeBaseForRoom.getBasePrice() : null,
                    sameTypeBenchmark,
                    homestayBenchmark
            );
        } else if (roomId == null) {
            // Tính thống kê & danh sách từng phòng ACTIVE bị tác động khi áp dụng toàn cơ sở
            homestayScopeDetail = buildHomestayScopeDetail(
                    row, proposedDto, homestayRooms, roomTypeNameById, activeBaseRuleByRoomId
            );
            scopeSummaryForComparison = new HomestayScopeSummary(
                    homestayScopeDetail.activeRoomCount(),
                    homestayScopeDetail.totalRoomCount(),
                    homestayScopeDetail.minBasePrice(),
                    homestayScopeDetail.maxBasePrice()
            );
        }

        // 6. Quy tắc hiện hành làm mốc đối chiếu + so sánh Trước → Sau (chỉ tính cho PENDING_APPROVAL)
        PriceRule referenceCurrentRule = resolveReferenceCurrentRule(row, proposedDto, targetRule, activeBaseForRoom);
        CurrentRuleSummary currentRuleSummary = referenceCurrentRule == null
                ? null
                : toCurrentRuleSummary(referenceCurrentRule);

        PriceComparisonSummary priceComparison = row.getStatus() == Status.PENDING_APPROVAL
                ? buildPriceComparison(
                        row,
                        proposedDto,
                        targetRule,
                        referenceCurrentRule,
                        activeBaseForRoom,
                        scopeSummaryForComparison
                )
                : null;

        // 7. Danh sách các quy tắc đang ACTIVE ảnh hưởng lên phòng/phạm vi hiện tại
        List<ActiveRuleItem> activeRuleItems = buildActiveRuleItems(
                activeHomestayRules, roomId, roomById, referenceCurrentRule
        );

        return new DirectorPriceRuleChangeRequestDetailResponse(
                row.getId(),
                row.getHomestayId(),
                homestay != null ? homestay.getName() : null,
                homestay != null ? homestay.getProvince() : null,
                homestay != null ? homestay.getAddress() : null,
                row.getTargetRuleId(),
                row.getRequestType(),
                row.getStatus(),
                row.getRequestedBy(),
                requester != null ? requester.getFullName() : null,
                requester != null ? requester.getEmail() : null,
                requester != null ? requester.getPhone() : null,
                row.getRequestedAt(),
                row.getReviewedBy(),
                reviewer != null ? reviewer.getFullName() : null,
                reviewer != null ? reviewer.getEmail() : null,
                row.getReviewedAt(),
                row.getRejectionReason(),
                roomId,
                targetRoom != null ? targetRoom.getName() : null,
                parsed.payload(),
                currentRuleSummary,
                priceComparison,
                roomDetail,
                homestayScopeDetail,
                activeRuleItems
        );
    }

    /**
     * Tính mặt bằng giá cơ bản (min, max, trung bình) của các phòng ACTIVE khác trong cùng cơ sở.
     * Nếu filterRoomTypeId != null: chỉ so với các phòng cùng hạng phòng; nếu null: so với toàn cơ sở.
     */
    private PeerPriceBenchmark computePeerBenchmark(
            List<Room> homestayRooms,
            Map<Long, PriceRule> activeBaseRuleByRoomId,
            Long excludeRoomId,
            Long filterRoomTypeId
    ) {
        List<Long> peerBasePrices = new ArrayList<>();
        for (Room candidate : homestayRooms) {
            if (candidate.getStatus() != RoomStatus.ACTIVE) {
                continue;
            }
            if (Objects.equals(candidate.getId(), excludeRoomId)) {
                continue;
            }
            if (filterRoomTypeId != null && !Objects.equals(candidate.getRoomTypeId(), filterRoomTypeId)) {
                continue;
            }
            PriceRule baseRule = activeBaseRuleByRoomId.get(candidate.getId());
            if (baseRule != null && baseRule.getBasePrice() != null) {
                peerBasePrices.add(baseRule.getBasePrice());
            }
        }
        if (peerBasePrices.isEmpty()) {
            return null;
        }
        long min = peerBasePrices.stream().min(Long::compareTo).orElse(0L);
        long max = peerBasePrices.stream().max(Long::compareTo).orElse(0L);
        long sum = peerBasePrices.stream().mapToLong(Long::longValue).sum();
        long avg = BigDecimal.valueOf(sum)
                .divide(BigDecimal.valueOf(peerBasePrices.size()), 0, RoundingMode.HALF_UP)
                .longValueExact();
        return new PeerPriceBenchmark(peerBasePrices.size(), min, max, avg);
    }

    /**
     * Dựng chi tiết phạm vi toàn cơ sở gồm số phòng đang nhận đặt, khoảng giá cơ bản min–max
     * và mức giá dự kiến cho từng phòng ACTIVE sau khi áp dụng quy tắc đề xuất.
     */
    private HomestayScopeDetail buildHomestayScopeDetail(
            PriceRuleChangeRequest row,
            ProposedRuleDto proposedDto,
            List<Room> homestayRooms,
            Map<Long, String> roomTypeNameById,
            Map<Long, PriceRule> activeBaseRuleByRoomId
    ) {
        long totalRooms = homestayRooms.size();
        long activeRooms = 0L;
        List<Long> activeBasePrices = new ArrayList<>();
        List<AffectedRoomPreview> affectedRooms = new ArrayList<>();

        for (Room room : homestayRooms) {
            if (room.getStatus() != RoomStatus.ACTIVE) {
                continue;
            }
            activeRooms++;
            PriceRule baseRule = activeBaseRuleByRoomId.get(room.getId());
            Long currentBasePrice = baseRule != null ? baseRule.getBasePrice() : null;
            if (currentBasePrice != null) {
                activeBasePrices.add(currentBasePrice);
            }

            // Chỉ tính giá dự kiến sau áp dụng cho yêu cầu đang PENDING_APPROVAL
            Long projectedPrice = null;
            if (row.getStatus() == Status.PENDING_APPROVAL) {
                if (row.getRequestType() == RequestType.DEACTIVATE) {
                    projectedPrice = currentBasePrice;
                } else if (proposedDto != null) {
                    projectedPrice = calculateAdjustedPrice(
                            currentBasePrice, proposedDto.getAdjustType(), proposedDto.getAdjustValue()
                    );
                }
            }

            affectedRooms.add(new AffectedRoomPreview(
                    room.getId(),
                    room.getName(),
                    roomTypeNameById.get(room.getRoomTypeId()),
                    room.getMaxGuests() == null ? null : Byte.toUnsignedInt(room.getMaxGuests()),
                    currentBasePrice,
                    projectedPrice
            ));
        }

        Long minBase = activeBasePrices.isEmpty()
                ? null
                : activeBasePrices.stream().min(Long::compareTo).orElse(null);
        Long maxBase = activeBasePrices.isEmpty()
                ? null
                : activeBasePrices.stream().max(Long::compareTo).orElse(null);

        return new HomestayScopeDetail(activeRooms, totalRooms, minBase, maxBase, affectedRooms);
    }

    /**
     * Lọc và sắp xếp các quy tắc đang ACTIVE tác động lên phạm vi hiện tại:
     * - Phạm vi phòng: lấy giá BASE của phòng + các giá điều chỉnh riêng phòng đó + các giá điều chỉnh toàn cơ sở.
     * - Phạm vi toàn cơ sở: lấy tất cả các giá điều chỉnh toàn cơ sở đang ACTIVE.
     */
    private List<ActiveRuleItem> buildActiveRuleItems(
            List<PriceRule> activeHomestayRules,
            Long targetRoomId,
            Map<Long, Room> roomById,
            PriceRule referenceCurrentRule
    ) {
        Long referenceRuleId = referenceCurrentRule != null ? referenceCurrentRule.getId() : null;
        return activeHomestayRules.stream()
                .filter(rule -> {
                    if (targetRoomId != null) {
                        return rule.getRoomId() == null || targetRoomId.equals(rule.getRoomId());
                    }
                    return rule.getRuleType() == RuleType.ADJUSTMENT && rule.getRoomId() == null;
                })
                .sorted(Comparator
                        .comparingInt((PriceRule r) -> r.getRuleType() == RuleType.BASE ? 0 : 1)
                        .thenComparing(r -> r.getPriority() != null ? r.getPriority() : (short) 0, Comparator.reverseOrder())
                        .thenComparingInt(r -> r.getRoomId() != null ? 0 : 1)
                        .thenComparing(PriceRule::getId))
                .map(rule -> {
                    Room room = rule.getRoomId() == null ? null : roomById.get(rule.getRoomId());
                    return new ActiveRuleItem(
                            rule.getId(),
                            rule.getRoomId(),
                            room != null ? room.getName() : null,
                            rule.getRuleType(),
                            rule.getName(),
                            rule.getBasePrice(),
                            rule.getAdjustType(),
                            rule.getAdjustValue(),
                            parseWeekdaysCsv(rule.getWeekdays()),
                            rule.getStartDate(),
                            rule.getEndDate(),
                            rule.getPriority(),
                            Objects.equals(rule.getId(), referenceRuleId)
                    );
                })
                .toList();
    }

    /** Đọc danh sách tiện nghi phòng từ cột JSON amenities một cách an toàn. */
    private List<String> parseAmenitiesSafely(Room room) {
        if (room == null || room.getAmenities() == null || room.getAmenities().isBlank()) {
            return List.of();
        }
        try {
            List<String> list = objectMapper.readValue(room.getAmenities(), new TypeReference<>() {});
            return list == null ? List.of() : list;
        } catch (Exception exception) {
            log.warn("Không thể đọc JSON amenities của phòng id={}: {}", room.getId(), exception.getMessage());
            return List.of();
        }
    }

    /**
     * Xác định roomId hiệu lực của yêu cầu:
     * - Với DEACTIVATE: lấy theo quy tắc gốc (vì proposed_rule có thể chỉ chứa {"action":"DEACTIVATE"}).
     * - Với BASE: ưu tiên proposed_rule.roomId, fallback sang targetRule.roomId nếu thiếu.
     * - Với ADJUSTMENT (CREATE/UPDATE): lấy đúng proposed_rule.roomId (null = áp dụng toàn cơ sở).
     */
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

    /**
     * Tính thống kê phạm vi toàn cơ sở cho các homestay có yêu cầu áp dụng toàn cơ sở (roomId == null):
     * gồm số phòng ACTIVE, tổng số phòng và khoảng giá cơ bản (min–max) của các phòng đang ACTIVE.
     */
    private Map<Long, HomestayScopeSummary> buildHomestayScopeSummaries(
            Set<Long> homestayWideIds,
            Map<Long, List<PriceRule>> activeBaseRulesByHomestayId
    ) {
        if (homestayWideIds.isEmpty()) {
            return Map.of();
        }
        // Map: homestayId -> thống kê đếm phòng (tổng số phòng và số phòng đang ACTIVE)
        Map<Long, HomestayRoomCountProjection> statsByHomestayId = roomRepository
                .countRoomStatsByHomestayIds(homestayWideIds)
                .stream()
                .collect(Collectors.toMap(HomestayRoomCountProjection::getHomestayId, s -> s, (a, b) -> a));

        // Map: homestayId -> tập roomId của các phòng đang ở trạng thái ACTIVE (để lọc đúng giá cơ bản phòng đang nhận đặt)
        Map<Long, Set<Long>> activeRoomIdsByHomestayId = new HashMap<>();
        for (Room activeRoom : roomRepository.findByHomestayIdInAndStatus(homestayWideIds, RoomStatus.ACTIVE)) {
            activeRoomIdsByHomestayId
                    .computeIfAbsent(activeRoom.getHomestayId(), k -> new HashSet<>())
                    .add(activeRoom.getId());
        }

        // Map kết quả: homestayId -> HomestayScopeSummary
        Map<Long, HomestayScopeSummary> result = new HashMap<>(homestayWideIds.size());
        for (Long hsId : homestayWideIds) {
            HomestayRoomCountProjection stats = statsByHomestayId.get(hsId);
            long activeRooms = stats != null && stats.getActiveRooms() != null ? stats.getActiveRooms() : 0L;
            long totalRooms = stats != null && stats.getTotalRooms() != null ? stats.getTotalRooms() : 0L;

            // Tập ID phòng đang ACTIVE thuộc cơ sở hsId
            Set<Long> activeRoomIds = activeRoomIdsByHomestayId.getOrDefault(hsId, Set.of());
            // Danh sách mức giá cơ bản hiện hành của các phòng đang ACTIVE trong cơ sở hsId
            List<Long> activeRoomBasePrices = activeBaseRulesByHomestayId.getOrDefault(hsId, List.of()).stream()
                    .filter(rule -> rule.getBasePrice() != null && activeRoomIds.contains(rule.getRoomId()))
                    .map(PriceRule::getBasePrice)
                    .toList();

            // Giá cơ bản thấp nhất và cao nhất trong các phòng đang nhận đặt của cơ sở
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

    /**
     * Chọn quy tắc hiện hành làm mốc đối chiếu:
     * - UPDATE / DEACTIVATE: dùng đúng targetRule.
     * - CREATE BASE (đang PENDING_APPROVAL): dùng quy tắc BASE đang ACTIVE của phòng (nếu có) vì khi duyệt sẽ thay thế nó.
     * - CREATE ADJUSTMENT: trả null (không thay thế quy tắc nào).
     */
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

    /**
     * Tính thông tin đối chiếu giá Trước → Sau và % chênh lệch cho các yêu cầu đang PENDING_APPROVAL,
     * bao phủ cả 3 loại thao tác (CREATE, UPDATE, DEACTIVATE) và 2 loại quy tắc (BASE, ADJUSTMENT).
     */
    private PriceComparisonSummary buildPriceComparison(
            PriceRuleChangeRequest row,
            ProposedRuleDto proposed,
            PriceRule targetRule,
            PriceRule referenceCurrentRule,
            PriceRule activeBaseForRoom,
            HomestayScopeSummary scopeSummary
    ) {
        // Giá cơ bản hiện hành của phòng bị tác động (null nếu toàn cơ sở hoặc phòng chưa có giá BASE)
        Long roomBasePrice = activeBaseForRoom != null ? activeBaseForRoom.getBasePrice() : null;
        // Loại quy tắc hiệu lực (BASE hoặc ADJUSTMENT)
        RuleType effectiveType = proposed != null && proposed.getRuleType() != null
                ? proposed.getRuleType()
                : (referenceCurrentRule != null ? referenceCurrentRule.getRuleType() : null);

        // --- Nhánh 1: Ngừng áp dụng (DEACTIVATE) quy tắc giá điều chỉnh ---
        if (row.getRequestType() == RequestType.DEACTIVATE) {
            if (referenceCurrentRule == null || referenceCurrentRule.getRuleType() != RuleType.ADJUSTMENT) {
                return null;
            }
            if (referenceCurrentRule.getRoomId() != null && roomBasePrice != null) {
                // Giá đêm hiện tại khi quy tắc điều chỉnh còn bật -> sau khi ngừng sẽ quay về giá cơ bản roomBasePrice
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

        // --- Nhánh 2: Giá cơ bản (BASE — CREATE hoặc UPDATE) ---
        if (effectiveType == RuleType.BASE) {
            // Giá cơ bản hiện hành (VNĐ) và giá cơ bản đề xuất mới (VNĐ)
            Long currentAmount = referenceCurrentRule != null ? referenceCurrentRule.getBasePrice() : null;
            Long proposedAmount = proposed.getBasePrice();
            // Chênh lệch tuyệt đối (VNĐ) và tỷ lệ phần trăm (%) so với giá hiện hành
            Long deltaAmount = (currentAmount != null && proposedAmount != null)
                    ? proposedAmount - currentAmount
                    : null;
            Double deltaPercent = (currentAmount != null && proposedAmount != null)
                    ? computeDeltaPercent(currentAmount, proposedAmount)
                    : null;
            // true nếu là CREATE BASE nhưng phòng đã có giá BASE ACTIVE (duyệt sẽ tự thay thế)
            boolean replacesActiveBase = row.getRequestType() == RequestType.CREATE && referenceCurrentRule != null;
            // Danh sách các trường thực sự thay đổi giữa quy tắc gốc và đề xuất (với UPDATE)
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

        // --- Nhánh 3: Giá điều chỉnh (ADJUSTMENT — CREATE hoặc UPDATE) ---
        // true nếu áp dụng cho 1 phòng cụ thể; false nếu áp dụng toàn cơ sở (roomId == null)
        boolean isRoomScoped = proposed.getRoomId() != null;
        List<String> changedFields = row.getRequestType() == RequestType.UPDATE && targetRule != null
                ? computeChangedFields(targetRule, proposed)
                : List.of();

        // 3a. Thêm mới giá điều chỉnh (CREATE ADJUSTMENT)
        if (row.getRequestType() == RequestType.CREATE) {
            if (isRoomScoped) {
                if (roomBasePrice != null) {
                    // Quy đổi ra giá đêm thực tế sau khi áp dụng quy tắc mới lên giá cơ bản của phòng
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

            // Toàn cơ sở: ước tính khoảng giá bán sau duyệt (min–max) từ dải giá cơ bản của cơ sở
            Long projectedMin = projectScopePrice(scopeSummary != null ? scopeSummary.minBasePrice() : null, proposed);
            Long projectedMax = projectScopePrice(scopeSummary != null ? scopeSummary.maxBasePrice() : null, proposed);
            Long proposedFixed = proposed.getAdjustType() == AdjustType.FIXED_PRICE ? proposed.getAdjustValue() : null;
            Double deltaPct = proposed.getAdjustType() == AdjustType.PERCENT && proposed.getAdjustValue() != null
                    ? proposed.getAdjustValue().doubleValue()
                    : null;
            return new PriceComparisonSummary(null, proposedFixed, null, deltaPct, projectedMin, projectedMax, false, List.of());
        }

        // 3b. Cập nhật giá điều chỉnh cho 1 phòng cụ thể (UPDATE ADJUSTMENT theo phòng)
        if (isRoomScoped) {
            // Giá đêm quy đổi theo quy tắc cũ (currentNightly) vs theo quy tắc đề xuất mới (proposedNightly)
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

        // 3c. Cập nhật giá điều chỉnh toàn cơ sở (UPDATE ADJUSTMENT toàn cơ sở)
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

    /** So sánh từng thuộc tính giữa quy tắc gốc (target) và đề xuất mới (proposed) để trả về các trường bị thay đổi. */
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

    /** Tính giá đêm sau khi áp dụng giá điều chỉnh (khớp công thức làm tròn HALF_UP của AvailabilitySearchService). */
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

    /** Ước tính giá bán toàn cơ sở sau duyệt từ 1 đầu mút giá cơ bản (minBasePrice hoặc maxBasePrice). */
    private Long projectScopePrice(Long scopeBasePrice, ProposedRuleDto proposed) {
        if (proposed == null || proposed.getAdjustType() == null || proposed.getAdjustValue() == null) {
            return null;
        }
        if (proposed.getAdjustType() == AdjustType.FIXED_PRICE) {
            return proposed.getAdjustValue();
        }
        return calculateAdjustedPrice(scopeBasePrice, proposed.getAdjustType(), proposed.getAdjustValue());
    }

    /**
     * Tính % biến động giá bán thực tế khi cập nhật từ quy tắc PERCENT cũ sang PERCENT mới
     * (VD: +10% → +25% tương ứng hệ số 110 → 125, tức giá bán thực tế tăng +13.6%).
     */
    private Double computePercentToPercentEffectiveDelta(PriceRule targetRule, ProposedRuleDto proposed) {
        if (targetRule == null
                || proposed == null
                || targetRule.getAdjustType() != AdjustType.PERCENT
                || proposed.getAdjustType() != AdjustType.PERCENT
                || targetRule.getAdjustValue() == null
                || proposed.getAdjustValue() == null) {
            return null;
        }
        // Hệ số phần trăm thực tế so với giá gốc (100% + mức điều chỉnh)
        long oldMultiplier = 100L + targetRule.getAdjustValue();
        long newMultiplier = 100L + proposed.getAdjustValue();
        return computeDeltaPercent(oldMultiplier, newMultiplier);
    }

    /** Tính phần trăm chênh lệch ((after - before) / before * 100), làm tròn 1 chữ số thập phân. */
    private Double computeDeltaPercent(long before, long after) {
        if (before <= 0) {
            return null;
        }
        return BigDecimal.valueOf(after - before)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(before), 1, RoundingMode.HALF_UP)
                .doubleValue();
    }

    /** Tách chuỗi thứ trong tuần dạng CSV từ DB (VD: "FRI,SAT") thành danh sách viết hoa. */
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

    /** Chuẩn hóa danh sách thứ thành Set viết hoa để so sánh không phụ thuộc thứ tự phần tử. */
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

    /**
     * Kết quả trung gian sau khi đọc JSON cột proposed_rule:
     * - roomId: ID phòng trích được từ JSON (null nếu toàn cơ sở hoặc không có)
     * - dto: đối tượng ProposedRuleDto đã ép kiểu chuẩn (null nếu phải dùng fallback)
     * - payload: dữ liệu trả thẳng ra field proposedRule trong response JSON
     */
    private record ParsedProposal(Long roomId, ProposedRuleDto dto, Object payload) {}
}
