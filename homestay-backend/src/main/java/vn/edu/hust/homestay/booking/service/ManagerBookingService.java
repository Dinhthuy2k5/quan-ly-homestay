package vn.edu.hust.homestay.booking.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.auth.entity.User;
import vn.edu.hust.homestay.auth.repository.UserRepository;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.booking.dto.ManagerBookingDetailResponse;
import vn.edu.hust.homestay.booking.dto.ManagerBookingSummaryResponse;
import vn.edu.hust.homestay.booking.dto.ManagerBookingSummaryResponse.BookingRoomSummary;
import vn.edu.hust.homestay.booking.dto.ManagerCreateBookingRequest;
import vn.edu.hust.homestay.booking.dto.ManagerCreateBookingResponse;
import vn.edu.hust.homestay.booking.entity.Booking;
import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;
import vn.edu.hust.homestay.booking.entity.BookingRoom;
import vn.edu.hust.homestay.booking.entity.BookingRoomNight;
import vn.edu.hust.homestay.booking.repository.BookingRepository;
import vn.edu.hust.homestay.booking.repository.BookingRoomNightRepository;
import vn.edu.hust.homestay.booking.repository.BookingRoomRepository;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.homestay.entity.Homestay;
import vn.edu.hust.homestay.homestay.repository.HomestayRepository;
import vn.edu.hust.homestay.media.entity.Media;
import vn.edu.hust.homestay.media.repository.MediaRepository;
import vn.edu.hust.homestay.policy.entity.PolicySetting;
import vn.edu.hust.homestay.policy.repository.PolicySettingRepository;
import vn.edu.hust.homestay.pricing.entity.PriceRule;
import vn.edu.hust.homestay.pricing.repository.PriceRuleRepository;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;
import vn.edu.hust.homestay.room.entity.RoomType;
import vn.edu.hust.homestay.room.repository.RoomRepository;
import vn.edu.hust.homestay.room.repository.RoomTypeRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service xử lý các nghiệp vụ quản lý Booking của Manager:
 * - API-MGR-BOOK-01: Danh sách booking cơ sở
 * - API-MGR-BOOK-02: Đặt phòng hộ khách
 */
@Service
public class ManagerBookingService {

    private static final ZoneId BUSINESS_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final List<String> BANK_POLICY_KEYS = List.of(
            "bank_name", "bank_account_number", "bank_account_holder"
    );

    private final BookingRepository bookingRepository;
    private final BookingRoomRepository bookingRoomRepository;
    private final BookingRoomNightRepository bookingRoomNightRepository;
    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final HomestayRepository homestayRepository;
    private final MediaRepository mediaRepository;
    private final PriceRuleRepository priceRuleRepository;
    private final PolicySettingRepository policySettingRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ManagerBookingService(
            BookingRepository bookingRepository,
            BookingRoomRepository bookingRoomRepository,
            BookingRoomNightRepository bookingRoomNightRepository,
            RoomRepository roomRepository,
            RoomTypeRepository roomTypeRepository,
            HomestayRepository homestayRepository,
            MediaRepository mediaRepository,
            PriceRuleRepository priceRuleRepository,
            PolicySettingRepository policySettingRepository,
            UserRepository userRepository
    ) {
        this.bookingRepository = bookingRepository;
        this.bookingRoomRepository = bookingRoomRepository;
        this.bookingRoomNightRepository = bookingRoomNightRepository;
        this.roomRepository = roomRepository;
        this.roomTypeRepository = roomTypeRepository;
        this.homestayRepository = homestayRepository;
        this.mediaRepository = mediaRepository;
        this.priceRuleRepository = priceRuleRepository;
        this.policySettingRepository = policySettingRepository;
        this.userRepository = userRepository;
    }

