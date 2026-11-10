package vn.edu.hust.homestay.booking.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.booking.dto.CreateBookingRequest;
import vn.edu.hust.homestay.booking.dto.CreateBookingResponse;
import vn.edu.hust.homestay.booking.dto.DepositSubmissionResponse;
import vn.edu.hust.homestay.booking.dto.CustomerDepositProof;
import vn.edu.hust.homestay.booking.dto.CancelBookingResponse;
import vn.edu.hust.homestay.booking.dto.CustomerAdjustBookingRequest;
import vn.edu.hust.homestay.booking.dto.CustomerAdjustBookingResponse;
import vn.edu.hust.homestay.booking.dto.CustomerBookingDetailResponse;
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
import vn.edu.hust.homestay.payment.entity.Payment;
import vn.edu.hust.homestay.payment.repository.PaymentRepository;
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
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.temporal.ChronoUnit;
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

    private static final Logger log = LoggerFactory.getLogger(CustomerBookingService.class);
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
    private final PaymentRepository paymentRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Path privateUploadRoot;

    public CustomerBookingService(
            BookingRepository bookingRepository,
            BookingRoomRepository bookingRoomRepository,
            BookingRoomNightRepository bookingRoomNightRepository,
            HomestayRepository homestayRepository,
            RoomRepository roomRepository,
            PriceRuleRepository priceRuleRepository,
            PolicySettingRepository policySettingRepository,
            MediaRepository mediaRepository,
            PaymentRepository paymentRepository,
            @Value("${app.storage.private-upload-dir:storage/private}") String privateUploadDir
    ) {
        this.bookingRepository = bookingRepository;
        this.bookingRoomRepository = bookingRoomRepository;
        this.bookingRoomNightRepository = bookingRoomNightRepository;
        this.homestayRepository = homestayRepository;
        this.roomRepository = roomRepository;
        this.priceRuleRepository = priceRuleRepository;
        this.policySettingRepository = policySettingRepository;
        this.mediaRepository = mediaRepository;
        this.paymentRepository = paymentRepository;
        this.privateUploadRoot = Paths.get(privateUploadDir).toAbsolutePath().normalize();
    }

    @Transactional
    public DepositSubmissionResponse submitDeposit(UserPrincipal principal, Long bookingId, Long amount,
                                                    String method, String referenceCode, MultipartFile proofFile) {
        boolean exists = bookingRepository.existsById(bookingId);
        Booking booking = bookingRepository.findByIdAndCustomerIdForUpdate(bookingId, principal.getId())
                .orElseThrow(() -> exists
                        ? BusinessException.forbidden("BOOKING_NOT_OWNED", "Đây không phải đơn đặt phòng của bạn")
                        : BusinessException.notFound("BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt phòng"));

        if (booking.getStatus() != BookingStatus.PENDING_DEPOSIT
                || booking.getHoldExpiresAt() == null
                || !booking.getHoldExpiresAt().isAfter(LocalDateTime.now(BUSINESS_TIME_ZONE))) {
            throw BusinessException.conflict("BOOKING_STATE_CONFLICT", "Đơn đặt phòng không còn trong thời hạn nhận chứng từ đặt cọc");
        }
        if (amount == null || amount <= 0) {
            throw BusinessException.badRequest("DEPOSIT_AMOUNT_INVALID", "Số tiền đặt cọc phải lớn hơn 0");
        }
        if (!"BANK_TRANSFER".equalsIgnoreCase(method == null ? "" : method.trim())) {
            throw BusinessException.badRequest("VALIDATION_ERROR", "Phương thức đặt cọc phải là BANK_TRANSFER");
        }
        String normalizedReference = referenceCode == null ? "" : referenceCode.trim();
        if (normalizedReference.isEmpty() || normalizedReference.length() > 100) {
            throw BusinessException.badRequest("VALIDATION_ERROR", "Mã tham chiếu bắt buộc và không vượt quá 100 ký tự");
        }
        if (proofFile == null || proofFile.isEmpty()) {
            throw BusinessException.badRequest("UNSUPPORTED_MEDIA_TYPE", "Vui lòng tải lên chứng từ chuyển khoản");
        }
        if (proofFile.getSize() > 5L * 1024 * 1024) {
            throw new BusinessException("FILE_TOO_LARGE", "Tệp chứng từ không được vượt quá 5 MB", HttpStatus.PAYLOAD_TOO_LARGE);
        }

        byte[] bytes;
        try {
            bytes = proofFile.getBytes();
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to read deposit proof", exception);
        }
        DetectedProof proof = detectProof(bytes);
        String filename = UUID.randomUUID() + proof.extension();
        Path categoryRoot = privateUploadRoot.resolve("payments").normalize();
        Path target = categoryRoot.resolve(filename).normalize();
        if (!categoryRoot.startsWith(privateUploadRoot) || !target.startsWith(categoryRoot)) {
            throw new IllegalStateException("Generated proof path escaped private upload directory");
        }

        try {
            Files.createDirectories(categoryRoot);
            Files.write(target, bytes);
        } catch (IOException exception) {
            deleteQuietly(target);
            throw new IllegalStateException("Unable to store deposit proof", exception);
        }
        cleanupUploadIfTransactionRollsBack(target);

        Payment payment = new Payment();
        payment.setBookingId(booking.getId());
        payment.setHomestayId(booking.getHomestayId());
        payment.setType(Payment.PaymentType.DEPOSIT);
        payment.setAmount(amount);
        payment.setMethod(Payment.PaymentMethod.BANK_TRANSFER);
        payment.setStatus(Payment.PaymentStatus.PENDING);
        payment.setReferenceCode(normalizedReference);
        // Lưu relative key riêng tư; không để lộ URL /files công khai cho chứng từ tài chính.
        payment.setProofUrl("payments/" + filename);
        payment.setCreatedBy(principal.getId());
        Payment saved = paymentRepository.saveAndFlush(payment);

        booking.setStatus(BookingStatus.PENDING_APPROVAL);
        bookingRepository.save(booking);
        return new DepositSubmissionResponse(saved.getId(), booking.getId(), saved.getType(), saved.getAmount(),
                saved.getStatus(), booking.getStatus());
    }

    private DetectedProof detectProof(byte[] bytes) {
        if (bytes.length >= 3 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8 && (bytes[2] & 0xff) == 0xff)
            return new DetectedProof(".jpg");
        if (bytes.length >= 8 && (bytes[0] & 0xff) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4e && bytes[3] == 0x47
                && bytes[4] == 0x0d && bytes[5] == 0x0a && bytes[6] == 0x1a && bytes[7] == 0x0a)
            return new DetectedProof(".png");
        if (bytes.length >= 12 && new String(bytes, 0, 4, StandardCharsets.US_ASCII).equals("RIFF")
                && new String(bytes, 8, 4, StandardCharsets.US_ASCII).equals("WEBP"))
            return new DetectedProof(".webp");
        if (bytes.length >= 5 && new String(bytes, 0, 5, StandardCharsets.US_ASCII).equals("%PDF-"))
            return new DetectedProof(".pdf");
        throw new BusinessException("UNSUPPORTED_MEDIA_TYPE", "Chỉ chấp nhận chứng từ JPG, PNG, WEBP hoặc PDF", HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    private void cleanupUploadIfTransactionRollsBack(Path target) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) deleteQuietly(target);
            }
        });
    }

    private void deleteQuietly(Path path) {
        try {
            Files.deleteIfExists(path);
        } catch (IOException exception) {
            log.warn("Could not delete private deposit proof file {}", path, exception);
        }
    }

    private record DetectedProof(String extension) {}

    @Transactional
    public CancelBookingResponse cancelBooking(UserPrincipal principal, Long bookingId, String reason) {
        boolean bookingExists = bookingRepository.existsById(bookingId);
        Booking booking = bookingRepository.findByIdAndCustomerIdForUpdate(bookingId, principal.getId())
                .orElseThrow(() -> bookingExists
                        ? BusinessException.forbidden("BOOKING_NOT_OWNED", "Đây không phải đơn đặt phòng của bạn")
                        : BusinessException.notFound("BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt phòng"));

        if (booking.getStatus() != BookingStatus.PENDING_DEPOSIT
                && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw BusinessException.conflict("CANCELLATION_NOT_ALLOWED", "Đơn đặt phòng ở trạng thái hiện tại không thể hủy");
        }

        int refundPercent = resolveRefundPercent(booking);
        // Khách chỉ được hủy trước kỳ lưu trú; thanh toán còn lại thu lúc checkout và không hoàn tiền ở đây.
        long paidAmount = paymentRepository.sumConfirmedDeposits(
                booking.getId(), Payment.PaymentType.DEPOSIT, Payment.PaymentStatus.CONFIRMED);
        long refundAmount = BigDecimal.valueOf(paidAmount)
                .multiply(BigDecimal.valueOf(refundPercent))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                .longValueExact();

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(Instant.now());
        booking.setCancelledBy(principal.getId());
        booking.setCancelReason(normalize(reason));
        booking.setRefundAmount(refundAmount);
        bookingRepository.saveAndFlush(booking);
        bookingRoomNightRepository.deleteAllByBookingIdIn(List.of(booking.getId()));

        if (refundAmount > 0) {
            Payment refund = new Payment();
            refund.setBookingId(booking.getId());
            refund.setHomestayId(booking.getHomestayId());
            refund.setType(Payment.PaymentType.REFUND);
            refund.setAmount(refundAmount);
            refund.setMethod(Payment.PaymentMethod.BANK_TRANSFER);
            refund.setStatus(Payment.PaymentStatus.PENDING);
            refund.setNote("Hoàn tiền theo chính sách hủy booking");
            refund.setCreatedBy(principal.getId());
            paymentRepository.save(refund);
        }

        return new CancelBookingResponse(booking.getId(), booking.getStatus(), refundAmount);
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
    public CustomerBookingDetailResponse getBookingDetail(UserPrincipal principal, Long bookingId) {
        // Kiểm tra booking thuộc về khách hàng đang đăng nhập
        boolean bookingExists = bookingRepository.existsById(bookingId);
        Booking booking = bookingRepository.findByIdAndCustomerId(bookingId, principal.getId())
                .orElseThrow(() -> bookingExists
                        ? BusinessException.forbidden("BOOKING_NOT_OWNED", "Đây không phải đơn đặt phòng của bạn")
                        : BusinessException.notFound("BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt phòng"));

        Homestay homestay = homestayRepository.findById(booking.getHomestayId()).orElse(null);

        // Lấy các phòng trong booking
        List<BookingRoom> bRooms = bookingRoomRepository.findByBookingId(booking.getId());
        Set<Long> roomIds = bRooms.stream().map(BookingRoom::getRoomId).collect(Collectors.toSet());
        Map<Long, Room> roomMap = roomIds.isEmpty() ? Map.of() :
                roomRepository.findAllById(roomIds).stream().collect(Collectors.toMap(Room::getId, r -> r));
        Map<Long, Media> roomCovers = roomIds.isEmpty() ? Map.of() :
                mediaRepository.findByOwnerTypeAndOwnerIdInOrderBySortOrderAsc(Media.OwnerType.ROOM, roomIds).stream()
                        .collect(Collectors.toMap(Media::getOwnerId, m -> m, (first, second) -> first));

        // Lấy các đêm lưu trú, nhóm theo phòng
        List<BookingRoomNight> allNights = bookingRoomNightRepository
                .findByBookingIdOrderByIdRoomIdAscIdStayDateAsc(booking.getId());
        Map<Long, List<BookingRoomNight>> nightsByRoomId = allNights.stream()
                .collect(Collectors.groupingBy(n -> n.getId().getRoomId()));

        List<CustomerBookingDetailResponse.BookingRoomDetail> roomDetails = bRooms.stream().map(br -> {
            Room room = roomMap.get(br.getRoomId());
            Media cover = room != null ? roomCovers.get(room.getId()) : null;
            List<CustomerBookingDetailResponse.RoomNightDetail> nights =
                    nightsByRoomId.getOrDefault(br.getRoomId(), List.of()).stream()
                            .map(n -> new CustomerBookingDetailResponse.RoomNightDetail(
                                    n.getId().getStayDate(), n.getNightlyPrice(), n.getAppliedRuleNameSnapshot()))
                            .toList();
            return new CustomerBookingDetailResponse.BookingRoomDetail(
                    br.getRoomId(),
                    room != null ? room.getName() : "Phòng #" + br.getRoomId(),
                    cover != null ? cover.getUrl() : null,
                    nights
            );
        }).toList();

        // Hướng dẫn thanh toán chỉ hiển thị khi trạng thái PENDING_DEPOSIT
        CreateBookingResponse.PaymentInstruction instruction = null;
        if (booking.getStatus() == BookingStatus.PENDING_DEPOSIT) {
            Map<String, String> bankData = policySettingRepository
                    .findByPolicyGroupAndPolicyKeyIn("PAYMENT", BANK_POLICY_KEYS).stream()
                    .collect(Collectors.toMap(PolicySetting::getPolicyKey, PolicySetting::getPolicyValue));
            if (!bankData.isEmpty()) {
                instruction = new CreateBookingResponse.PaymentInstruction(
                        bankData.get("bank_name"),
                        bankData.get("bank_account_number"),
                        bankData.get("bank_account_holder"),
                        booking.getCode() + " DAT COC"
                );
            }
        }

        //TODO fix khi làm api quản lý duyệt cọc
        // paidAmount = 0 cho đến khi module Payment (API-PAY-01+) được triển khai
        long paidAmount = 0L;
        long outstandingAmount = Math.max(0L, booking.getRoomTotalPrice() - paidAmount);

        OffsetDateTime holdExpiresAt = booking.getHoldExpiresAt() == null ? null :
                booking.getHoldExpiresAt().atOffset(ZoneOffset.UTC)
                        .atZoneSameInstant(BUSINESS_TIME_ZONE).toOffsetDateTime();

        CustomerBookingDetailResponse.DepositSubmissionDetail latestDepositSubmission =
                paymentRepository.findTopByBookingIdAndTypeOrderByCreatedAtDesc(
                                booking.getId(), Payment.PaymentType.DEPOSIT)
                        .map(payment -> new CustomerBookingDetailResponse.DepositSubmissionDetail(
                                payment.getId(), payment.getAmount(), payment.getMethod(), payment.getStatus(),
                                payment.getReferenceCode(), payment.getCreatedAt(), payment.getProofUrl() != null,
                                mediaTypeForProof(payment.getProofUrl())))
                        .orElse(null);

        return new CustomerBookingDetailResponse(
                booking.getId(),
                booking.getCode(),
                booking.getHomestayId(),
                homestay != null ? homestay.getName() : null,
                homestay != null ? homestay.getProvince() : null,
                homestay != null ? homestay.getAddress() : null,
                booking.getStatus(),
                booking.getCheckInDate(),
                booking.getCheckOutDate(),
                booking.getGuestCount(),
                booking.getNote(),
                booking.getRoomTotalPrice(),
                booking.getDepositAmount(),
                paidAmount,
                outstandingAmount,
                holdExpiresAt,
                booking.getCreatedAt(),
                roomDetails,
                instruction,
                latestDepositSubmission
        );
    }

    @Transactional(readOnly = true)
    public CustomerDepositProof getLatestDepositProof(UserPrincipal principal, Long bookingId) {
        boolean bookingExists = bookingRepository.existsById(bookingId);
        Booking booking = bookingRepository.findByIdAndCustomerId(bookingId, principal.getId())
                .orElseThrow(() -> bookingExists
                        ? BusinessException.forbidden("BOOKING_NOT_OWNED", "Đây không phải đơn đặt phòng của bạn")
                        : BusinessException.notFound("BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt phòng"));
        Payment payment = paymentRepository.findTopByBookingIdAndTypeOrderByCreatedAtDesc(
                        booking.getId(), Payment.PaymentType.DEPOSIT)
                .orElseThrow(() -> BusinessException.notFound("DEPOSIT_PROOF_NOT_FOUND", "Booking chưa có chứng từ đặt cọc"));

        String storedKey = payment.getProofUrl();
        if (storedKey == null || !storedKey.matches("payments/[0-9a-fA-F-]{36}\\.(jpg|png|webp|pdf)")) {
            throw BusinessException.notFound("DEPOSIT_PROOF_NOT_FOUND", "Không tìm thấy chứng từ đặt cọc");
        }
        Path proofPath = privateUploadRoot.resolve(storedKey).normalize();
        if (!proofPath.startsWith(privateUploadRoot) || !Files.isRegularFile(proofPath)) {
            throw BusinessException.notFound("DEPOSIT_PROOF_NOT_FOUND", "Không tìm thấy chứng từ đặt cọc");
        }

        String extension = storedKey.substring(storedKey.lastIndexOf('.') + 1);
        MediaType mediaType = switch (extension) {
            case "jpg" -> MediaType.IMAGE_JPEG;
            case "png" -> MediaType.IMAGE_PNG;
            case "webp" -> MediaType.parseMediaType("image/webp");
            case "pdf" -> MediaType.APPLICATION_PDF;
            default -> MediaType.APPLICATION_OCTET_STREAM;
        };
        String filename = "deposit-proof-" + payment.getId() + "." + extension;
        Resource resource = new FileSystemResource(proofPath);
        return new CustomerDepositProof(resource, mediaType, filename);
    }

    private String mediaTypeForProof(String storedKey) {
        if (storedKey == null) return null;
        return switch (storedKey.substring(storedKey.lastIndexOf('.') + 1).toLowerCase(java.util.Locale.ROOT)) {
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            case "webp" -> "image/webp";
            case "pdf" -> "application/pdf";
            default -> null;
        };
    }

    @Transactional
    public CustomerAdjustBookingResponse adjustBooking(UserPrincipal principal, Long bookingId, CustomerAdjustBookingRequest request) {
        boolean bookingExists = bookingRepository.existsById(bookingId);
        Booking booking = bookingRepository.findByIdAndCustomerId(bookingId, principal.getId())
                .orElseThrow(() -> bookingExists
                        ? BusinessException.forbidden("BOOKING_NOT_OWNED", "Đây không phải đơn đặt phòng của bạn")
                        : BusinessException.notFound("BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt phòng"));

        // 1. Kiểm tra trạng thái
        if (booking.getStatus() == BookingStatus.PENDING_APPROVAL) {
            throw BusinessException.conflict("BOOKING_STATE_CONFLICT", "Không thể điều chỉnh đơn đang chờ quản lý duyệt đặt cọc");
        }
        if (booking.getStatus() != BookingStatus.PENDING_DEPOSIT && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw BusinessException.conflict("BOOKING_STATE_CONFLICT", "Đơn đặt phòng ở trạng thái hiện tại không được phép điều chỉnh");
        }

        LocalDate today = LocalDate.now(BUSINESS_TIME_ZONE);
        Integer adjustMinDaysBefore = null;

        if (booking.getStatus() == BookingStatus.PENDING_DEPOSIT) {
            LocalDateTime nowUtc = LocalDateTime.ofInstant(Instant.now(), ZoneOffset.UTC);
            if (booking.getHoldExpiresAt() != null && booking.getHoldExpiresAt().isBefore(nowUtc)) {
                throw BusinessException.conflict("BOOKING_STATE_CONFLICT", "Đơn đặt phòng đã hết thời hạn giữ chỗ");
            }
        } else if (booking.getStatus() == BookingStatus.CONFIRMED) {
            adjustMinDaysBefore = getAdjustMinDaysBefore();
            long daysUntilCheckIn = ChronoUnit.DAYS.between(today, booking.getCheckInDate());
            if (daysUntilCheckIn < adjustMinDaysBefore) {
                throw BusinessException.badRequest("ADJUSTMENT_WINDOW_CLOSED",
                        "Chỉ được điều chỉnh đơn nếu còn ít nhất " + adjustMinDaysBefore + " ngày trước ngày nhận phòng");
            }
        }

        // 2. Xác định giá trị mới
        LocalDate newCheckInDate = request.getCheckInDate() != null ? request.getCheckInDate() : booking.getCheckInDate();
        LocalDate newCheckOutDate = request.getCheckOutDate() != null ? request.getCheckOutDate() : booking.getCheckOutDate();
        Integer newGuestCount = request.getGuestCount() != null ? request.getGuestCount() : (int) booking.getGuestCount();

        List<BookingRoom> currentBookingRooms = bookingRoomRepository.findByBookingId(booking.getId());
        List<Long> currentRoomIds = currentBookingRooms.stream().map(BookingRoom::getRoomId).sorted().toList();

        List<Long> effectiveRoomIds;
        if (request.getRoomIds() != null) {
            if (request.getRoomIds().isEmpty()) {
                throw BusinessException.badRequest("BOOKING_POLICY_VIOLATION", "Danh sách phòng không được để trống");
            }
            if (request.getRoomIds().size() != new HashSet<>(request.getRoomIds()).size()) {
                throw BusinessException.badRequest("DUPLICATE_ROOM_ID", "Danh sách phòng không được chứa phòng trùng lặp");
            }
            effectiveRoomIds = request.getRoomIds().stream().sorted().toList();
        } else {
            effectiveRoomIds = currentRoomIds;
        }

        // 3. Kiểm tra ngày & chính sách đặt phòng
        if (newCheckInDate == null || newCheckOutDate == null || !newCheckOutDate.isAfter(newCheckInDate)) {
            throw BusinessException.badRequest("INVALID_DATE_RANGE", "Ngày trả phòng phải sau ngày nhận phòng");
        }
        if (newCheckInDate.isBefore(today)) {
            throw BusinessException.badRequest("INVALID_DATE_RANGE", "Ngày nhận phòng không được ở trong quá khứ");
        }

        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            long daysUntilNewCheckIn = ChronoUnit.DAYS.between(today, newCheckInDate);
            if (daysUntilNewCheckIn < adjustMinDaysBefore) {
                throw BusinessException.badRequest("ADJUSTMENT_WINDOW_CLOSED",
                        "Ngày nhận phòng mới phải cách ngày hiện tại ít nhất " + adjustMinDaysBefore + " ngày");
            }
        }

        BookingPolicy policy = loadPolicy(newCheckInDate, newCheckOutDate);

        // 4. Khóa và kiểm tra các phòng
        List<Room> rooms = roomRepository.findAllByIdInForUpdate(effectiveRoomIds);
        if (rooms.size() != effectiveRoomIds.size()) {
            throw BusinessException.badRequest("ROOM_NOT_AVAILABLE", "Một hoặc nhiều phòng không tồn tại hoặc không hợp lệ");
        }
        int totalCapacity = 0;
        for (Room room : rooms) {
            if (!booking.getHomestayId().equals(room.getHomestayId())) {
                throw BusinessException.badRequest("ROOM_NOT_AVAILABLE", "Phòng không thuộc homestay của đơn đặt phòng");
            }
            if (room.getStatus() != RoomStatus.ACTIVE) {
                throw BusinessException.conflict("ROOM_LOCKED", "Một hoặc nhiều phòng hiện không nhận đặt");
            }
            totalCapacity += Byte.toUnsignedInt(room.getMaxGuests());
        }
        if (newGuestCount > totalCapacity) {
            throw BusinessException.badRequest("ROOM_CAPACITY_EXCEEDED", "Số khách vượt quá tổng sức chứa của các phòng đã chọn");
        }

        // 5. Kiểm tra phòng trống (loại trừ chính booking hiện tại)
        List<Object[]> conflicts = bookingRoomNightRepository.findExistingNightsExcludingBooking(
                effectiveRoomIds, newCheckInDate, newCheckOutDate, booking.getId());
        if (!conflicts.isEmpty()) {
            throw BusinessException.conflict("ROOM_NOT_AVAILABLE", "Một hoặc nhiều phòng không còn trống trong khoảng thời gian đã chọn");
        }

        // 6. Tính toán giá mới
        List<BookingRoomNight> newRoomNights = buildRoomNights(booking.getHomestayId(), rooms, newCheckInDate, newCheckOutDate);
        long newTotalPrice = newRoomNights.stream().mapToLong(BookingRoomNight::getNightlyPrice).reduce(0L, Math::addExact);
        if (newTotalPrice <= 0) {
            throw BusinessException.badRequest("BOOKING_POLICY_VIOLATION", "Tổng tiền phòng phải lớn hơn 0");
        }

        // Quy tắc tiền cọc đối với Customer:
        // - Khi đã CONFIRMED: Tiền cọc khách đã chuyển giữ nguyên, số tiền còn thiếu thanh toán lúc check-out
        // - Khi PENDING_DEPOSIT: Khách chưa chuyển cọc, tính lại tiền cọc cần nộp theo giá phòng mới
        long depositAmountToSet;
        if (booking.getStatus() == BookingStatus.CONFIRMED) {
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

        if (request.getRoomIds() != null) {
            bookingRoomRepository.deleteAll(currentBookingRooms);
            bookingRoomRepository.flush();
            bookingRoomRepository.saveAllAndFlush(rooms.stream()
                    .map(r -> new BookingRoom(booking.getId(), booking.getHomestayId(), r.getId()))
                    .toList());
        }

        newRoomNights.forEach(night -> night.setBookingId(booking.getId()));
        try {
            bookingRoomNightRepository.saveAllAndFlush(newRoomNights);
        } catch (DataIntegrityViolationException exception) {
            throw BusinessException.conflict("ROOM_NOT_AVAILABLE", "Phòng vừa được đặt bởi khách khác. Hãy chọn ngày hoặc phòng khác");
        }

        // 8. Cập nhật booking
        booking.setCheckInDate(newCheckInDate);
        booking.setCheckOutDate(newCheckOutDate);
        booking.setGuestCount(newGuestCount.shortValue());
        booking.setRoomTotalPrice(newTotalPrice);
        booking.setDepositAmount(depositAmountToSet);
        booking.setPolicySnapshot(serializePolicySnapshot(policy));
        Booking savedBooking = bookingRepository.saveAndFlush(booking);

        return new CustomerAdjustBookingResponse(
                savedBooking.getId(),
                savedBooking.getCode(),
                savedBooking.getStatus(),
                savedBooking.getCheckInDate(),
                savedBooking.getCheckOutDate(),
                (int) savedBooking.getGuestCount(),
                effectiveRoomIds,
                savedBooking.getRoomTotalPrice(),
                savedBooking.getDepositAmount()
        );
    }

    private int getAdjustMinDaysBefore() {
        return policySettingRepository.findByPolicyGroupAndPolicyKey("BOOKING", "adjust_min_days_before")
                .map(setting -> {
                    try {
                        int value = Integer.parseInt(setting.getPolicyValue().trim());
                        return value >= 0 ? value : 3;
                    } catch (NumberFormatException exception) {
                        return 3;
                    }
                })
                .orElse(3);
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
        int totalCapacity = 0;
        for (Room room : rooms) {
            if (!homestayId.equals(room.getHomestayId())) {
                throw BusinessException.badRequest("ROOM_NOT_AVAILABLE", "Phòng không thuộc homestay đã chọn");
            }
            if (room.getStatus() != RoomStatus.ACTIVE) {
                throw BusinessException.conflict("ROOM_LOCKED", "Một hoặc nhiều phòng hiện không nhận đặt");
            }
            totalCapacity += Byte.toUnsignedInt(room.getMaxGuests());
        }
        if (request.getGuestCount() > totalCapacity) {
            throw BusinessException.badRequest("ROOM_CAPACITY_EXCEEDED", "Số khách vượt quá tổng sức chứa của các phòng đã chọn");
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
        // Chụp snapshot quy tắc hủy hiện tại mà không kiểm tra lại ở luồng đặt phòng.
        String refundRules = policySettingRepository.findByPolicyGroupAndPolicyKey("CANCELLATION", "refund_rules")
                .map(PolicySetting::getPolicyValue)
                .orElse(null);
        if (nights < minNights || nights > maxNights || advanceDays > maxAdvanceDays) {
            throw BusinessException.badRequest("BOOKING_POLICY_VIOLATION", "Thời gian lưu trú không đáp ứng chính sách đặt phòng");
        }
        return new BookingPolicy(minNights, maxNights, maxAdvanceDays, depositPercent, holdHours, refundRules);
    }

    private int requiredPolicyInt(String policyGroup, String policyKey) {
        String value = requiredPolicyValue(policyGroup, policyKey);
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException exception) {
            throw BusinessException.badRequest("BOOKING_POLICY_NOT_CONFIGURED", "Chính sách đặt phòng chưa được cấu hình hợp lệ");
        }
    }

    private String requiredPolicyValue(String policyGroup, String policyKey) {
        return policySettingRepository.findByPolicyGroupAndPolicyKey(policyGroup, policyKey)
                .map(PolicySetting::getPolicyValue)
                .orElseThrow(() -> BusinessException.badRequest(
                        "BOOKING_POLICY_NOT_CONFIGURED", "Chính sách đặt phòng chưa được cấu hình"));
    }

    private int resolveRefundPercent(Booking booking) {
        String rulesJson;
        try {
            var snapshot = booking.getPolicySnapshot() == null || booking.getPolicySnapshot().isBlank()
                    ? null : objectMapper.readTree(booking.getPolicySnapshot());
            var snapshotRules = snapshot == null ? null : snapshot.get("refundRules");
            rulesJson = snapshotRules != null && !snapshotRules.isNull()
                    ? snapshotRules.isTextual() ? snapshotRules.asText() : snapshotRules.toString()
                    : policySettingRepository.findByPolicyGroupAndPolicyKey("CANCELLATION", "refund_rules")
                            .map(PolicySetting::getPolicyValue)
                            .orElseThrow(() -> BusinessException.badRequest(
                                    "CANCELLATION_POLICY_INVALID", "Chính sách hủy chưa được cấu hình hợp lệ"));
            validateRefundRules(rulesJson);
            long daysBeforeCheckIn = ChronoUnit.DAYS.between(
                    LocalDate.now(BUSINESS_TIME_ZONE), booking.getCheckInDate());
            int selectedDays = -1;
            int selectedPercent = -1;
            for (var rule : objectMapper.readTree(rulesJson)) {
                int threshold = rule.path("days_before_checkin").asInt(-1);
                int percent = rule.path("refund_percent").asInt(-1);
                if (threshold <= daysBeforeCheckIn && threshold > selectedDays) {
                    selectedDays = threshold;
                    selectedPercent = percent;
                }
            }
            if (selectedPercent < 0) {
                throw BusinessException.badRequest("CANCELLATION_POLICY_INVALID", "Chính sách hủy chưa có mốc áp dụng cho booking");
            }
            return selectedPercent;
        } catch (JsonProcessingException exception) {
            throw BusinessException.badRequest("CANCELLATION_POLICY_INVALID", "Chính sách hủy chưa được cấu hình hợp lệ");
        }
    }

    private void validateRefundRules(String rulesJson) {
        try {
            var rules = objectMapper.readTree(rulesJson);
            if (!rules.isArray() || rules.isEmpty()) {
                throw BusinessException.badRequest("CANCELLATION_POLICY_INVALID", "Chính sách hủy chưa được cấu hình hợp lệ");
            }
            Set<Integer> dayThresholds = new HashSet<>();
            for (var rule : rules) {
                var daysNode = rule.path("days_before_checkin");
                var percentNode = rule.path("refund_percent");
                if (!rule.isObject() || !daysNode.isIntegralNumber() || !percentNode.isIntegralNumber()) {
                    throw BusinessException.badRequest("CANCELLATION_POLICY_INVALID", "Chính sách hủy chưa được cấu hình hợp lệ");
                }
                int days = daysNode.asInt(-1);
                int percent = percentNode.asInt(-1);
                if (days < 0 || percent < 0 || percent > 100 || !dayThresholds.add(days)) {
                    throw BusinessException.badRequest("CANCELLATION_POLICY_INVALID", "Chính sách hủy chưa được cấu hình hợp lệ");
                }
            }
        } catch (JsonProcessingException exception) {
            throw BusinessException.badRequest("CANCELLATION_POLICY_INVALID", "Chính sách hủy chưa được cấu hình hợp lệ");
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
            var snapshot = objectMapper.createObjectNode();
            snapshot.put("minNights", policy.minNights());
            snapshot.put("maxNights", policy.maxNights());
            snapshot.put("maxAdvanceDays", policy.maxAdvanceDays());
            snapshot.put("depositPercent", policy.depositPercent());
            snapshot.put("holdHours", policy.holdHours());
            if (policy.refundRules() != null) {
                try {
                    snapshot.set("refundRules", objectMapper.readTree(policy.refundRules()));
                } catch (JsonProcessingException invalidJson) {
                    // Giữ lại dữ liệu cũ không chuẩn định dạng mà không làm chặn việc tạo booking mới.
                    snapshot.put("refundRules", policy.refundRules());
                }
            }
            return objectMapper.writeValueAsString(snapshot);
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
                                 int depositPercent, int holdHours, String refundRules) {}
}
