package vn.edu.hust.homestay.booking.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.auth.entity.Role;
import vn.edu.hust.homestay.auth.entity.User;
import vn.edu.hust.homestay.auth.entity.UserStatus;
import vn.edu.hust.homestay.auth.repository.UserRepository;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.booking.dto.ManagerAdjustBookingRequest;
import vn.edu.hust.homestay.booking.dto.ManagerAdjustBookingResponse;
import vn.edu.hust.homestay.booking.dto.ManagerBookingDetailResponse;
import vn.edu.hust.homestay.booking.dto.ManagerBookingSummaryResponse;
import vn.edu.hust.homestay.booking.dto.ManagerBookingSummaryResponse.BookingRoomSummary;
import vn.edu.hust.homestay.booking.dto.ManagerCreateBookingRequest;
import vn.edu.hust.homestay.booking.dto.ManagerCreateBookingResponse;
import vn.edu.hust.homestay.booking.dto.ManagerCustomerLookupResponse;
import vn.edu.hust.homestay.booking.dto.DepositReviewRequest;
import vn.edu.hust.homestay.booking.dto.DepositReviewResponse;
import vn.edu.hust.homestay.booking.dto.ManagerRecordDepositRequest;
import vn.edu.hust.homestay.booking.dto.ManagerRecordDepositResponse;
import vn.edu.hust.homestay.booking.dto.ManagerCancelBookingRequest;
import vn.edu.hust.homestay.booking.dto.ManagerCancelBookingResponse;
import vn.edu.hust.homestay.booking.dto.CheckInBookingRequest;
import vn.edu.hust.homestay.booking.dto.CheckInBookingResponse;
import vn.edu.hust.homestay.booking.dto.CheckOutBookingRequest;
import vn.edu.hust.homestay.booking.dto.CheckOutBookingResponse;
import vn.edu.hust.homestay.booking.dto.BookingBalanceResponse;
import vn.edu.hust.homestay.booking.dto.CustomerDepositProof;
import vn.edu.hust.homestay.booking.entity.Booking;
import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;
import vn.edu.hust.homestay.booking.entity.BookingRoom;
import vn.edu.hust.homestay.booking.entity.BookingRoomNight;
import vn.edu.hust.homestay.booking.repository.BookingRepository;
import vn.edu.hust.homestay.booking.repository.BookingRoomNightRepository;
import vn.edu.hust.homestay.booking.repository.BookingRoomRepository;
import vn.edu.hust.homestay.common.exception.BusinessException;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.BOOKING_NOTE_MAX_LENGTH;
import vn.edu.hust.homestay.homestay.entity.Homestay;
import vn.edu.hust.homestay.homestay.repository.HomestayRepository;
import vn.edu.hust.homestay.media.entity.Media;
import vn.edu.hust.homestay.media.repository.MediaRepository;
import vn.edu.hust.homestay.policy.entity.PolicySetting;
import vn.edu.hust.homestay.policy.repository.PolicySettingRepository;
import vn.edu.hust.homestay.payment.entity.Payment;
import vn.edu.hust.homestay.payment.repository.PaymentRepository;
import vn.edu.hust.homestay.pricing.entity.PriceRule;
import vn.edu.hust.homestay.pricing.repository.PriceRuleRepository;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;
import vn.edu.hust.homestay.room.entity.RoomType;
import vn.edu.hust.homestay.room.repository.RoomRepository;
import vn.edu.hust.homestay.room.repository.RoomTypeRepository;
import vn.edu.hust.homestay.service.dto.ManagerBookServiceRequest;
import vn.edu.hust.homestay.service.dto.ManagerBookingServiceResponse;
import vn.edu.hust.homestay.service.entity.BookingService;
import vn.edu.hust.homestay.service.entity.Service;
import vn.edu.hust.homestay.service.repository.BookingServiceRepository;
import vn.edu.hust.homestay.service.repository.ServiceRepository;
import vn.edu.hust.homestay.service.service.CustomerBookingServiceService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.Normalizer;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Service xử lý các nghiệp vụ quản lý Booking của Manager:
 * - API-MGR-BOOK-01: Danh sách booking cơ sở
 * - API-MGR-BOOK-02: Đặt phòng hộ khách
 * - API-MGR-BOOK-03: Chi tiết booking
 * - API-MGR-BOOK-04: Điều chỉnh booking
 */
@org.springframework.stereotype.Service
public class ManagerBookingService {