    /**
     * API-MGR-BOOK-01: Lấy danh sách booking của homestay được giao cho Manager.
     */
    @Transactional(readOnly = true)
    public Page<ManagerBookingSummaryResponse> getHomestayBookings(
            UserPrincipal principal,
            BookingStatus status,
            LocalDate fromDate,
            LocalDate toDate,
            String keyword,
            Pageable pageable
    ) {
        Long homestayId = validateAndGetHomestayId(principal);

        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw BusinessException.badRequest("INVALID_DATE_RANGE", "fromDate không được sau toDate");
        }

        String normalizedKeyword = (keyword == null || keyword.isBlank()) ? null : keyword.trim();

        Page<Booking> page = bookingRepository.findHomestayBookings(
                homestayId,
                status,
                fromDate,
                toDate,
                normalizedKeyword,
                pageable
        );

        List<Booking> bookings = page.getContent();
        if (bookings.isEmpty()) {
            return new PageImpl<>(Collections.emptyList(), pageable, page.getTotalElements());
        }

        // Tải thông tin phòng cho các booking để tránh N+1
        List<Long> bookingIds = bookings.stream().map(Booking::getId).toList();
        List<BookingRoom> bookingRooms = bookingRoomRepository.findByBookingIdIn(bookingIds);

        Set<Long> roomIds = bookingRooms.stream().map(BookingRoom::getRoomId).collect(Collectors.toSet());
        Map<Long, Room> roomMap = roomIds.isEmpty() ? Map.of() :
                roomRepository.findAllById(roomIds).stream().collect(Collectors.toMap(Room::getId, r -> r));

        Map<Long, List<BookingRoomSummary>> roomsByBookingId = bookingRooms.stream()
                .collect(Collectors.groupingBy(
                        BookingRoom::getBookingId,
                        Collectors.mapping(br -> {
                            Room room = roomMap.get(br.getRoomId());
                            return new BookingRoomSummary(
                                    br.getRoomId(),
                                    room != null ? room.getName() : "Phòng #" + br.getRoomId()
                            );
                        }, Collectors.toList())
                ));

        List<ManagerBookingSummaryResponse> responses = bookings.stream().map(b -> {
            OffsetDateTime holdExpiresAt = b.getHoldExpiresAt() == null ? null :
                    b.getHoldExpiresAt().atOffset(ZoneOffset.UTC)
                            .atZoneSameInstant(BUSINESS_TIME_ZONE).toOffsetDateTime();

            return new ManagerBookingSummaryResponse(
                    b.getId(),
                    b.getCode(),
                    b.getContactName(),
                    b.getContactPhone(),
                    b.getContactEmail(),
                    b.getStatus(),
                    b.getCheckInDate(),
                    b.getCheckOutDate(),
                    b.getGuestCount(),
                    b.getRoomTotalPrice(),
                    b.getDepositAmount(),
                    holdExpiresAt,
                    b.getCreatedAt(),
                    roomsByBookingId.getOrDefault(b.getId(), List.of())
            );
        }).toList();

