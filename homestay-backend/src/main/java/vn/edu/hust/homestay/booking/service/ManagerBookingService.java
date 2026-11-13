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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.auth.entity.User;
import vn.edu.hust.homestay.auth.repository.UserRepository;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.booking.dto.ManagerAdjustBookingRequest;
import vn.edu.hust.homestay.booking.dto.ManagerAdjustBookingResponse;
import vn.edu.hust.homestay.booking.dto.ManagerBookingDetailResponse;
import vn.edu.hust.homestay.booking.dto.ManagerBookingSummaryResponse;
import vn.edu.hust.homestay.booking.dto.ManagerBookingSummaryResponse.BookingRoomSummary;
import vn.edu.hust.homestay.booking.dto.ManagerCreateBookingRequest;
import vn.edu.hust.homestay.booking.dto.ManagerCreateBookingResponse;
import vn.edu.hust.homestay.booking.dto.DepositReviewRequest;
import vn.edu.hust.homestay.booking.dto.DepositReviewResponse;
import vn.edu.hust.homestay.booking.dto.ManagerRecordDepositRequest;
import vn.edu.hust.homestay.booking.dto.ManagerRecordDepositResponse;
import vn.edu.hust.homestay.booking.dto.ManagerCancelBookingRequest;
import vn.edu.hust.homestay.booking.dto.ManagerCancelBookingResponse;
import vn.edu.hust.homestay.booking.dto.CustomerDepositProof;
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
import vn.edu.hust.homestay.payment.entity.Payment;
import vn.edu.hust.homestay.payment.repository.PaymentRepository;
import vn.edu.hust.homestay.pricing.entity.PriceRule;
import vn.edu.hust.homestay.pricing.repository.PriceRuleRepository;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;
import vn.edu.hust.homestay.room.entity.RoomType;
import vn.edu.hust.homestay.room.repository.RoomRepository;
import vn.edu.hust.homestay.room.repository.RoomTypeRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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
 * - API-MGR-BOOK-03: Chi tiết booking
 * - API-MGR-BOOK-04: Điều chỉnh booking
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
    private final PaymentRepository paymentRepository;
    private final CancellationRefundPolicyService cancellationRefundPolicyService;
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
        this.privateUploadRoot = Paths.get(privateUploadDir).toAbsolutePath().normalize();
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
            OffsetDateTime holdExpiresAt = b.getHoldExpiresAt() == null ? null :  // giờ chuẩn quốc tế
                    b.getHoldExpiresAt().atOffset(ZoneOffset.UTC)
                            .atZoneSameInstant(BUSINESS_TIME_ZONE).toOffsetDateTime(); // chuyển sang giờ VN

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
                                booking.getId(), List.of(Payment.PaymentType.DEPOSIT, Payment.PaymentType.REFUND))
                        .stream()
                        .map(payment -> new ManagerBookingDetailResponse.PaymentSummary(
                                payment.getId(), payment.getType().name(), payment.getAmount(), payment.getStatus().name(),
                                payment.getMethod().name(), payment.getReferenceCode(), payment.getRejectionReason(),
                                payment.getCreatedAt() == null ? null : payment.getCreatedAt().toInstant(ZoneOffset.UTC),
                                payment.getConfirmedAt() == null ? null : payment.getConfirmedAt().toInstant(ZoneOffset.UTC),
                                payment.getProofUrl() != null, managerProofMimeType(payment.getProofUrl()), payment.getNote()))
                        .toList(),
                List.of()
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
        bookingRepository.saveAndFlush(booking);
        bookingRoomNightRepository.deleteAllByBookingIdIn(List.of(booking.getId()));

        if (refundAmount > 0) {
            Payment refund = new Payment();
            refund.setBookingId(booking.getId());
            refund.setHomestayId(homestayId);
            refund.setType(Payment.PaymentType.REFUND);
            refund.setAmount(refundAmount);
            refund.setMethod(Payment.PaymentMethod.BANK_TRANSFER);
            refund.setStatus(Payment.PaymentStatus.PENDING);
            refund.setNote("Hoàn tiền theo chính sách hủy booking");
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
        List<BookingRoomNight> oldNights = bookingRoomNightRepository.findByBookingId(booking.getId());
        bookingRoomNightRepository.deleteAll(oldNights);
        bookingRoomNightRepository.flush();

        if (request.roomIds() != null) {
            bookingRoomRepository.deleteAll(currentBookingRooms);
            bookingRoomRepository.flush();
            bookingRoomRepository.saveAllAndFlush(rooms.stream()
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
            if (updatedNote.length() > 500) {
                updatedNote = updatedNote.substring(0, 497) + "...";
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
