package vn.edu.hust.homestay.booking.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.booking.dto.CreateBookingRequest;
import vn.edu.hust.homestay.booking.dto.CreateBookingResponse;
import vn.edu.hust.homestay.booking.dto.CustomerBookingSummaryResponse;
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
import vn.edu.hust.homestay.room.repository.RoomRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CustomerBookingService {

    private static final ZoneId BUSINESS_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final List<String> BANK_POLICY_KEYS = List.of(
            "bank_name", "bank_account_number", "bank_account_holder");

    private final BookingRepository bookingRepository;
    private final BookingRoomRepository bookingRoomRepository;
    private final BookingRoomNightRepository bookingRoomNightRepository;
    private final HomestayRepository homestayRepository;
    private final RoomRepository roomRepository;
    private final PriceRuleRepository priceRuleRepository;
    private final PolicySettingRepository policySettingRepository;
    private final MediaRepository mediaRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public CustomerBookingService(
            BookingRepository bookingRepository,
            BookingRoomRepository bookingRoomRepository,
            BookingRoomNightRepository bookingRoomNightRepository,
            HomestayRepository homestayRepository,
            RoomRepository roomRepository,
            PriceRuleRepository priceRuleRepository,
            PolicySettingRepository policySettingRepository,
            MediaRepository mediaRepository
    ) {
        this.bookingRepository = bookingRepository;
        this.bookingRoomRepository = bookingRoomRepository;
        this.bookingRoomNightRepository = bookingRoomNightRepository;
        this.homestayRepository = homestayRepository;
        this.roomRepository = roomRepository;
        this.priceRuleRepository = priceRuleRepository;
        this.policySettingRepository = policySettingRepository;
        this.mediaRepository = mediaRepository;
    }

    @Transactional
    public CreateBookingResponse create(UserPrincipal principal, CreateBookingRequest request) {
        if (principal.getPhone() == null || principal.getPhone().isBlank()) {
            throw BusinessException.badRequest("CUSTOMER_PHONE_REQUIRED", "Cập nhật số điện thoại trước khi đặt phòng");
        }
        if (request.getRoomIds().size() != new HashSet<>(request.getRoomIds()).size()) {
            throw BusinessException.badRequest("DUPLICATE_ROOM_ID", "Danh sách phòng không được chứa phòng trùng lặp");
        }

        Homestay homestay = homestayRepository.findByIdAndStatus(
                        request.getHomestayId(), Homestay.HomestayStatus.ACTIVE)
                .orElseThrow(() -> BusinessException.badRequest("HOMESTAY_INACTIVE", "Homestay không tồn tại hoặc ngừng hoạt động"));

        List<Long> roomIds = request.getRoomIds().stream().sorted().toList();
        List<Room> rooms = roomRepository.findAllByIdInForUpdate(roomIds);
        if (rooms.size() != roomIds.size()) {
            throw BusinessException.badRequest("ROOM_NOT_AVAILABLE", "Một hoặc nhiều phòng không tồn tại hoặc không thuộc homestay đã chọn");
        }
        validateRooms(rooms, request, homestay.getId());

        BookingPolicy policy = loadPolicy(request.getCheckInDate(), request.getCheckOutDate());
        List<BookingRoomNight> roomNights = buildRoomNights(
                homestay.getId(), rooms, request.getCheckInDate(), request.getCheckOutDate());
        long totalPrice = roomNights.stream().mapToLong(BookingRoomNight::getNightlyPrice).reduce(0L, Math::addExact);
        if (totalPrice <= 0) {
            throw BusinessException.badRequest("BOOKING_POLICY_VIOLATION", "Tổng tiền phòng phải lớn hơn 0 để tạo booking");
        }
        long depositAmount = BigDecimal.valueOf(totalPrice)
                .multiply(BigDecimal.valueOf(policy.depositPercent()))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.CEILING)
                .longValueExact();

        List<Object[]> conflicts = bookingRoomNightRepository.findExistingNights(
                roomIds, request.getCheckInDate(), request.getCheckOutDate());
        if (!conflicts.isEmpty()) {
            throw BusinessException.conflict("ROOM_NOT_AVAILABLE", "Phòng không còn khả dụng trong khoảng thời gian đã chọn");
        }

        Instant now = Instant.now();
        LocalDateTime holdExpiresAtUtc = LocalDateTime.ofInstant(now, ZoneOffset.UTC).plusHours(policy.holdHours());
        Booking booking = new Booking();
        booking.setCode(generateBookingCode(request.getCheckInDate()));
        booking.setHomestayId(homestay.getId());
        booking.setCustomerId(principal.getId());
        booking.setContactName(principal.getFullName());
        booking.setContactPhone(principal.getPhone());
        booking.setContactEmail(principal.getEmail());
        booking.setCheckInDate(request.getCheckInDate());
        booking.setCheckOutDate(request.getCheckOutDate());
        booking.setGuestCount(request.getGuestCount().shortValue());
        booking.setStatus(BookingStatus.PENDING_DEPOSIT);
        booking.setRoomTotalPrice(totalPrice);
        booking.setDepositAmount(depositAmount);
        booking.setHoldExpiresAt(holdExpiresAtUtc);
        booking.setPolicySnapshot(serializePolicySnapshot(policy));
        booking.setNote(normalize(request.getNote()));
        booking.setCreatedBy(principal.getId());
        Booking savedBooking = bookingRepository.saveAndFlush(booking);

        bookingRoomRepository.saveAllAndFlush(rooms.stream()
                .map(room -> new BookingRoom(savedBooking.getId(), homestay.getId(), room.getId()))
                .toList());

        roomNights.forEach(night -> night.setBookingId(savedBooking.getId()));
        try {
            bookingRoomNightRepository.saveAllAndFlush(roomNights);
        } catch (DataIntegrityViolationException exception) {
            throw BusinessException.conflict("ROOM_NOT_AVAILABLE", "Phòng vừa được đặt bởi khách khác. Hãy chọn ngày hoặc phòng khác");
        }

        return toResponse(savedBooking, policySettingRepository.findByPolicyGroupAndPolicyKeyIn("PAYMENT", BANK_POLICY_KEYS));
    }

    @Transactional(readOnly = true)
    public Page<CustomerBookingSummaryResponse> getCustomerBookings(
            UserPrincipal principal,
            BookingStatus status,
            Pageable pageable
    ) {
        Long customerId = principal.getId();
        Page<Booking> page = status == null
                ? bookingRepository.findByCustomerId(customerId, pageable)
                : bookingRepository.findByCustomerIdAndStatus(customerId, status, pageable);

        if (page.isEmpty()) {
            return Page.empty(pageable);
        }

        List<Booking> bookings = page.getContent();
        List<Long> bookingIds = bookings.stream().map(Booking::getId).toList();
        Set<Long> homestayIds = bookings.stream().map(Booking::getHomestayId).collect(Collectors.toSet());

        Map<Long, Homestay> homestayMap = homestayRepository.findAllById(homestayIds).stream()
                .collect(Collectors.toMap(Homestay::getId, h -> h));

        List<BookingRoom> bookingRooms = bookingRoomRepository.findByBookingIdIn(bookingIds);
        Map<Long, List<BookingRoom>> roomsByBookingId = bookingRooms.stream()
                .collect(Collectors.groupingBy(BookingRoom::getBookingId));

        Set<Long> roomIds = bookingRooms.stream().map(BookingRoom::getRoomId).collect(Collectors.toSet());
        Map<Long, Room> roomMap = roomIds.isEmpty() ? Map.of() :
                roomRepository.findAllById(roomIds).stream().collect(Collectors.toMap(Room::getId, r -> r));

        Map<Long, Media> roomCovers = roomIds.isEmpty() ? Map.of() :
                mediaRepository.findByOwnerTypeAndOwnerIdInOrderBySortOrderAsc(Media.OwnerType.ROOM, roomIds).stream()
                        .collect(Collectors.toMap(Media::getOwnerId, m -> m, (first, second) -> first));

        boolean hasPendingDeposit = bookings.stream().anyMatch(b -> b.getStatus() == BookingStatus.PENDING_DEPOSIT);
        Map<String, String> bankData = hasPendingDeposit
                ? policySettingRepository.findByPolicyGroupAndPolicyKeyIn("PAYMENT", BANK_POLICY_KEYS).stream()
                        .collect(Collectors.toMap(PolicySetting::getPolicyKey, PolicySetting::getPolicyValue))
                : Map.of();

        return page.map(booking -> {
            Homestay homestay = homestayMap.get(booking.getHomestayId());
            List<BookingRoom> bRooms = roomsByBookingId.getOrDefault(booking.getId(), List.of());
            List<CustomerBookingSummaryResponse.BookingRoomSummary> roomSummaries = bRooms.stream().map(br -> {
                Room room = roomMap.get(br.getRoomId());
                Media cover = room != null ? roomCovers.get(room.getId()) : null;
                return new CustomerBookingSummaryResponse.BookingRoomSummary(
                        br.getRoomId(),
                        room != null ? room.getName() : "Phòng #" + br.getRoomId(),
                        cover != null ? cover.getUrl() : null
                );
            }).toList();

            CreateBookingResponse.PaymentInstruction instruction = null;
            if (booking.getStatus() == BookingStatus.PENDING_DEPOSIT && !bankData.isEmpty()) {
                instruction = new CreateBookingResponse.PaymentInstruction(
                        bankData.get("bank_name"),
                        bankData.get("bank_account_number"),
                        bankData.get("bank_account_holder"),
                        booking.getCode() + " DAT COC"
                );
            }

            OffsetDateTime holdExpiresAt = booking.getHoldExpiresAt() == null ? null :
                    booking.getHoldExpiresAt().atOffset(ZoneOffset.UTC)
                            .atZoneSameInstant(BUSINESS_TIME_ZONE).toOffsetDateTime();

            return new CustomerBookingSummaryResponse(
                    booking.getId(),
                    booking.getCode(),
                    booking.getHomestayId(),
                    homestay != null ? homestay.getName() : null,
                    homestay != null ? homestay.getProvince() : null,
                    booking.getStatus(),
                    booking.getRoomTotalPrice(),
                    booking.getDepositAmount(),
                    booking.getCheckInDate(),
                    booking.getCheckOutDate(),
                    booking.getGuestCount(),
                    holdExpiresAt,
                    booking.getCreatedAt(),
                    roomSummaries,
                    instruction
            );
        });
    }

    private void validateRooms(List<Room> rooms, CreateBookingRequest request, Long homestayId) {
        for (Room room : rooms) {
            if (!homestayId.equals(room.getHomestayId())) {
                throw BusinessException.badRequest("ROOM_NOT_AVAILABLE", "Phòng không thuộc homestay đã chọn");
            }
            if (room.getStatus() != RoomStatus.ACTIVE) {
                throw BusinessException.conflict("ROOM_LOCKED", "Một hoặc nhiều phòng hiện không nhận đặt");
            }
            // nếu đặt nhiều phòng, coi như số khách <= max count từng phòng
            if (request.getGuestCount() > Byte.toUnsignedInt(room.getMaxGuests())) {
                throw BusinessException.badRequest("ROOM_CAPACITY_EXCEEDED", "Số khách vượt quá sức chứa của một hoặc nhiều phòng");
            }
        }
    }

    private BookingPolicy loadPolicy(LocalDate checkInDate, LocalDate checkOutDate) {
        if (checkInDate == null || checkOutDate == null || !checkOutDate.isAfter(checkInDate)) {
            throw BusinessException.badRequest("INVALID_DATE_RANGE", "Ngày trả phòng phải sau ngày nhận phòng");
        }
        LocalDate today = LocalDate.now(BUSINESS_TIME_ZONE);
        long nights = java.time.temporal.ChronoUnit.DAYS.between(checkInDate, checkOutDate);
        long advanceDays = java.time.temporal.ChronoUnit.DAYS.between(today, checkInDate);
        if (checkInDate.isBefore(today)) {
            throw BusinessException.badRequest("INVALID_DATE_RANGE", "Ngày trả phòng phải sau ngày nhận phòng và ngày nhận không được ở quá khứ");
        }

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

    private CreateBookingResponse toResponse(Booking booking, List<PolicySetting> bankSettings) {
        Map<String, String> bankData = bankSettings.stream().collect(Collectors.toMap(
                PolicySetting::getPolicyKey, PolicySetting::getPolicyValue));
        String transferContent = booking.getCode() + " DAT COC";
        CreateBookingResponse.PaymentInstruction instruction = new CreateBookingResponse.PaymentInstruction(
                bankData.get("bank_name"), bankData.get("bank_account_number"),
                bankData.get("bank_account_holder"), transferContent);
        return new CreateBookingResponse(
                booking.getId(), booking.getCode(), booking.getStatus(), booking.getRoomTotalPrice(),
                booking.getDepositAmount(), booking.getHoldExpiresAt().atOffset(ZoneOffset.UTC)
                        .atZoneSameInstant(BUSINESS_TIME_ZONE).toOffsetDateTime(),
                booking.getCheckInDate(), booking.getCheckOutDate(), instruction);
    }

    private String generateBookingCode(LocalDate checkInDate) {
        String datePart = checkInDate.format(java.time.format.DateTimeFormatter.ofPattern("yyMMdd"));
        return "HS-" + datePart + "-" + UUID.randomUUID().toString().replace("-", "")
                .substring(0, 6).toUpperCase();
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record BookingPolicy(int minNights, int maxNights, int maxAdvanceDays,
                                 int depositPercent, int holdHours) {}
}