        return new PageImpl<>(responses, pageable, page.getTotalElements());
    }

    /**
     * API-MGR-BOOK-02: Đặt phòng hộ khách (khách gọi điện hoặc đến trực tiếp tại cơ sở).
     */
    @Transactional
    public ManagerCreateBookingResponse createBooking(UserPrincipal principal, ManagerCreateBookingRequest request) {
        Long homestayId = validateAndGetHomestayId(principal);

        // 1. Kiểm tra ngày nhận và ngày trả phòng
        if (request.checkInDate() == null || request.checkOutDate() == null || !request.checkOutDate().isAfter(request.checkInDate())) {
            throw BusinessException.badRequest("INVALID_DATE_RANGE", "Ngày trả phòng phải sau ngày nhận phòng");
        }
        LocalDate today = LocalDate.now(BUSINESS_TIME_ZONE);
        if (request.checkInDate().isBefore(today)) {
            throw BusinessException.badRequest("INVALID_DATE_RANGE", "Ngày trả phòng phải sau ngày nhận phòng và ngày nhận không được ở quá khứ");
        }

        // 2. Kiểm tra danh sách phòng
        if (request.roomIds() == null || request.roomIds().isEmpty()) {
            throw BusinessException.badRequest("BOOKING_POLICY_VIOLATION", "Danh sách phòng không được để trống");
        }
        if (request.roomIds().size() != new HashSet<>(request.roomIds()).size()) {
            throw BusinessException.badRequest("DUPLICATE_ROOM_ID", "Danh sách phòng không được chứa phòng trùng lặp");
        }

        // 3. Khóa các phòng theo thứ tự id để chống deadlock
        List<Long> sortedRoomIds = request.roomIds().stream().sorted().toList();
        List<Room> rooms = roomRepository.findAllByIdInForUpdate(sortedRoomIds);
        if (rooms.size() != sortedRoomIds.size()) {
            throw BusinessException.badRequest("ROOM_NOT_AVAILABLE", "Một hoặc nhiều phòng không tồn tại hoặc không hợp lệ");
        }

        // 4. Kiểm tra phòng thuộc homestay, trạng thái ACTIVE và sức chứa
        int totalCapacity = 0;
        for (Room room : rooms) {
            if (!homestayId.equals(room.getHomestayId())) {
                throw BusinessException.badRequest("ROOM_NOT_AVAILABLE", "Một hoặc nhiều phòng không thuộc cơ sở homestay được giao");
            }
            if (room.getStatus() != RoomStatus.ACTIVE) {
                throw BusinessException.conflict("ROOM_LOCKED", "Một hoặc nhiều phòng hiện không nhận đặt");
            }
            totalCapacity += Byte.toUnsignedInt(room.getMaxGuests());
        }
        if (request.guestCount() > totalCapacity) {
            throw BusinessException.badRequest("ROOM_CAPACITY_EXCEEDED", "Số khách vượt quá tổng sức chứa của các phòng đã chọn");
        }

        // 5. Kiểm tra chính sách đặt phòng
        BookingPolicy policy = loadPolicy(request.checkInDate(), request.checkOutDate());

        // 6. Tính giá từng đêm chốt theo price_rules đang áp dụng
        List<BookingRoomNight> roomNights = buildRoomNights(homestayId, rooms, request.checkInDate(), request.checkOutDate());
        long totalPrice = roomNights.stream().mapToLong(BookingRoomNight::getNightlyPrice).reduce(0L, Math::addExact);
        if (totalPrice <= 0) {
            throw BusinessException.badRequest("BOOKING_POLICY_VIOLATION", "Tổng tiền phòng phải lớn hơn 0 để tạo booking");
        }
        long depositAmount = BigDecimal.valueOf(totalPrice)
                .multiply(BigDecimal.valueOf(policy.depositPercent()))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.CEILING)
                .longValueExact();

        // 7. Kiểm tra xung đột giữ đêm
        List<Object[]> conflicts = bookingRoomNightRepository.findExistingNights(
                sortedRoomIds, request.checkInDate(), request.checkOutDate());
        if (!conflicts.isEmpty()) {
            throw BusinessException.conflict("ROOM_NOT_AVAILABLE", "Phòng không còn khả dụng trong khoảng thời gian đã chọn");
        }

        // 8. Tra cứu customerId nếu số điện thoại trùng với tài khoản đã đăng ký trong hệ thống
        Long customerId = userRepository.findByPhone(request.contactPhone().trim())
                .map(User::getId)
                .orElse(null);

        // 9. Lưu bản ghi Booking
        Instant now = Instant.now();
        LocalDateTime holdExpiresAtUtc = LocalDateTime.ofInstant(now, ZoneOffset.UTC).plusHours(policy.holdHours());
        Booking booking = new Booking();
        booking.setCode(generateBookingCode(request.checkInDate()));
        booking.setHomestayId(homestayId);
        booking.setCustomerId(customerId);
        booking.setContactName(request.contactName().trim());
        booking.setContactPhone(request.contactPhone().trim());
        booking.setContactEmail(normalize(request.contactEmail()));
        booking.setCheckInDate(request.checkInDate());
        booking.setCheckOutDate(request.checkOutDate());
        booking.setGuestCount(request.guestCount().shortValue());
        booking.setStatus(BookingStatus.PENDING_DEPOSIT);
        booking.setRoomTotalPrice(totalPrice);
        booking.setDepositAmount(depositAmount);
        booking.setHoldExpiresAt(holdExpiresAtUtc);
        booking.setPolicySnapshot(serializePolicySnapshot(policy));
        booking.setNote(normalize(request.note()));
        booking.setCreatedBy(principal.getId());

        Booking savedBooking = bookingRepository.saveAndFlush(booking);

        // 10. Lưu booking_rooms & booking_room_nights
        bookingRoomRepository.saveAllAndFlush(rooms.stream()
                .map(room -> new BookingRoom(savedBooking.getId(), homestayId, room.getId()))
                .toList());

        roomNights.forEach(night -> night.setBookingId(savedBooking.getId()));
        try {
            bookingRoomNightRepository.saveAllAndFlush(roomNights);
        } catch (DataIntegrityViolationException exception) {
            throw BusinessException.conflict("ROOM_NOT_AVAILABLE", "Phòng vừa được đặt bởi khách khác. Hãy chọn ngày hoặc phòng khác");
        }

        OffsetDateTime holdExpiresAtOffset = holdExpiresAtUtc.atOffset(ZoneOffset.UTC)
                .atZoneSameInstant(BUSINESS_TIME_ZONE).toOffsetDateTime();

        return new ManagerCreateBookingResponse(
                savedBooking.getId(),
                savedBooking.getCode(),
                "MANAGER",
                savedBooking.getStatus(),
                savedBooking.getCheckInDate(),
                savedBooking.getCheckOutDate(),
                savedBooking.getRoomTotalPrice(),
                savedBooking.getDepositAmount(),
                holdExpiresAtOffset
        );
    }

    /**
     * API-MGR-BOOK-03: Chi tiết booking dành cho Manager.
     */
    @Transactional(readOnly = true)
    public ManagerBookingDetailResponse getBookingDetail(UserPrincipal principal, Long bookingId) {
        Long homestayId = validateAndGetHomestayId(principal);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> BusinessException.notFound("BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt phòng"));

        if (!booking.getHomestayId().equals(homestayId)) {
            throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Đơn đặt phòng không thuộc cơ sở homestay được giao quản lý");
        }

        Homestay homestay = homestayRepository.findById(booking.getHomestayId()).orElse(null);

        User customer = booking.getCustomerId() != null
                ? userRepository.findById(booking.getCustomerId()).orElse(null)
                : null;

        User creator = booking.getCreatedBy() != null
                ? userRepository.findById(booking.getCreatedBy()).orElse(null)
                : null;

        User approver = booking.getApprovedBy() != null
                ? userRepository.findById(booking.getApprovedBy()).orElse(null)
                : null;

        User canceller = booking.getCancelledBy() != null
                ? userRepository.findById(booking.getCancelledBy()).orElse(null)
                : null;

        String source = (customer != null && booking.getCreatedBy().equals(customer.getId()))
                ? "CUSTOMER"
                : "MANAGER";

        List<BookingRoom> bRooms = bookingRoomRepository.findByBookingId(booking.getId());
        Set<Long> roomIds = bRooms.stream().map(BookingRoom::getRoomId).collect(Collectors.toSet());
        Map<Long, Room> roomMap = roomIds.isEmpty() ? Map.of() :
                roomRepository.findAllById(roomIds).stream().collect(Collectors.toMap(Room::getId, r -> r));

        Set<Long> roomTypeIds = roomMap.values().stream().map(Room::getRoomTypeId).collect(Collectors.toSet());
        Map<Long, String> roomTypeNameMap = roomTypeIds.isEmpty() ? Map.of() :
                roomTypeRepository.findAllById(roomTypeIds).stream().collect(Collectors.toMap(RoomType::getId, RoomType::getName));

        Map<Long, Media> roomCovers = roomIds.isEmpty() ? Map.of() :
                mediaRepository.findByOwnerTypeAndOwnerIdInOrderBySortOrderAsc(Media.OwnerType.ROOM, roomIds).stream()
                        .collect(Collectors.toMap(Media::getOwnerId, m -> m, (first, second) -> first));

        List<BookingRoomNight> allNights = bookingRoomNightRepository
                .findByBookingIdOrderByIdRoomIdAscIdStayDateAsc(booking.getId());
        Map<Long, List<BookingRoomNight>> nightsByRoomId = allNights.stream()
                .collect(Collectors.groupingBy(n -> n.getId().getRoomId()));

        List<ManagerBookingDetailResponse.BookingRoomDetail> roomDetails = bRooms.stream().map(br -> {
            Room room = roomMap.get(br.getRoomId());
            String typeName = room != null ? roomTypeNameMap.get(room.getRoomTypeId()) : null;
            Media cover = room != null ? roomCovers.get(room.getId()) : null;
            List<ManagerBookingDetailResponse.RoomNightDetail> nights =
                    nightsByRoomId.getOrDefault(br.getRoomId(), List.of()).stream()
                            .map(n -> new ManagerBookingDetailResponse.RoomNightDetail(
                                    n.getId().getStayDate(), n.getNightlyPrice(), n.getAppliedRuleNameSnapshot()))
                            .toList();
            return new ManagerBookingDetailResponse.BookingRoomDetail(
                    br.getRoomId(),
                    room != null ? room.getName() : "Phòng #" + br.getRoomId(),
                    typeName,
                    room != null ? room.getMaxGuests() : null,
                    cover != null ? cover.getUrl() : null,
                    nights
            );
        }).toList();

        ManagerBookingDetailResponse.PaymentInstruction instruction = null;
        if (booking.getStatus() == BookingStatus.PENDING_DEPOSIT) {
            Map<String, String> bankData = policySettingRepository
                    .findByPolicyGroupAndPolicyKeyIn("PAYMENT", BANK_POLICY_KEYS).stream()
                    .collect(Collectors.toMap(PolicySetting::getPolicyKey, PolicySetting::getPolicyValue));
            if (!bankData.isEmpty()) {
                instruction = new ManagerBookingDetailResponse.PaymentInstruction(
                        bankData.get("bank_name"),
                        bankData.get("bank_account_number"),
                        bankData.get("bank_account_holder"),
                        booking.getCode() + " DAT COC"
                );
            }
        }

        long paidAmount = 0L;
        long outstandingAmount = Math.max(0L, booking.getRoomTotalPrice() - paidAmount);
        OffsetDateTime holdExpiresAt = booking.getHoldExpiresAt() == null ? null :
                booking.getHoldExpiresAt().atOffset(ZoneOffset.UTC)
                        .atZoneSameInstant(BUSINESS_TIME_ZONE).toOffsetDateTime();

        return new ManagerBookingDetailResponse(
                booking.getId(),
                booking.getCode(),
                booking.getHomestayId(),
                homestay != null ? homestay.getName() : null,
                booking.getCustomerId(),
                customer != null ? customer.getFullName() : null,
                customer != null ? customer.getPhone() : null,
                customer != null ? customer.getEmail() : null,
                booking.getContactName(),
                booking.getContactPhone(),
                booking.getContactEmail(),
                source,
                booking.getStatus(),
                booking.getCheckInDate(),
                booking.getCheckOutDate(),
                booking.getGuestCount(),
                booking.getNote(),
                booking.getRoomTotalPrice(),
                booking.getDepositAmount(),
                paidAmount,
                outstandingAmount,
                booking.getRefundAmount(),
                holdExpiresAt,
                booking.getApprovedBy(),
                approver != null ? approver.getFullName() : null,
                booking.getApprovedAt(),
                booking.getCancelledBy(),
                canceller != null ? canceller.getFullName() : null,
                booking.getCancelledAt(),
                booking.getCancelReason(),
                booking.getPolicySnapshot(),
                booking.getCreatedBy(),
                creator != null ? creator.getFullName() : null,
                booking.getCreatedAt(),
                booking.getUpdatedAt(),
                roomDetails,
                instruction,
                List.of(),
                List.of()
        );
    }

    private Long validateAndGetHomestayId(UserPrincipal principal) {
        if (principal == null || principal.getHomestayId() == null) {
            throw BusinessException.badRequest("HOMESTAY_NOT_ASSIGNED", "Tài khoản quản lý chưa được phân công cơ sở");
        }
        return principal.getHomestayId();
    }

    private BookingPolicy loadPolicy(LocalDate checkInDate, LocalDate checkOutDate) {
        LocalDate today = LocalDate.now(BUSINESS_TIME_ZONE);
        long nights = java.time.temporal.ChronoUnit.DAYS.between(checkInDate, checkOutDate);
        long advanceDays = java.time.temporal.ChronoUnit.DAYS.between(today, checkInDate);

        int minNights = requiredPolicyInt("BOOKING", "min_nights");
        int maxNights = requiredPolicyInt("BOOKING", "max_nights");
        int maxAdvanceDays = requiredPolicyInt("BOOKING", "max_advance_days");
        int depositPercent = requiredPolicyInt("PAYMENT", "deposit_percent");
        int holdHours = requiredPolicyInt("PAYMENT", "hold_hours");

        if (nights < minNights || nights > maxNights || advanceDays > maxAdvanceDays) {
            throw BusinessException.badRequest("BOOKING_POLICY_VIOLATION", "Thời gian lưu trú không đáp ứng chính sách đặt phòng");
        }
        return new BookingPolicy(minNights, maxNights, maxAdvanceDays, depositPercent, holdHours);
    }

    private int requiredPolicyInt(String policyGroup, String policyKey) {
        String value = policySettingRepository.findByPolicyGroupAndPolicyKey(policyGroup, policyKey)
                .map(PolicySetting::getPolicyValue)
                .orElseThrow(() -> BusinessException.badRequest("BOOKING_POLICY_NOT_CONFIGURED", "Chính sách đặt phòng chưa được cấu hình"));
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException exception) {
            throw BusinessException.badRequest("BOOKING_POLICY_NOT_CONFIGURED", "Chính sách đặt phòng chưa được cấu hình hợp lệ");
        }
    }

    private List<BookingRoomNight> buildRoomNights(Long homestayId, List<Room> rooms,
                                                    LocalDate checkInDate, LocalDate checkOutDate) {
        Set<Long> roomIds = rooms.stream().map(Room::getId).collect(Collectors.toSet());
        List<PriceRule> rules = priceRuleRepository.findActiveQuoteRules(
                Set.of(homestayId), roomIds, PriceRule.Status.ACTIVE,
                PriceRule.RuleType.BASE, PriceRule.RuleType.ADJUSTMENT);
        Map<Long, List<PriceRule>> rulesByRoom = rules.stream().collect(Collectors.groupingBy(rule ->
                rule.getRoomId() == null ? -1L : rule.getRoomId()));

        List<BookingRoomNight> nights = new ArrayList<>();
        for (Room room : rooms) {
            List<PriceRule> roomRules = new ArrayList<>(rulesByRoom.getOrDefault(-1L, List.of()));
            roomRules.addAll(rulesByRoom.getOrDefault(room.getId(), List.of()));
            PriceRule baseRule = roomRules.stream()
                    .filter(rule -> rule.getRuleType() == PriceRule.RuleType.BASE && room.getId().equals(rule.getRoomId()))
                    .findFirst()
                    .orElseThrow(() -> BusinessException.badRequest("PRICE_NOT_CONFIGURED", "Một hoặc nhiều phòng chưa có giá cơ bản đang áp dụng"));

            for (LocalDate date = checkInDate; date.isBefore(checkOutDate); date = date.plusDays(1)) {
                LocalDate stayDate = date;
                PriceRule adjustment = roomRules.stream()
                        .filter(rule -> rule.getRuleType() == PriceRule.RuleType.ADJUSTMENT)
                        .filter(rule -> rule.getRoomId() == null || room.getId().equals(rule.getRoomId()))
                        .filter(rule -> appliesOn(rule, stayDate))
                        .min(Comparator.comparing(PriceRule::getPriority, Comparator.reverseOrder())
                                .thenComparing(rule -> room.getId().equals(rule.getRoomId()) ? 0 : 1)
                                .thenComparing(PriceRule::getId))
                        .orElse(null);
                long nightlyPrice = calculateNightlyPrice(baseRule, adjustment);
                String appliedRuleName = adjustment == null ? baseRule.getName() : adjustment.getName();
                nights.add(new BookingRoomNight(room.getId(), date, null, homestayId, nightlyPrice, appliedRuleName));
            }
        }
        return nights;
    }

    private boolean appliesOn(PriceRule rule, LocalDate date) {
        if (rule.getStartDate() != null && date.isBefore(rule.getStartDate())) return false;
        if (rule.getEndDate() != null && date.isAfter(rule.getEndDate())) return false;
        String weekdays = rule.getWeekdays();
        return weekdays == null || weekdays.isBlank() || List.of(weekdays.split(",")).stream()
                .map(String::trim).anyMatch(day -> day.equalsIgnoreCase(date.getDayOfWeek().name().substring(0, 3)));
    }

    private long calculateNightlyPrice(PriceRule baseRule, PriceRule adjustment) {
        Long basePrice = baseRule.getBasePrice();
        if (basePrice == null || basePrice < 0) {
            throw BusinessException.badRequest("PRICE_NOT_CONFIGURED", "Giá cơ bản của phòng không hợp lệ");
        }
        if (adjustment == null) return basePrice;
        Long value = adjustment.getAdjustValue();
        if (value == null || adjustment.getAdjustType() == null) {
            throw BusinessException.badRequest("PRICE_RULE_INVALID", "Quy tắc giá của phòng không hợp lệ");
        }
        long price = adjustment.getAdjustType() == PriceRule.AdjustType.FIXED_PRICE
                ? value
                : BigDecimal.valueOf(basePrice)
                .multiply(BigDecimal.valueOf(100L).add(BigDecimal.valueOf(value)))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                .longValueExact();
        if (price < 0) {
            throw BusinessException.badRequest("PRICE_RULE_INVALID", "Quy tắc giá tạo ra giá phòng không hợp lệ");
        }
        return price;
    }

    private String serializePolicySnapshot(BookingPolicy policy) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "minNights", policy.minNights(),
                    "maxNights", policy.maxNights(),
                    "maxAdvanceDays", policy.maxAdvanceDays(),
                    "depositPercent", policy.depositPercent(),
                    "holdHours", policy.holdHours()));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to serialize booking policy snapshot", exception);
        }
    }

    private String generateBookingCode(LocalDate checkInDate) {
        String datePart = checkInDate.format(DateTimeFormatter.ofPattern("yyMMdd"));
        return "HS-" + datePart + "-" + UUID.randomUUID().toString().replace("-", "")
                .substring(0, 6).toUpperCase();
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record BookingPolicy(int minNights, int maxNights, int maxAdvanceDays,
                                 int depositPercent, int holdHours) {}
}