    private static final ZoneId BUSINESS_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Pattern BANK_ACCOUNT_NUMBER_PATTERN = Pattern.compile("^[0-9]{6,20}$");
    private static final Pattern BANK_ACCOUNT_HOLDER_PATTERN = Pattern.compile("^[\\p{L}\\s]{2,50}$");
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
    private final PaymentRepository paymentRepository;
    private final CancellationRefundPolicyService cancellationRefundPolicyService;
    private final CustomerBookingServiceService bookingServiceOperations;
    private final BookingServiceRepository bookingServiceRepository;
    private final ServiceRepository serviceRepository;
    private final Path privateUploadRoot;
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
            UserRepository userRepository,
            PaymentRepository paymentRepository,
            CancellationRefundPolicyService cancellationRefundPolicyService,
            CustomerBookingServiceService bookingServiceOperations,
            BookingServiceRepository bookingServiceRepository,
            ServiceRepository serviceRepository,
            @Value("${app.storage.private-upload-dir:storage/private}") String privateUploadDir
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
        this.paymentRepository = paymentRepository;
        this.cancellationRefundPolicyService = cancellationRefundPolicyService;
        this.bookingServiceOperations = bookingServiceOperations;
        this.bookingServiceRepository = bookingServiceRepository;
        this.serviceRepository = serviceRepository;
        this.privateUploadRoot = Paths.get(privateUploadDir).toAbsolutePath().normalize();
    }

    private Clock clock = Clock.system(BUSINESS_TIME_ZONE);

    public void setClock(Clock clock) {
        this.clock = clock;
    }

    private LocalTime getStayCheckInTime() {
        return policySettingRepository.findByPolicyGroupAndPolicyKey("STAY", "check_in_time")
                .map(PolicySetting::getPolicyValue)
                .map(val -> {
                    try {
                        return LocalTime.parse(val.trim());
                    } catch (Exception e) {
                        return LocalTime.of(11, 0);
                    }
                })
                .orElse(LocalTime.of(11, 0));
    }

    private LocalTime getStayCheckOutDeadline() {
        return policySettingRepository.findByPolicyGroupAndPolicyKey("STAY", "check_out_deadline")
                .map(PolicySetting::getPolicyValue)
                .map(val -> {
                    try {
                        return LocalTime.parse(val.trim());
                    } catch (Exception e) {
                        return LocalTime.of(8, 0);
                    }
                })
                .orElse(LocalTime.of(8, 0));
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

        Homestay homestay = homestayRepository.findById(homestayId).orElse(null);
        String homestayName = homestay != null ? homestay.getName() : null;

        List<ManagerBookingSummaryResponse> responses = bookings.stream().map(b -> {
            OffsetDateTime holdExpiresAt = b.getHoldExpiresAt() == null ? null :  // giờ chuẩn quốc tế
                    b.getHoldExpiresAt().atOffset(ZoneOffset.UTC)
                            .atZoneSameInstant(BUSINESS_TIME_ZONE).toOffsetDateTime(); // chuyển sang giờ VN

            return new ManagerBookingSummaryResponse(
                    b.getId(),
                    b.getCode(),
                    b.getHomestayId(),
                    homestayName,
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
                    b.getCustomerId() != null && b.getCustomerId().equals(b.getCreatedBy()) ? "CUSTOMER" : "MANAGER",
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

        // 8. Tra cứu customerId: ưu tiên customerId nếu được chỉ định, hoặc đối soát theo email/SĐT khách hàng
        Long customerId = null;
        if (request.customerId() != null) {
            customerId = userRepository.findById(request.customerId())
                    .filter(u -> u.getRole() == Role.CUSTOMER && u.getStatus() == UserStatus.ACTIVE)
                    .map(User::getId)
                    .orElse(null);
        }
        if (customerId == null && request.contactEmail() != null && !request.contactEmail().isBlank()) {
            customerId = userRepository.findByEmail(request.contactEmail().trim().toLowerCase())
                    .filter(u -> u.getRole() == Role.CUSTOMER && u.getStatus() == UserStatus.ACTIVE)
                    .map(User::getId)
                    .orElse(null);
        }
        if (customerId == null && request.contactPhone() != null && !request.contactPhone().isBlank()) {
            customerId = userRepository.findByPhone(request.contactPhone().trim())
                    .filter(u -> u.getRole() == Role.CUSTOMER && u.getStatus() == UserStatus.ACTIVE)
                    .map(User::getId)
                    .orElse(null);
        }

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

        // 11. Lưu các dịch vụ đăng ký kèm đơn (nếu có)
        Long requestedBy = customerId != null ? customerId : principal.getId();
        bookingServiceOperations.createInitialServices(savedBooking, requestedBy,
                Set.copyOf(sortedRoomIds), request.services());

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
     * Tra cứu tài khoản khách hàng theo SĐT hoặc Email (cho Manager khi đặt phòng hộ khách).
     * Chỉ trả về tài khoản vai trò CUSTOMER và đang ACTIVE.
     */
    @Transactional(readOnly = true)
    public ManagerCustomerLookupResponse lookupCustomer(UserPrincipal principal, String phone, String email) {
        validateAndGetHomestayId(principal);

        User user = null;
        if (email != null && !email.isBlank()) {
            user = userRepository.findByEmail(email.trim().toLowerCase())
                    .filter(u -> u.getRole() == Role.CUSTOMER && u.getStatus() == UserStatus.ACTIVE)
                    .orElse(null);
        }
        if (user == null && phone != null && !phone.isBlank()) {
            user = userRepository.findByPhone(phone.trim())
                    .filter(u -> u.getRole() == Role.CUSTOMER && u.getStatus() == UserStatus.ACTIVE)
                    .orElse(null);
        }
        return user != null ? ManagerCustomerLookupResponse.from(user) : null;
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
        List<BookingRoomNight> allNights = bookingRoomNightRepository
                .findByBookingIdOrderByIdRoomIdAscIdStayDateAsc(booking.getId());
        Set<Long> roomIds = bRooms.stream().map(BookingRoom::getRoomId).collect(Collectors.toSet());
        Map<Long, Room> roomMap = roomIds.isEmpty() ? Map.of() :
                roomRepository.findAllById(roomIds).stream().collect(Collectors.toMap(Room::getId, r -> r));

        List<BookingService> bServices = bookingServiceRepository.findByBookingIdOrderByIdAsc(booking.getId());
        Set<Long> serviceIds = bServices.stream().map(BookingService::getServiceId).collect(Collectors.toSet());
        Map<Long, Service> serviceEntityMap = serviceIds.isEmpty() ? Map.of() :
                serviceRepository.findAllById(serviceIds).stream()
                        .collect(Collectors.toMap(Service::getId, s -> s));

        List<ManagerBookingDetailResponse.ServiceSummary> serviceSummaries = bServices.stream().map(bs -> {
            Room room = roomMap.get(bs.getRoomId());
            String rName = room != null ? room.getName() : "Phòng #" + bs.getRoomId();
            Service svc = serviceEntityMap.get(bs.getServiceId());
            String sName = svc != null ? svc.getName() : "Dịch vụ #" + bs.getServiceId();
            String unit = svc != null ? svc.getUnit() : null;
            return ManagerBookingDetailResponse.ServiceSummary.from(bs, rName, sName, unit);
        }).toList();

        Set<Long> roomTypeIds = roomMap.values().stream().map(Room::getRoomTypeId).collect(Collectors.toSet());
        Map<Long, String> roomTypeNameMap = roomTypeIds.isEmpty() ? Map.of() :
                roomTypeRepository.findAllById(roomTypeIds).stream().collect(Collectors.toMap(RoomType::getId, RoomType::getName));

        Map<Long, Media> roomCovers = roomIds.isEmpty() ? Map.of() :
                mediaRepository.findByOwnerTypeAndOwnerIdInOrderBySortOrderAsc(Media.OwnerType.ROOM, roomIds).stream()
                        .collect(Collectors.toMap(Media::getOwnerId, m -> m, (first, second) -> first));

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

        // Count only money actually confirmed by staff; pending submissions are not payments received.
        long paidAmount = paymentRepository.sumConfirmedAmounts(
                booking.getId(), List.of(Payment.PaymentType.DEPOSIT, Payment.PaymentType.PAYMENT),
                Payment.PaymentStatus.CONFIRMED);
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
                paymentRepository.findByBookingIdAndTypeInOrderByCreatedAtDesc(
                                booking.getId(), List.of(Payment.PaymentType.DEPOSIT, Payment.PaymentType.PAYMENT, Payment.PaymentType.REFUND))
                        .stream()
                        .map(payment -> new ManagerBookingDetailResponse.PaymentSummary(
                                payment.getId(), payment.getType().name(), payment.getAmount(), payment.getStatus().name(),
                                payment.getMethod().name(), payment.getReferenceCode(),
                                payment.getProviderOrderId(), payment.getProviderTransId(), payment.getRejectionReason(),
                                payment.getCreatedAt() == null ? null : payment.getCreatedAt().toInstant(ZoneOffset.UTC),
                                payment.getConfirmedAt() == null ? null : payment.getConfirmedAt().toInstant(ZoneOffset.UTC),
                                payment.getProofUrl() != null, managerProofMimeType(payment.getProofUrl()), payment.getNote(),
                                payment.getBankName(), payment.getBankAccountNumber(), payment.getBankAccountHolder()))
                        .toList(),
                serviceSummaries
        );
    }

    /** API-MGR-BOOK-05: Review one pending deposit and update its booking atomically. */
    @Transactional
    public DepositReviewResponse reviewDeposit(UserPrincipal principal, Long bookingId, DepositReviewRequest request) {
        Long homestayId = validateAndGetHomestayId(principal);
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> BusinessException.notFound("BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt phòng"));
        if (!homestayId.equals(booking.getHomestayId())) {
            throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Đơn đặt phòng không thuộc cơ sở homestay được giao quản lý");
        }
        if (booking.getStatus() != BookingStatus.PENDING_APPROVAL) {
            throw BusinessException.conflict("BOOKING_STATE_CONFLICT", "Booking không ở trạng thái chờ xác nhận đặt cọc");
        }

        Payment payment = paymentRepository.findByIdAndBookingIdAndHomestayIdForUpdate(
                        request.paymentId(), bookingId, homestayId)
                .orElseThrow(() -> BusinessException.notFound("PAYMENT_NOT_FOUND", "Không tìm thấy khoản đặt cọc của booking"));
        if (payment.getType() != Payment.PaymentType.DEPOSIT) {
            throw BusinessException.notFound("PAYMENT_NOT_FOUND", "Khoản thanh toán không phải tiền đặt cọc");
        }
        if (payment.getStatus() != Payment.PaymentStatus.PENDING) {
            throw BusinessException.conflict("PAYMENT_ALREADY_REVIEWED", "Khoản đặt cọc đã được xử lý");
        }

        Instant now = Instant.now();
        LocalDateTime nowUtc = LocalDateTime.ofInstant(now, ZoneOffset.UTC);
        if (request.decision() == DepositReviewRequest.DepositReviewDecision.REJECT) {
            String reason = request.reason() == null ? "" : request.reason().trim();
            if (reason.isEmpty()) {
                throw BusinessException.badRequest("VALIDATION_ERROR", "Cần nhập lý do khi từ chối chứng từ đặt cọc");
            }
            payment.setStatus(Payment.PaymentStatus.REJECTED);
            payment.setRejectionReason(reason);
            paymentRepository.saveAndFlush(payment);

            if (booking.getHoldExpiresAt() != null && booking.getHoldExpiresAt().isAfter(nowUtc)) {
                booking.setStatus(BookingStatus.PENDING_DEPOSIT);
            } else {
                booking.setStatus(BookingStatus.EXPIRED);
                bookingServiceOperations.cancelRegisteredServices(booking.getId());
                bookingRepository.saveAndFlush(booking);
                bookingRoomNightRepository.deleteAllByBookingIdIn(List.of(booking.getId()));
            }
        } else {
            if (payment.getAmount() == null || payment.getAmount() <= 0) {
                throw BusinessException.badRequest("DEPOSIT_AMOUNT_INVALID", "Số tiền đặt cọc phải lớn hơn 0");
            }
            payment.setStatus(Payment.PaymentStatus.CONFIRMED);
            payment.setConfirmedBy(principal.getId());
            payment.setConfirmedAt(nowUtc);
            payment.setRejectionReason(null);
            paymentRepository.saveAndFlush(payment);

            long confirmedDeposits = paymentRepository.sumConfirmedDeposits(
                    booking.getId(), Payment.PaymentType.DEPOSIT, Payment.PaymentStatus.CONFIRMED);
            if (confirmedDeposits >= booking.getDepositAmount()) {
                booking.setStatus(BookingStatus.CONFIRMED);
                booking.setApprovedBy(principal.getId());
                booking.setApprovedAt(now);
            } else if (booking.getHoldExpiresAt() != null && booking.getHoldExpiresAt().isAfter(nowUtc)) {
                booking.setStatus(BookingStatus.PENDING_DEPOSIT);
            } else {
                booking.setStatus(BookingStatus.EXPIRED);
                bookingServiceOperations.cancelRegisteredServices(booking.getId());
                bookingRepository.saveAndFlush(booking);
                bookingRoomNightRepository.deleteAllByBookingIdIn(List.of(booking.getId()));
            }
        }

        bookingRepository.saveAndFlush(booking);
        return new DepositReviewResponse(
                booking.getId(), booking.getStatus(), payment.getId(), payment.getStatus(),
                booking.getApprovedAt(), payment.getRejectionReason());
    }

    /** API-PAY-02: Ghi nhận khoản đặt cọc cho đơn do quản lý đặt hộ (tiền mặt hoặc chuyển khoản). */
    @Transactional
    public ManagerRecordDepositResponse recordDirectDeposit(
            UserPrincipal principal, Long bookingId, ManagerRecordDepositRequest request
    ) {
        Long homestayId = validateAndGetHomestayId(principal);
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> BusinessException.notFound("BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt phòng"));
        if (!homestayId.equals(booking.getHomestayId())) {
            throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Đơn đặt phòng không thuộc cơ sở homestay được giao quản lý");
        }

        // Nghiệp vụ: API-PAY-02 chỉ áp dụng cho đơn do Quản lý đặt hộ
        boolean isManagerCreated = !(booking.getCustomerId() != null && booking.getCreatedBy().equals(booking.getCustomerId()));
        if (!isManagerCreated) {
            throw BusinessException.badRequest("BOOKING_NOT_MANAGER_CREATED",
                    "Chỉ có thể ghi nhận tiền đặt cọc cho đơn đặt phòng do quản lý tạo hộ. Đơn do khách hàng tự đặt trực tuyến phải gửi chứng từ qua cổng khách hàng");
        }

        if (request.type() != Payment.PaymentType.DEPOSIT) {
            throw BusinessException.badRequest("PAYMENT_TYPE_NOT_ALLOWED", "API này chỉ ghi nhận tiền đặt cọc");
        }
        if (request.method() != Payment.PaymentMethod.CASH && request.method() != Payment.PaymentMethod.BANK_TRANSFER) {
            throw BusinessException.badRequest("PAYMENT_METHOD_NOT_ALLOWED", "Phương thức thanh toán phải là tiền mặt (CASH) hoặc chuyển khoản (BANK_TRANSFER)");
        }
        if (booking.getStatus() != BookingStatus.PENDING_DEPOSIT) {
            throw BusinessException.conflict("BOOKING_STATE_CONFLICT", "Chỉ ghi nhận đặt cọc cho booking đang chờ đặt cọc");
        }

        LocalDateTime nowUtc = LocalDateTime.ofInstant(Instant.now(), ZoneOffset.UTC);
        if (booking.getHoldExpiresAt() == null || !booking.getHoldExpiresAt().isAfter(nowUtc)) {
            throw BusinessException.conflict("BOOKING_HOLD_EXPIRED", "Thời hạn giữ phòng đã hết; không thể ghi nhận khoản đặt cọc mới");
        }

        long confirmedDeposits = paymentRepository.sumConfirmedDeposits(
                bookingId, Payment.PaymentType.DEPOSIT, Payment.PaymentStatus.CONFIRMED);
        long remainingDeposit = Math.max(0L, booking.getDepositAmount() - confirmedDeposits);
        if (remainingDeposit == 0) {
            throw BusinessException.conflict("DEPOSIT_ALREADY_PAID", "Booking đã nhận đủ tiền đặt cọc");
        }
        if (request.amount() > remainingDeposit) {
            throw BusinessException.badRequest("DEPOSIT_AMOUNT_EXCEEDS_REMAINING", "Số tiền ghi nhận không được vượt quá số tiền đặt cọc còn thiếu");
        }

        Payment payment = new Payment();
        payment.setBookingId(bookingId);
        payment.setHomestayId(homestayId);
        payment.setType(Payment.PaymentType.DEPOSIT);
        payment.setAmount(request.amount());
        payment.setMethod(request.method());
        payment.setStatus(Payment.PaymentStatus.CONFIRMED);
        if (request.referenceCode() != null && !request.referenceCode().isBlank()) {
            payment.setReferenceCode(request.referenceCode().trim());
        } else if (request.method() == Payment.PaymentMethod.BANK_TRANSFER) {
            payment.setReferenceCode(booking.getCode() + " DAT COC");
        }
        payment.setNote(request.note() == null || request.note().isBlank() ? null : request.note().trim());
        payment.setCreatedBy(principal.getId());
        payment.setConfirmedBy(principal.getId());
        payment.setConfirmedAt(nowUtc);
        Payment saved = paymentRepository.saveAndFlush(payment);

        long totalConfirmedDeposits = confirmedDeposits + saved.getAmount();
        if (totalConfirmedDeposits >= booking.getDepositAmount()) {
            Instant approvedAt = Instant.now();
            booking.setStatus(BookingStatus.CONFIRMED);
            booking.setApprovedBy(principal.getId());
            booking.setApprovedAt(approvedAt);
        }
        bookingRepository.saveAndFlush(booking);

        return new ManagerRecordDepositResponse(
                saved.getId(), bookingId, saved.getType(), saved.getAmount(), saved.getMethod(),
                saved.getStatus(), booking.getStatus(), saved.getReferenceCode());
    }

    /** API-MGR-BOOK-06: Cancel only eligible bookings at this manager's assigned homestay. */
    @Transactional
    public ManagerCancelBookingResponse cancelBooking(
            UserPrincipal principal, Long bookingId, ManagerCancelBookingRequest request
    ) {
        if (request == null || request.reason() == null || request.reason().isBlank()) {
            throw BusinessException.badRequest("CANCELLATION_REASON_REQUIRED", "Cần chọn hoặc nhập lý do hủy booking");
        }
        if (request.requestedByCustomer() == null) {
            throw BusinessException.badRequest("CANCELLATION_SOURCE_REQUIRED", "Cần chọn nguồn yêu cầu hủy booking");
        }
        Long homestayId = validateAndGetHomestayId(principal);
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> BusinessException.notFound("BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt phòng"));
        if (!homestayId.equals(booking.getHomestayId())) {
            throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Đơn đặt phòng không thuộc cơ sở homestay được giao quản lý");
        }
        if (booking.getStatus() != BookingStatus.PENDING_DEPOSIT && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw BusinessException.conflict("BOOKING_STATE_CONFLICT", "Booking ở trạng thái hiện tại không thể hủy");
        }

        int refundPercent = cancellationRefundPolicyService.resolveRefundPercent(booking);
        // Refund the confirmed deposit only; remaining PAYMENT is collected at checkout.
        long paidDeposit = paymentRepository.sumConfirmedDeposits(
                booking.getId(), Payment.PaymentType.DEPOSIT, Payment.PaymentStatus.CONFIRMED);
        long refundAmount = BigDecimal.valueOf(paidDeposit)
                .multiply(BigDecimal.valueOf(refundPercent))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                .longValueExact();

        String reason = request.reason().trim();
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(Instant.now());
        booking.setCancelledBy(principal.getId());
        booking.setCancelReason((Boolean.TRUE.equals(request.requestedByCustomer()) ? "Khách yêu cầu: " : "Sự cố homestay: ") + reason);
        booking.setRefundAmount(refundAmount);
        bookingServiceOperations.cancelRegisteredServices(booking.getId());
        bookingRepository.saveAndFlush(booking);
        bookingRoomNightRepository.deleteAllByBookingIdIn(List.of(booking.getId()));

        if (refundAmount > 0) {
            // Nếu đơn ban đầu cọc trực tuyến qua VNPay thì tạo REFUND method = VNPAY (hoàn thẳng về nguồn gốc)
            Optional<Payment> onlineDeposit = paymentRepository
                    .findTopByBookingIdAndTypeAndStatusAndMethodInAndProviderTransIdIsNotNullOrderByConfirmedAtDesc(
                            booking.getId(),
                            Payment.PaymentType.DEPOSIT,
                            Payment.PaymentStatus.CONFIRMED,
                            List.of(Payment.PaymentMethod.VNPAY)
                    );
            boolean paidOnline = onlineDeposit.isPresent();
            Payment.PaymentMethod refundMethod = paidOnline
                    ? Payment.PaymentMethod.VNPAY
                    : Payment.PaymentMethod.BANK_TRANSFER;

            Payment refund = new Payment();
            refund.setBookingId(booking.getId());
            refund.setHomestayId(homestayId);
            refund.setType(Payment.PaymentType.REFUND);
            refund.setAmount(refundAmount);
            refund.setMethod(refundMethod);
            refund.setStatus(Payment.PaymentStatus.PENDING);
            if (!paidOnline && request != null) {
                if (request.bankName() != null && !request.bankName().isBlank()) {
                    refund.setBankName(request.bankName().trim());
                }
                if (request.bankAccountNumber() != null && !request.bankAccountNumber().isBlank()) {
                    String accNumber = request.bankAccountNumber().trim();
                    if (!BANK_ACCOUNT_NUMBER_PATTERN.matcher(accNumber).matches()) {
                        throw BusinessException.badRequest(
                                "INVALID_BANK_ACCOUNT_NUMBER",
                                "Số tài khoản ngân hàng không hợp lệ (phải gồm từ 6 đến 20 chữ số và chỉ chứa số từ 0-9)");
                    }
                    refund.setBankAccountNumber(accNumber);
                }
                if (request.bankAccountHolder() != null && !request.bankAccountHolder().isBlank()) {
                    String holder = request.bankAccountHolder().trim();
                    if (!BANK_ACCOUNT_HOLDER_PATTERN.matcher(holder).matches()) {
                        throw BusinessException.badRequest(
                                "INVALID_BANK_ACCOUNT_HOLDER",
                                "Tên chủ tài khoản không hợp lệ (phải từ 2 đến 50 ký tự chữ cái, không chứa số hoặc ký tự đặc biệt)");
                    }
                    refund.setBankAccountHolder(normalizeAccountHolder(holder));
                }
            }
            refund.setNote(paidOnline
                    ? "Hoàn tiền trực tuyến về VNPay theo chính sách hủy booking"
                    : "Hoàn tiền theo chính sách hủy booking");
            refund.setCreatedBy(principal.getId());
            paymentRepository.save(refund);
        }
        return new ManagerCancelBookingResponse(booking.getId(), booking.getStatus(), refundAmount, refundAmount > 0);
    }

    /** Authenticated proof delivery for Manager review; never expose private uploads under /files/**. */
    @Transactional(readOnly = true)
    public CustomerDepositProof getDepositProof(UserPrincipal principal, Long bookingId, Long paymentId) {
        Long homestayId = validateAndGetHomestayId(principal);
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> BusinessException.notFound("BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt phòng"));
        if (!homestayId.equals(booking.getHomestayId())) {
            throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Đơn đặt phòng không thuộc cơ sở homestay được giao quản lý");
        }
        Payment payment = paymentRepository.findByIdAndBookingIdAndHomestayId(paymentId, bookingId, homestayId)
                .orElseThrow(() -> BusinessException.notFound("PAYMENT_NOT_FOUND", "Không tìm thấy khoản đặt cọc của booking"));
        if (payment.getType() != Payment.PaymentType.DEPOSIT) {
            throw BusinessException.notFound("PAYMENT_NOT_FOUND", "Khoản thanh toán không phải tiền đặt cọc");
        }
        String key = payment.getProofUrl();
        if (key == null || !key.matches("payments/[0-9a-fA-F-]{36}\\.(jpg|png|webp|pdf)")) {
            throw BusinessException.notFound("DEPOSIT_PROOF_NOT_FOUND", "Không tìm thấy chứng từ đặt cọc");
        }
        Path path = privateUploadRoot.resolve(key).normalize();
        Path paymentFolder = privateUploadRoot.resolve("payments").normalize();
        if (!paymentFolder.startsWith(privateUploadRoot) || !path.startsWith(paymentFolder) || !Files.isRegularFile(path)) {
            throw BusinessException.notFound("DEPOSIT_PROOF_NOT_FOUND", "Không tìm thấy chứng từ đặt cọc");
        }
        String extension = key.substring(key.lastIndexOf('.') + 1);
        org.springframework.http.MediaType mediaType = switch (extension) {
            case "jpg" -> org.springframework.http.MediaType.IMAGE_JPEG;
            case "png" -> org.springframework.http.MediaType.IMAGE_PNG;
            case "webp" -> org.springframework.http.MediaType.parseMediaType("image/webp");
            case "pdf" -> org.springframework.http.MediaType.APPLICATION_PDF;
            default -> org.springframework.http.MediaType.APPLICATION_OCTET_STREAM;
        };
        return new CustomerDepositProof(new FileSystemResource(path), mediaType,
                "deposit-proof-" + paymentId + "." + extension);
    }

    private String managerProofMimeType(String key) {
        if (key == null) return null;
        return switch (key.substring(key.lastIndexOf('.') + 1).toLowerCase(java.util.Locale.ROOT)) {
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            case "webp" -> "image/webp";
            case "pdf" -> "application/pdf";
            default -> null;
        };
    }

    /**
     * API-MGR-SVC-05: Đặt dịch vụ hộ khách
     */
    @Transactional
    public ManagerBookingServiceResponse bookServiceForGuest(
            UserPrincipal principal,
            Long bookingId,
            ManagerBookServiceRequest request
    ) {
        Long homestayId = validateAndGetHomestayId(principal);
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> BusinessException.notFound("BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt phòng"));
        if (!homestayId.equals(booking.getHomestayId())) {
            throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Đơn đặt phòng không thuộc cơ sở homestay được giao quản lý");
        }

        boolean bookingAcceptsServices = switch (booking.getStatus()) {
            case PENDING_DEPOSIT -> booking.getHoldExpiresAt() != null
                    && booking.getHoldExpiresAt().isAfter(LocalDateTime.now(ZoneOffset.UTC));
            case PENDING_APPROVAL, CONFIRMED, CHECKED_IN -> true;
            case CANCELLED, EXPIRED, CHECKED_OUT -> false;
        };
        if (!bookingAcceptsServices) {
            throw BusinessException.conflict("BOOKING_STATE_CONFLICT", "Đơn đặt phòng không còn nhận đăng ký dịch vụ");
        }

        if (!bookingRoomRepository.existsByBookingIdAndRoomId(booking.getId(), request.roomId())) {
            throw BusinessException.badRequest("ROOM_NOT_IN_BOOKING", "Phòng không thuộc đơn đặt phòng này");
        }

        Service service = serviceRepository.findByIdAndHomestayId(request.serviceId(), homestayId)
                .orElseThrow(() -> BusinessException.notFound("SERVICE_NOT_FOUND", "Không tìm thấy dịch vụ tại cơ sở homestay"));

        if (service.getStatus() != Service.ServiceStatus.ACTIVE) {
            throw BusinessException.badRequest("SERVICE_NOT_ACTIVE", "Dịch vụ hiện không còn hoạt động");
        }

        if (request.serviceDate() != null) {
            if (request.serviceDate().isBefore(booking.getCheckInDate())
                    || !request.serviceDate().isBefore(booking.getCheckOutDate())) {
                throw BusinessException.badRequest("SERVICE_DATE_OUTSIDE_BOOKING",
                        "Ngày sử dụng dịch vụ phải nằm trong thời gian lưu trú (từ " + booking.getCheckInDate() + " đến trước " + booking.getCheckOutDate() + ")");
            }
        }

        long unitPrice = service.getUnitPrice();
        long totalPrice;
        try {
            totalPrice = Math.multiplyExact(unitPrice, (long) request.quantity());
        } catch (ArithmeticException ex) {
            throw BusinessException.badRequest("SERVICE_TOTAL_INVALID", "Số lượng dịch vụ vượt quá giới hạn cho phép");
        }

        BookingService bookingService = new BookingService();
        bookingService.setBookingId(booking.getId());
        bookingService.setHomestayId(homestayId);
        bookingService.setRoomId(request.roomId());
        bookingService.setServiceId(service.getId());
        bookingService.setQuantity(request.quantity());
        bookingService.setUnitPrice(unitPrice);
        bookingService.setStatus(BookingService.BookingServiceStatus.REGISTERED);
        bookingService.setServiceDate(request.serviceDate());
        bookingService.setNote(request.note() != null && !request.note().isBlank() ? request.note().trim() : null);
        bookingService.setRequestedBy(booking.getCustomerId() != null ? booking.getCustomerId() : principal.getId());

        BookingService saved = bookingServiceRepository.saveAndFlush(bookingService);
        return ManagerBookingServiceResponse.from(saved, service.getName(), totalPrice);
    }

    /**
     * API-MGR-SVC-06: Hủy dịch vụ hộ khách.
     * Manager có quyền hủy bất kỳ dịch vụ REGISTERED nào trong booking thuộc homestay mình quản lý.
     * Không kiểm tra "ngày quá khứ" như customer – manager có thẩm quyền cao hơn.
     */
    @Transactional
    public ManagerBookingServiceResponse cancelBookingServiceForGuest(
            UserPrincipal principal,
            Long bookingId,
            Long bookingServiceId
    ) {
        Long homestayId = validateAndGetHomestayId(principal);
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> BusinessException.notFound("BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt phòng"));
        if (!homestayId.equals(booking.getHomestayId())) {
            throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Đơn đặt phòng không thuộc cơ sở homestay được giao quản lý");
        }

        if (booking.getStatus() == BookingStatus.CANCELLED
                || booking.getStatus() == BookingStatus.EXPIRED
                || booking.getStatus() == BookingStatus.CHECKED_OUT) {
            throw BusinessException.conflict("SERVICE_CANCELLATION_NOT_ALLOWED", "Không thể hủy dịch vụ sau khi booking kết thúc");
        }

        BookingService bookingService = bookingServiceRepository.findByIdAndBookingIdForUpdate(bookingServiceId, booking.getId())
                .orElseThrow(() -> BusinessException.notFound("SERVICE_LINE_NOT_FOUND", "Không tìm thấy dòng dịch vụ cần hủy"));

        if (bookingService.getStatus() == BookingService.BookingServiceStatus.USED) {
            throw BusinessException.conflict("SERVICE_ALREADY_USED", "Dịch vụ đã được sử dụng, không thể hủy");
        }
        if (bookingService.getStatus() == BookingService.BookingServiceStatus.CANCELLED) {
            throw BusinessException.conflict("SERVICE_ALREADY_CANCELLED", "Dịch vụ này đã được hủy trước đó");
        }

        bookingService.setStatus(BookingService.BookingServiceStatus.CANCELLED);
        BookingService saved = bookingServiceRepository.saveAndFlush(bookingService);

        String serviceName = serviceRepository.findById(saved.getServiceId())
                .map(Service::getName)
                .orElse("Dịch vụ không còn trong danh mục");
        long totalPrice = Math.multiplyExact(saved.getUnitPrice(), saved.getQuantity().longValue());
        return ManagerBookingServiceResponse.from(saved, serviceName, totalPrice);
    }

    /**
     * API-MGR-BOOK-04: Điều chỉnh booking (ngày nhận/trả, số khách hoặc phòng) khi booking còn đủ điều kiện theo chính sách.
     * Backend kiểm tra khả dụng theo đêm và tính lại giá/cọc trong cùng transaction.
     */
    @Transactional
    public ManagerAdjustBookingResponse adjustBooking(UserPrincipal principal, Long bookingId, ManagerAdjustBookingRequest request) {
        Long homestayId = validateAndGetHomestayId(principal);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> BusinessException.notFound("BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt phòng"));

        if (!booking.getHomestayId().equals(homestayId)) {
            throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Đơn đặt phòng không thuộc cơ sở homestay được giao quản lý");
        }

        if (!principal.getId().equals(booking.getCreatedBy())) {
            throw BusinessException.forbidden(
                    "BOOKING_NOT_MANAGER_CREATED",
                    "Quản lý chỉ được điều chỉnh đơn đặt phòng do chính mình tạo hộ");
        }

        // 1. Kiểm tra trạng thái booking
        if (booking.getStatus() != BookingStatus.PENDING_DEPOSIT
                && booking.getStatus() != BookingStatus.PENDING_APPROVAL
                && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw BusinessException.conflict("BOOKING_STATE_CONFLICT", "Đơn đặt phòng ở trạng thái hiện tại không được phép điều chỉnh");
        }

        LocalDate today = LocalDate.now(BUSINESS_TIME_ZONE);

        if (booking.getStatus() == BookingStatus.PENDING_DEPOSIT) {
            LocalDateTime nowUtc = LocalDateTime.ofInstant(Instant.now(), ZoneOffset.UTC);
            if (booking.getHoldExpiresAt() != null && booking.getHoldExpiresAt().isBefore(nowUtc)) {
                throw BusinessException.conflict("BOOKING_STATE_CONFLICT", "Đơn đặt phòng đã hết thời hạn giữ chỗ");
            }
        } else if (booking.getStatus() == BookingStatus.CONFIRMED) {
            int adjustMinDaysBefore = policySettingRepository
                    .findByPolicyGroupAndPolicyKey("BOOKING", "adjust_min_days_before")
                    .map(ps -> {
                        try {
                            return Integer.parseInt(ps.getPolicyValue().trim());
                        } catch (Exception e) {
                            return 3;
                        }
                    }).orElse(3);

            long daysUntilCheckIn = java.time.temporal.ChronoUnit.DAYS.between(today, booking.getCheckInDate());
            if (daysUntilCheckIn < adjustMinDaysBefore) {
                throw BusinessException.badRequest("ADJUSTMENT_WINDOW_CLOSED",
                        "Chỉ được điều chỉnh đơn nếu còn ít nhất " + adjustMinDaysBefore + " ngày trước ngày nhận phòng");
            }
        }

        // 2. Xác định các giá trị mới
        LocalDate newCheckInDate = request.checkInDate() != null ? request.checkInDate() : booking.getCheckInDate();
        LocalDate newCheckOutDate = request.checkOutDate() != null ? request.checkOutDate() : booking.getCheckOutDate();
        Integer newGuestCount = request.guestCount() != null ? request.guestCount() : (int) booking.getGuestCount();

        List<BookingRoom> currentBookingRooms = bookingRoomRepository.findByBookingId(booking.getId());
        List<Long> currentRoomIds = currentBookingRooms.stream().map(BookingRoom::getRoomId).sorted().toList();

        List<Long> effectiveRoomIds;
        if (request.roomIds() != null) {
            if (request.roomIds().isEmpty()) {
                throw BusinessException.badRequest("BOOKING_POLICY_VIOLATION", "Danh sách phòng không được để trống");
            }
            if (request.roomIds().size() != new HashSet<>(request.roomIds()).size()) {
                throw BusinessException.badRequest("DUPLICATE_ROOM_ID", "Danh sách phòng không được chứa phòng trùng lặp");
            }
            effectiveRoomIds = request.roomIds().stream().sorted().toList();
        } else {
            effectiveRoomIds = currentRoomIds;
        }

        // 3. Kiểm tra ngày nhận/trả & chính sách
        if (newCheckInDate == null || newCheckOutDate == null || !newCheckOutDate.isAfter(newCheckInDate)) {
            throw BusinessException.badRequest("INVALID_DATE_RANGE", "Ngày trả phòng phải sau ngày nhận phòng");
        }
        if (newCheckInDate.isBefore(today)) {
            throw BusinessException.badRequest("INVALID_DATE_RANGE", "Ngày nhận phòng không được ở trong quá khứ");
        }

        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            int adjustMinDaysBefore = policySettingRepository
                    .findByPolicyGroupAndPolicyKey("BOOKING", "adjust_min_days_before")
                    .map(ps -> {
                        try {
                            return Integer.parseInt(ps.getPolicyValue().trim());
                        } catch (Exception e) {
                            return 3;
                        }
                    }).orElse(3);
            long daysUntilNewCheckIn = java.time.temporal.ChronoUnit.DAYS.between(today, newCheckInDate);
            if (daysUntilNewCheckIn < adjustMinDaysBefore) {
                throw BusinessException.badRequest("ADJUSTMENT_WINDOW_CLOSED",
                        "Ngày nhận phòng mới phải cách ngày hiện tại ít nhất " + adjustMinDaysBefore + " ngày");
            }
        }

        BookingPolicy policy = loadPolicy(newCheckInDate, newCheckOutDate);

        // 4. Khóa các phòng theo thứ tự ID để chống deadlock
        List<Room> rooms = roomRepository.findAllByIdInForUpdate(effectiveRoomIds);
        if (rooms.size() != effectiveRoomIds.size()) {
            throw BusinessException.badRequest("ROOM_NOT_AVAILABLE", "Một hoặc nhiều phòng không tồn tại hoặc không hợp lệ");
        }

        int totalCapacity = 0;
        for (Room room : rooms) {
            if (!homestayId.equals(room.getHomestayId())) {
                throw BusinessException.badRequest("ROOM_NOT_AVAILABLE", "Phòng không thuộc cơ sở homestay của đơn đặt phòng");
            }
            if (room.getStatus() != RoomStatus.ACTIVE) {
                throw BusinessException.conflict("ROOM_LOCKED", "Một hoặc nhiều phòng hiện không nhận đặt");
            }
            totalCapacity += Byte.toUnsignedInt(room.getMaxGuests());
        }
        if (newGuestCount > totalCapacity) {
            throw BusinessException.badRequest("ROOM_CAPACITY_EXCEEDED", "Số khách vượt quá tổng sức chứa của các phòng đã chọn");
        }

        // 5. Kiểm tra phòng trống theo đêm (loại trừ chính booking hiện tại)
        List<Object[]> conflicts = bookingRoomNightRepository.findExistingNightsExcludingBooking(
                effectiveRoomIds, newCheckInDate, newCheckOutDate, booking.getId());
        if (!conflicts.isEmpty()) {
            throw BusinessException.conflict("ROOM_NOT_AVAILABLE", "Một hoặc nhiều phòng không còn trống trong khoảng thời gian đã chọn");
        }

        // 6. Tính toán lại giá từng đêm
        List<BookingRoomNight> newRoomNights = buildRoomNights(homestayId, rooms, newCheckInDate, newCheckOutDate);
        long newTotalPrice = newRoomNights.stream().mapToLong(BookingRoomNight::getNightlyPrice).reduce(0L, Math::addExact);
        if (newTotalPrice <= 0) {
            throw BusinessException.badRequest("PRICE_RECALCULATION_REQUIRED", "Tổng tiền phòng sau khi tính lại phải lớn hơn 0");
        }

        // Quy tắc tiền cọc:
        // - PENDING_APPROVAL hoặc CONFIRMED: Khách đã chuyển cọc rồi -> tiền cọc giữ nguyên giá ban đầu, số tiền còn lại tính lúc checkout
        // - PENDING_DEPOSIT: Khách chưa chuyển cọc -> tính lại cọc theo tổng tiền phòng mới
        long depositAmountToSet;
        if (booking.getStatus() == BookingStatus.CONFIRMED || booking.getStatus() == BookingStatus.PENDING_APPROVAL) {
            depositAmountToSet = booking.getDepositAmount();
        } else {
            depositAmountToSet = BigDecimal.valueOf(newTotalPrice)
                    .multiply(BigDecimal.valueOf(policy.depositPercent()))
                    .divide(BigDecimal.valueOf(100), 0, RoundingMode.CEILING)
                    .longValueExact();
        }

        // 7. Cập nhật booking_room_nights và booking_rooms
        bookingServiceOperations.deleteServicesInvalidatedByAdjustment(booking.getId(),
                Set.copyOf(effectiveRoomIds), newCheckInDate, newCheckOutDate);
        List<BookingRoomNight> oldNights = bookingRoomNightRepository.findByBookingId(booking.getId());
        bookingRoomNightRepository.deleteAll(oldNights);
        bookingRoomNightRepository.flush();

        if (request.roomIds() != null) {
            Set<Long> effectiveIds = Set.copyOf(effectiveRoomIds);
            List<BookingRoom> removable = currentBookingRooms.stream()
                    .filter(br -> !effectiveIds.contains(br.getRoomId()))
                    .toList();
            bookingRoomRepository.deleteAll(removable);
            bookingRoomRepository.flush();
            Set<Long> linkedIds = currentBookingRooms.stream().map(BookingRoom::getRoomId).collect(Collectors.toSet());
            bookingRoomRepository.saveAllAndFlush(rooms.stream()
                    .filter(r -> !linkedIds.contains(r.getId()))
                    .map(r -> new BookingRoom(booking.getId(), homestayId, r.getId()))
                    .toList());
        }

        newRoomNights.forEach(night -> night.setBookingId(booking.getId()));
        try {
            bookingRoomNightRepository.saveAllAndFlush(newRoomNights);
        } catch (DataIntegrityViolationException exception) {
            throw BusinessException.conflict("ROOM_NOT_AVAILABLE", "Phòng vừa được đặt bởi khách khác. Hãy chọn ngày hoặc phòng khác");
        }

        // 8. Cập nhật lý do vào ghi chú nếu có
        if (request.reason() != null && !request.reason().isBlank()) {
            String notePrefix = (booking.getNote() != null && !booking.getNote().isBlank()) ? booking.getNote() + " | " : "";
            String updatedNote = notePrefix + "Điều chỉnh: " + request.reason().trim();
            if (updatedNote.length() > BOOKING_NOTE_MAX_LENGTH) {
                updatedNote = updatedNote.substring(0, BOOKING_NOTE_MAX_LENGTH - 3) + "...";
            }
            booking.setNote(updatedNote);
        }

        // 9. Cập nhật booking
        booking.setCheckInDate(newCheckInDate);
        booking.setCheckOutDate(newCheckOutDate);
        booking.setGuestCount(newGuestCount.shortValue());
        booking.setRoomTotalPrice(newTotalPrice);
        booking.setDepositAmount(depositAmountToSet);
        booking.setPolicySnapshot(serializePolicySnapshot(policy));
        Booking savedBooking = bookingRepository.saveAndFlush(booking);

        OffsetDateTime updatedAtOffset = savedBooking.getUpdatedAt().atOffset(ZoneOffset.UTC)
                .atZoneSameInstant(BUSINESS_TIME_ZONE).toOffsetDateTime();

        return new ManagerAdjustBookingResponse(
                savedBooking.getId(),
                savedBooking.getId(),
                savedBooking.getCode(),
                savedBooking.getStatus(),
                savedBooking.getCheckInDate(),
                savedBooking.getCheckOutDate(),
                (int) savedBooking.getGuestCount(),
                effectiveRoomIds,
                savedBooking.getRoomTotalPrice(),
                savedBooking.getDepositAmount(),
                updatedAtOffset
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

    /**
     * API-MGR-STAY-01: Ghi nhận khách check-in (nhận phòng).
     * Chỉ cho phép đơn đặt phòng ở trạng thái CONFIRMED và thuộc cơ sở homestay quản lý.
     */
    @Transactional
    public CheckInBookingResponse checkIn(UserPrincipal principal, Long bookingId, CheckInBookingRequest request) {
        Long homestayId = validateAndGetHomestayId(principal);

        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> BusinessException.notFound("BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt phòng"));

        if (!homestayId.equals(booking.getHomestayId())) {
            throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Đơn đặt phòng không thuộc cơ sở homestay được giao quản lý");
        }

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw BusinessException.conflict("BOOKING_STATE_CONFLICT", "Chỉ cho phép check-in với đơn đặt phòng ở trạng thái đã xác nhận (CONFIRMED)");
        }

        LocalDateTime now = LocalDateTime.now(clock);
        LocalTime checkInTime = getStayCheckInTime();

        LocalDateTime checkInStart = LocalDateTime.of(booking.getCheckInDate(), checkInTime);

        if (now.isBefore(checkInStart)) {
            throw BusinessException.badRequest("CHECK_IN_TOO_EARLY",
                    "Chưa đến giờ nhận phòng (từ " + checkInTime + " ngày " + booking.getCheckInDate() + "). Không thể thực hiện check-in sớm");
        }
        if (!now.toLocalDate().isBefore(booking.getCheckOutDate())) {
            throw BusinessException.badRequest("CHECK_IN_EXPIRED",
                    "Đơn đặt phòng đã kết thúc kỳ lưu trú (ngày trả phòng: " + booking.getCheckOutDate() + "). Không thể nhận phòng từ ngày trả phòng trở đi");
        }

        if (request != null) {
            if (request.actualGuestCount() != null) {
                if (request.actualGuestCount() <= 0) {
                    throw BusinessException.badRequest("INVALID_GUEST_COUNT", "Số lượng khách thực tế phải lớn hơn 0");
                }
                List<BookingRoom> bookingRooms = bookingRoomRepository.findByBookingId(booking.getId());
                List<Long> roomIds = bookingRooms.stream().map(BookingRoom::getRoomId).toList();
                List<Room> rooms = roomRepository.findAllById(roomIds);
                int totalCapacity = rooms.stream().mapToInt(r -> Byte.toUnsignedInt(r.getMaxGuests())).sum();
                if (request.actualGuestCount() > totalCapacity) {
                    throw BusinessException.badRequest(
                            "ROOM_CAPACITY_EXCEEDED",
                            "Số khách thực tế (" + request.actualGuestCount() + ") vượt quá tổng sức chứa của các phòng trong đơn (" + totalCapacity + " khách)"
                    );
                }
                booking.setGuestCount(request.actualGuestCount().shortValue());
            }

            if (request.note() != null && !request.note().isBlank()) {
                String notePrefix = (booking.getNote() != null && !booking.getNote().isBlank()) ? booking.getNote() + " | " : "";
                String updatedNote = notePrefix + "Check-in: " + request.note().trim();
                if (updatedNote.length() > BOOKING_NOTE_MAX_LENGTH) {
                    updatedNote = updatedNote.substring(0, BOOKING_NOTE_MAX_LENGTH - 3) + "...";
                }
                booking.setNote(updatedNote);
            }
        }

        booking.setStatus(BookingStatus.CHECKED_IN);
        Booking saved = bookingRepository.saveAndFlush(booking);

        return new CheckInBookingResponse(saved.getId(), saved.getStatus());
    }

    /**
     * API-MGR-STAY-02: Check-out trả phòng, phân loại dịch vụ và quyết toán công nợ cuối kỳ.
     */
    @Transactional
    public CheckOutBookingResponse checkOut(UserPrincipal principal, Long bookingId, CheckOutBookingRequest request) {
        Long homestayId = validateAndGetHomestayId(principal);

        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> BusinessException.notFound("BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt phòng"));

        if (!homestayId.equals(booking.getHomestayId())) {
            throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Đơn đặt phòng không thuộc cơ sở homestay được giao quản lý");
        }

        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw BusinessException.conflict("CHECKOUT_NOT_ALLOWED", "Chỉ cho phép check-out với đơn đặt phòng đang ở trạng thái đang lưu trú (CHECKED_IN)");
        }

        LocalDateTime now = LocalDateTime.now(clock);
        LocalTime checkInTime = getStayCheckInTime();
        LocalTime checkOutDeadline = getStayCheckOutDeadline();

        LocalDateTime checkInStart = LocalDateTime.of(booking.getCheckInDate(), checkInTime);
        LocalDateTime checkOutDeadlineDateTime = LocalDateTime.of(booking.getCheckOutDate(), checkOutDeadline);

        if (now.isBefore(checkInStart)) {
            throw BusinessException.conflict("CHECKOUT_NOT_ALLOWED",
                    "Chưa đến thời điểm nhận phòng (từ " + checkInTime + " ngày " + booking.getCheckInDate() + "). Không thể thực hiện check-out");
        }
        if (now.isAfter(checkOutDeadlineDateTime)) {
            throw BusinessException.conflict("CHECKOUT_NOT_ALLOWED",
                    "Đã quá thời hạn trả phòng (hạn trả phòng không muộn hơn " + checkOutDeadline + " ngày " + booking.getCheckOutDate() + "). Không thể thực hiện check-out");
        }

        // 1. Phân loại các dòng booking_services REGISTERED
        List<BookingService> bookingServices = bookingServiceRepository.findByBookingIdOrderByIdAsc(booking.getId());
        List<BookingService> registeredServices = bookingServices.stream()
                .filter(s -> s.getStatus() == BookingService.BookingServiceStatus.REGISTERED)
                .toList();

        List<Long> usedList = request != null && request.usedBookingServiceIds() != null
                ? request.usedBookingServiceIds() : Collections.emptyList();
        List<Long> unusedList = request != null && request.unusedBookingServiceIds() != null
                ? request.unusedBookingServiceIds() : Collections.emptyList();

        Set<Long> usedIds = new HashSet<>(usedList);
        Set<Long> unusedIds = new HashSet<>(unusedList);

        if (usedIds.size() != usedList.size() || unusedIds.size() != unusedList.size()) {
            throw BusinessException.badRequest("SERVICE_USAGE_SELECTION_INCOMPLETE",
                    "Danh sách ID dịch vụ không được chứa giá trị trùng lặp");
        }

        Set<Long> registeredIds = registeredServices.stream()
                .map(BookingService::getId)
                .collect(Collectors.toSet());

        Set<Long> overlap = new HashSet<>(usedIds);
        overlap.retainAll(unusedIds);
        if (!overlap.isEmpty()) {
            throw BusinessException.badRequest("SERVICE_USAGE_SELECTION_INCOMPLETE",
                    "Dịch vụ không thể vừa đánh dấu đã sử dụng vừa hủy: " + overlap);
        }

        Set<Long> combined = new HashSet<>(usedIds);
        combined.addAll(unusedIds);
        if (!combined.equals(registeredIds)) {
            throw BusinessException.badRequest("SERVICE_USAGE_SELECTION_INCOMPLETE",
                    "Mọi dịch vụ đang ở trạng thái REGISTERED phải được phân loại đầy đủ (đã dùng hoặc hủy), không được bỏ sót hoặc khai báo dịch vụ không hợp lệ");
        }

        // Cập nhật trạng thái các dịch vụ
        for (BookingService bs : registeredServices) {
            if (usedIds.contains(bs.getId())) {
                bs.setStatus(BookingService.BookingServiceStatus.USED);
                bs.setRecordedBy(principal.getId());
                bookingServiceRepository.save(bs);
            } else if (unusedIds.contains(bs.getId())) {
                bs.setStatus(BookingService.BookingServiceStatus.CANCELLED);
                bookingServiceRepository.save(bs);
            }
        }
        bookingServiceRepository.flush();

        // 2. Tính toán tài chính (Không tính REFUND vì booking đã CHECKED_IN không thuộc luồng hủy/hoàn cọc)
        long roomTotalPrice = booking.getRoomTotalPrice();
        List<BookingService> allServicesAfterUpdate = bookingServiceRepository.findByBookingIdOrderByIdAsc(booking.getId());
        long serviceTotalPrice = allServicesAfterUpdate.stream()
                .filter(s -> s.getStatus() == BookingService.BookingServiceStatus.USED)
                .mapToLong(s -> (long) s.getUnitPrice() * s.getQuantity())
                .sum();
        long grandTotalPrice = roomTotalPrice + serviceTotalPrice;

        long paidBeforeCheckout = paymentRepository.sumConfirmedAmounts(
                booking.getId(),
                List.of(Payment.PaymentType.DEPOSIT, Payment.PaymentType.PAYMENT),
                Payment.PaymentStatus.CONFIRMED
        );
        long outstandingAmount = Math.max(0L, grandTotalPrice - paidBeforeCheckout);
        long collectedAtCheckout = 0L;

        // 3. Xử lý thanh toán
        if (outstandingAmount > 0) {
            if (request == null || request.payment() == null) {
                throw BusinessException.conflict("OUTSTANDING_BALANCE",
                        "Đơn đặt phòng còn số tiền chưa thanh toán (" + outstandingAmount + " VND). Vui lòng xử lý thanh toán để hoàn tất check-out.");
            }
            CheckOutBookingRequest.PaymentRequest paymentReq = request.payment();
            if (paymentReq.amount() == null || !paymentReq.amount().equals(outstandingAmount)) {
                throw BusinessException.badRequest("PAYMENT_AMOUNT_MISMATCH",
                        "Số tiền thanh toán (" + (paymentReq.amount() == null ? 0 : paymentReq.amount()) + " VND) không khớp với số tiền còn thiếu (" + outstandingAmount + " VND)");
            }
            if (paymentReq.method() == null) {
                throw BusinessException.badRequest("VALIDATION_ERROR", "Phương thức thanh toán không được để trống");
            }
            if (paymentReq.method() != Payment.PaymentMethod.CASH && paymentReq.method() != Payment.PaymentMethod.BANK_TRANSFER) {
                throw BusinessException.badRequest(
                        "PAYMENT_METHOD_NOT_ALLOWED",
                        "Thanh toán phần còn lại khi check-out chỉ hỗ trợ tiền mặt (CASH) hoặc chuyển khoản (BANK_TRANSFER)");
            }

            Instant paymentInstant = Instant.now();
            LocalDateTime nowUtc = LocalDateTime.ofInstant(paymentInstant, ZoneOffset.UTC);
            Payment payment = new Payment();
            payment.setBookingId(booking.getId());
            payment.setHomestayId(booking.getHomestayId());
            payment.setType(Payment.PaymentType.PAYMENT);
            payment.setAmount(outstandingAmount);
            payment.setMethod(paymentReq.method());
            payment.setStatus(Payment.PaymentStatus.CONFIRMED);
            payment.setConfirmedBy(principal.getId());
            payment.setConfirmedAt(nowUtc);
            payment.setCreatedBy(principal.getId());
            if (paymentReq.referenceCode() != null && !paymentReq.referenceCode().isBlank()) {
                payment.setReferenceCode(paymentReq.referenceCode().trim());
            } else if (paymentReq.method() == Payment.PaymentMethod.BANK_TRANSFER) {
                payment.setReferenceCode(booking.getCode() + " CHECKOUT");
            }
            payment.setNote(paymentReq.note() != null && !paymentReq.note().isBlank() ? paymentReq.note().trim() : "Thu phần còn lại khi checkout");
            paymentRepository.saveAndFlush(payment);

            collectedAtCheckout = outstandingAmount;
            outstandingAmount = 0L;
        } else {
            // outstandingAmount == 0: Không phát sinh thanh toán, trường payment phải là null
            if (request != null && request.payment() != null) {
                if (request.payment().amount() != null && request.payment().amount() > 0) {
                    throw BusinessException.badRequest("PAYMENT_AMOUNT_MISMATCH",
                            "Đơn đặt phòng đã thanh toán đủ, số tiền cần thanh toán là 0 VND");
                }
                throw BusinessException.badRequest("PAYMENT_AMOUNT_MISMATCH",
                        "Đơn đặt phòng đã thanh toán đủ công nợ, không được gửi thông tin thanh toán (payment phải là null)");
            }
        }

        long totalCollected = paidBeforeCheckout + collectedAtCheckout;

        // 4. Cập nhật booking sang CHECKED_OUT
        booking.setStatus(BookingStatus.CHECKED_OUT);
        if (request != null && request.note() != null && !request.note().isBlank()) {
            String notePrefix = (booking.getNote() != null && !booking.getNote().isBlank()) ? booking.getNote() + " | " : "";
            String updatedNote = notePrefix + "Check-out: " + request.note().trim();
            if (updatedNote.length() > BOOKING_NOTE_MAX_LENGTH) {
                updatedNote = updatedNote.substring(0, BOOKING_NOTE_MAX_LENGTH - 3) + "...";
            }
            booking.setNote(updatedNote);
        }
        Booking saved = bookingRepository.saveAndFlush(booking);

        return new CheckOutBookingResponse(
                saved.getId(),
                saved.getStatus(),
                roomTotalPrice,
                serviceTotalPrice,
                grandTotalPrice,
                paidBeforeCheckout,
                collectedAtCheckout,
                totalCollected,
                outstandingAmount
        );
    }

    /**
     * API-MGR-BOOK-07: Xem cân đối tài chính và công nợ booking phục vụ check-out và quản lý lưu trú.
     */
    @Transactional(readOnly = true)
    public BookingBalanceResponse getBookingBalance(UserPrincipal principal, Long bookingId) {
        Long homestayId = validateAndGetHomestayId(principal);
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> BusinessException.notFound("BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt phòng"));

        if (!homestayId.equals(booking.getHomestayId())) {
            throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Đơn đặt phòng không thuộc cơ sở homestay được giao quản lý");
        }

        long roomTotalPrice = booking.getRoomTotalPrice();
        List<BookingService> services = bookingServiceRepository.findByBookingIdOrderByIdAsc(booking.getId());
        long serviceTotalPrice = services.stream()
                .filter(s -> s.getStatus() == BookingService.BookingServiceStatus.USED)
                .mapToLong(s -> (long) s.getUnitPrice() * s.getQuantity())
                .sum();

        // số tiền khách đã cọc
        long paidAmount = paymentRepository.sumConfirmedAmounts(
                booking.getId(),
                List.of(Payment.PaymentType.DEPOSIT, Payment.PaymentType.PAYMENT),
                Payment.PaymentStatus.CONFIRMED
        );

        // số tiền đã hoàn cho khách
        long refundedAmount = paymentRepository.sumConfirmedDeposits(
                booking.getId(),
                Payment.PaymentType.REFUND,
                Payment.PaymentStatus.CONFIRMED
        );

        Long grandTotalPrice;
        Long outstandingAmount;
        Long refundPendingAmount;

        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.EXPIRED) {
            grandTotalPrice = null;
            outstandingAmount = null;
            if (booking.getStatus() == BookingStatus.CANCELLED) {
                long committedRefund = booking.getRefundAmount() != null ? booking.getRefundAmount() : 0L;
                // số tiền refund cho khách còn thiếu
                refundPendingAmount = Math.max(0L, committedRefund - refundedAmount);
            } else {
                refundPendingAmount = null;
            }
        } else {
            grandTotalPrice = roomTotalPrice + serviceTotalPrice;
            long netPaid = paidAmount - refundedAmount;
            outstandingAmount = Math.max(0L, grandTotalPrice - netPaid);
            refundPendingAmount = 0L;
        }

        return new BookingBalanceResponse(
                roomTotalPrice,
                serviceTotalPrice,
                grandTotalPrice,
                paidAmount,
                refundedAmount,
                outstandingAmount,
                refundPendingAmount
        );
    }

    private String generateBookingCode(LocalDate checkInDate) {
        String datePart = checkInDate.format(DateTimeFormatter.ofPattern("yyMMdd"));
        return "HS-" + datePart + "-" + UUID.randomUUID().toString().replace("-", "")
                .substring(0, 6).toUpperCase();
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String normalizeAccountHolder(String holder) {
        if (holder == null) {
            return null;
        }
        String nfdNormalized = Normalizer.normalize(holder.trim(), Normalizer.Form.NFD);
        String withoutDiacritics = nfdNormalized.replaceAll("\\p{M}", "");
        String replacedD = withoutDiacritics.replace('Đ', 'D').replace('đ', 'd');
        return replacedD.replaceAll("\\s+", " ").trim().toUpperCase(Locale.ROOT);
    }

    private record BookingPolicy(int minNights, int maxNights, int maxAdvanceDays,
                                 int depositPercent, int holdHours) {}
}
