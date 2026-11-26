package vn.edu.hust.homestay.payment.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.booking.entity.Booking;
import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;
import vn.edu.hust.homestay.booking.repository.BookingRepository;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.payment.dto.OnlineDepositInitRequest;
import vn.edu.hust.homestay.payment.dto.OnlineDepositInitResponse;
import vn.edu.hust.homestay.payment.dto.OnlineDepositVerifyResponse;
import vn.edu.hust.homestay.payment.entity.Payment;
import vn.edu.hust.homestay.payment.entity.Payment.PaymentMethod;
import vn.edu.hust.homestay.payment.entity.Payment.PaymentStatus;
import vn.edu.hust.homestay.payment.entity.Payment.PaymentType;
import vn.edu.hust.homestay.payment.gateway.OnlinePaymentGateway;
import vn.edu.hust.homestay.payment.gateway.OnlinePaymentGateway.GatewayCreateCommand;
import vn.edu.hust.homestay.payment.gateway.OnlinePaymentGateway.GatewayCreateResult;
import vn.edu.hust.homestay.payment.gateway.OnlinePaymentGateway.GatewayQueryResult;
import vn.edu.hust.homestay.payment.gateway.OnlinePaymentGateway.GatewayTxState;
import vn.edu.hust.homestay.payment.gateway.PaymentGatewayRegistry;
import vn.edu.hust.homestay.payment.gateway.VnPayPaymentGateway;
import vn.edu.hust.homestay.payment.repository.PaymentRepository;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static vn.edu.hust.homestay.common.constant.ValidationConstants.DEPOSIT_REVIEW_REASON_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.PAYMENT_PROVIDER_ORDER_ID_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.PAYMENT_PROVIDER_TRANS_ID_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.PAYMENT_REFERENCE_CODE_MAX_LENGTH;

/**
 * Xử lý Luồng 1 — Khách hàng đặt cọc trực tuyến qua cổng thanh toán VNPay Sandbox:
 * - API-PAY-05: Khởi tạo phiên đặt cọc và trả payUrl (không giữ khóa DB trong lúc gọi HTTP sang cổng)
 * - API-PAY-06: Backend đối soát trực tiếp với cổng VNPay (querydr + xác thực chữ ký HMAC-SHA512 Return URL)
 * - API-PAY-07: Tiếp nhận IPN Webhook từ VNPay (GET HMAC-SHA512)
 */
@Service
public class OnlineDepositPaymentService {

    private static final Logger log = LoggerFactory.getLogger(OnlineDepositPaymentService.class);
    private static final String DEFAULT_PROVIDER = "VNPAY";
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter ORDER_TS_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentGatewayRegistry gatewayRegistry;
    private final TransactionTemplate transactionTemplate;
    private final String frontendUrl;

    public OnlineDepositPaymentService(
            BookingRepository bookingRepository,
            PaymentRepository paymentRepository,
            PaymentGatewayRegistry gatewayRegistry,
            TransactionTemplate transactionTemplate,
            @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl
    ) {
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.gatewayRegistry = gatewayRegistry;
        this.transactionTemplate = transactionTemplate;
        this.frontendUrl = frontendUrl == null ? "http://localhost:5173" : frontendUrl.replaceAll("/+$", "");
    }

    /** API-PAY-05: Khởi tạo giao dịch đặt cọc trực tuyến qua VNPay và nhận link payUrl. */
    public OnlineDepositInitResponse initiateOnlineDeposit(
            UserPrincipal principal,
            Long bookingId,
            OnlineDepositInitRequest request
    ) {
        String providerCode = (request == null || request.provider() == null || request.provider().isBlank())
                ? DEFAULT_PROVIDER
                : request.provider().trim().toUpperCase(Locale.ROOT);
        OnlinePaymentGateway gateway = gatewayRegistry.resolveByProvider(providerCode);

        // Bước 1 (Transaction ngắn): khóa booking, kiểm tra trạng thái/thời hạn và lưu Payment PENDING
        CreatedPendingPayment pending = transactionTemplate.execute(status -> {
            boolean exists = bookingRepository.existsById(bookingId);
            Booking booking = bookingRepository.findByIdAndCustomerIdForUpdate(bookingId, principal.getId())
                    .orElseThrow(() -> exists
                            ? BusinessException.forbidden("BOOKING_NOT_OWNED", "Đây không phải đơn đặt phòng của bạn")
                            : BusinessException.notFound("BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt phòng"));

            if (booking.getStatus() != BookingStatus.PENDING_DEPOSIT) {
                throw BusinessException.conflict(
                        "BOOKING_STATE_CONFLICT",
                        "Chỉ có thể đặt cọc trực tuyến khi đơn đang ở trạng thái chờ đặt cọc");
            }
            LocalDateTime nowUtc = LocalDateTime.ofInstant(Instant.now(), ZoneOffset.UTC);
            if (booking.getHoldExpiresAt() == null || !booking.getHoldExpiresAt().isAfter(nowUtc)) {
                throw BusinessException.conflict(
                        "BOOKING_HOLD_EXPIRED",
                        "Đơn đặt phòng đã hết thời hạn giữ phòng, không thể đặt cọc trực tuyến");
            }
            if (booking.getDepositAmount() == null || booking.getDepositAmount() <= 0) {
                throw BusinessException.badRequest("DEPOSIT_AMOUNT_INVALID", "Số tiền đặt cọc của đơn không hợp lệ");
            }

            // Nhúng mốc yyyyMMddHHmmss (GMT+7) trong provider_order_id để VNPay querydr/refund khớp chính xác vnp_TransactionDate
            String providerOrderId = generateOrderId("DEP", booking.getId());

            Payment payment = new Payment();
            payment.setBookingId(booking.getId());
            payment.setHomestayId(booking.getHomestayId());
            payment.setType(PaymentType.DEPOSIT);
            payment.setAmount(booking.getDepositAmount());
            payment.setMethod(gateway.getSupportedMethod());
            payment.setStatus(PaymentStatus.PENDING);
            payment.setProviderOrderId(providerOrderId);
            payment.setNote("Đặt cọc trực tuyến qua " + formatProviderDisplayName(gateway.getSupportedMethod()));
            payment.setCreatedBy(principal.getId());
            Payment saved = paymentRepository.saveAndFlush(payment);

            return new CreatedPendingPayment(
                    saved.getId(),
                    booking.getId(),
                    booking.getCode(),
                    saved.getAmount(),
                    saved.getProviderOrderId()
            );
        });

        if (pending == null) {
            throw new IllegalStateException("Không thể tạo bản ghi giao dịch đặt cọc trực tuyến");
        }

        // Bước 2 (Ngoài DB transaction): tạo link thanh toán từ cổng đã chọn
        String redirectUrl = gateway.getSupportedMethod() == PaymentMethod.VNPAY
                // VNPay tự gắn ?vnp_Amount=...&vnp_TxnRef=... nên để URL thuần không chứa "?" để tránh lỗi URL
                ? frontendUrl + "/customer/bookings/" + pending.bookingId()
                : frontendUrl + "/customer/bookings/" + pending.bookingId()
                        + "?paymentId=" + pending.paymentId()
                        + "&provider=" + gateway.getProviderCode();
        String orderInfo = "Dat coc don " + pending.bookingCode();

        try {
            GatewayCreateResult result = gateway.createDepositPayment(new GatewayCreateCommand(
                    pending.providerOrderId(),
                    pending.amount(),
                    orderInfo,
                    redirectUrl,
                    ""
            ));
            return new OnlineDepositInitResponse(
                    pending.paymentId(),
                    pending.bookingId(),
                    gateway.getProviderCode(),
                    pending.amount(),
                    PaymentStatus.PENDING,
                    result.providerOrderId(),
                    result.payUrl()
            );
        } catch (RuntimeException exception) {
            markPaymentFailedQuietly(pending.paymentId(), exception.getMessage());
            throw exception;
        }
    }

    /** API-PAY-06 (overload không cần body): đối soát giao dịch theo paymentId. */
    public OnlineDepositVerifyResponse verifyOnlineDeposit(
            UserPrincipal principal,
            Long bookingId,
            Long paymentId
    ) {
        return verifyOnlineDeposit(principal, bookingId, paymentId, null);
    }

    /** API-PAY-06: đối soát giao dịch theo providerOrderId (hữu ích khi VNPay redirect trả về vnp_TxnRef). */
    public OnlineDepositVerifyResponse verifyOnlineDepositByOrder(
            UserPrincipal principal,
            Long bookingId,
            String providerOrderId,
            Map<String, String> gatewayParams
    ) {
        if (providerOrderId == null || providerOrderId.isBlank()) {
            throw BusinessException.badRequest("VALIDATION_ERROR", "Thiếu mã đơn giao dịch (providerOrderId) cần đối soát");
        }
        Payment payment = paymentRepository.findByProviderOrderId(providerOrderId.trim())
                .filter(p -> bookingId.equals(p.getBookingId()))
                .orElseThrow(() -> BusinessException.notFound("PAYMENT_NOT_FOUND", "Không tìm thấy giao dịch đặt cọc tương ứng"));
        return verifyOnlineDeposit(principal, bookingId, payment.getId(), gatewayParams);
    }

    /** API-PAY-06: Backend tự hỏi trực tiếp server cổng (/query hoặc querydr) để xác thực kết quả và chốt booking. */
    public OnlineDepositVerifyResponse verifyOnlineDeposit(
            UserPrincipal principal,
            Long bookingId,
            Long paymentId,
            Map<String, String> gatewayParams
    ) {
        Booking bookingSnapshot = bookingRepository.findById(bookingId)
                .orElseThrow(() -> BusinessException.notFound("BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt phòng"));
        if (!principal.getId().equals(bookingSnapshot.getCustomerId())) {
            throw BusinessException.forbidden("BOOKING_NOT_OWNED", "Đây không phải đơn đặt phòng của bạn");
        }

        Payment paymentSnapshot = paymentRepository.findById(paymentId)
                .filter(p -> bookingId.equals(p.getBookingId()))
                .orElseThrow(() -> BusinessException.notFound("PAYMENT_NOT_FOUND", "Không tìm thấy giao dịch đặt cọc"));
        if (paymentSnapshot.getType() != PaymentType.DEPOSIT || paymentSnapshot.getProviderOrderId() == null) {
            throw BusinessException.badRequest(
                    "PAYMENT_NOT_ONLINE",
                    "Giao dịch này không phải phiên đặt cọc trực tuyến");
        }

        // Idempotent: nếu đã được xác nhận trước đó (qua IPN hoặc lần verify trước), trả ngay trạng thái hiện tại
        if (paymentSnapshot.getStatus() == PaymentStatus.CONFIRMED) {
            return new OnlineDepositVerifyResponse(
                    paymentSnapshot.getId(),
                    bookingSnapshot.getId(),
                    paymentSnapshot.getMethod(),
                    paymentSnapshot.getStatus(),
                    bookingSnapshot.getStatus(),
                    paymentSnapshot.getProviderOrderId(),
                    paymentSnapshot.getProviderTransId(),
                    paymentSnapshot.getConfirmedAt() == null ? null : paymentSnapshot.getConfirmedAt().toInstant(ZoneOffset.UTC),
                    0,
                    "Giao dịch đặt cọc đã được xác nhận thành công",
                    false
            );
        }

        OnlinePaymentGateway gateway = gatewayRegistry.resolveByMethod(paymentSnapshot.getMethod())
                .orElseThrow(() -> BusinessException.badRequest(
                        "UNSUPPORTED_PAYMENT_PROVIDER",
                        "Không hỗ trợ đối soát tự động cho phương thức " + paymentSnapshot.getMethod()));

        // Kiểm tra trước xem tham số return URL có chữ ký mật mã hợp lệ hay không (ví dụ VNPay HMAC-SHA512)
        Optional<GatewayQueryResult> signedReturnResult = gateway.verifySignedReturnParams(
                paymentSnapshot.getProviderOrderId(),
                gatewayParams
        );

        // Ưu tiên gọi truy vấn trực tiếp server-to-server (/query hoặc querydr) ngoài DB transaction
        GatewayQueryResult resolvedResult;
        try {
            GatewayQueryResult queryResult = gateway.queryPayment(paymentSnapshot.getProviderOrderId());
            if (queryResult.state() == GatewayTxState.SUCCEEDED) {
                resolvedResult = queryResult;
            } else if (signedReturnResult.isPresent()) {
                // Nếu sandbox querydr chưa đồng bộ kịp trong 1 giây đầu sau redirect nhưng return params có chữ ký HMAC-SHA512 hợp lệ
                resolvedResult = signedReturnResult.get();
            } else {
                resolvedResult = queryResult;
            }
        } catch (RuntimeException queryError) {
            if (signedReturnResult.isPresent()) {
                log.warn("Truy vấn server-to-server {} gặp lỗi ({}), sử dụng kết quả return URL đã xác thực chữ ký HMAC-SHA512 cho orderId={}",
                        gateway.getProviderCode(), queryError.getMessage(), paymentSnapshot.getProviderOrderId());
                resolvedResult = signedReturnResult.get();
            } else {
                throw queryError;
            }
        }

        return reconcileGatewayOutcome(
                paymentSnapshot.getId(),
                resolvedResult.state(),
                resolvedResult.resultCode(),
                resolvedResult.providerTransId(),
                resolvedResult.amount(),
                resolvedResult.message()
        );
    }

    /**
     * API-PAY-07 (VNPay GET IPN): xử lý IPN chuẩn VNPay API v2.1.0 và trả cặp RspCode / Message theo đặc tả VNPay.
     * - "00": Confirm Success
     * - "01": Order not Found
     * - "02": Order already confirmed
     * - "04": Invalid Amount
     * - "97": Invalid Checksum
     */
    public Map<String, String> handleVnPayIpn(Map<String, String> queryParams) {
        OnlinePaymentGateway gateway = gatewayRegistry.resolveByProvider(VnPayPaymentGateway.PROVIDER_CODE);
        if (!(gateway instanceof VnPayPaymentGateway vnPayGateway)) {
            return vnPayIpnResponse("99", "VNPay gateway unavailable");
        }
        if (!vnPayGateway.verifyVnPayParamsSignature(queryParams)) {
            log.warn("Từ chối VNPay IPN có chữ ký HMAC-SHA512 không hợp lệ");
            return vnPayIpnResponse("97", "Invalid Checksum");
        }

        String txnRef = queryParams.get("vnp_TxnRef");
        if (txnRef == null || txnRef.isBlank()) {
            return vnPayIpnResponse("01", "Order not Found");
        }

        Optional<Payment> paymentOpt = paymentRepository.findByProviderOrderId(txnRef.trim());
        if (paymentOpt.isEmpty()) {
            return vnPayIpnResponse("01", "Order not Found");
        }
        Payment payment = paymentOpt.get();
        if (payment.getStatus() == PaymentStatus.CONFIRMED) {
            return vnPayIpnResponse("02", "Order already confirmed");
        }

        Optional<GatewayQueryResult> parsedOpt = vnPayGateway.verifySignedReturnParams(txnRef.trim(), queryParams);
        if (parsedOpt.isEmpty()) {
            return vnPayIpnResponse("97", "Invalid Checksum");
        }
        GatewayQueryResult parsed = parsedOpt.get();
        if (parsed.amount() == null || !parsed.amount().equals(payment.getAmount())) {
            return vnPayIpnResponse("04", "Invalid Amount");
        }

        try {
            reconcileGatewayOutcome(
                    payment.getId(),
                    parsed.state(),
                    parsed.resultCode(),
                    parsed.providerTransId(),
                    parsed.amount(),
                    parsed.message()
            );
            return vnPayIpnResponse("00", "Confirm Success");
        } catch (BusinessException exception) {
            if ("PAYMENT_AMOUNT_MISMATCH".equals(exception.getCode())) {
                return vnPayIpnResponse("04", "Invalid Amount");
            }
            return vnPayIpnResponse("99", exception.getMessage());
        }
    }

    /**
     * Hàm chốt giao dịch dùng chung cho cả /verify và /ipn trong cùng một DB transaction.
     * Khóa bi quan (FOR UPDATE) cả Payment và Booking để đảm bảo an toàn khi IPN và /verify chạy đồng thời.
     */
    private OnlineDepositVerifyResponse reconcileGatewayOutcome(
            Long paymentId,
            GatewayTxState state,
            int resultCode,
            String providerTransId,
            Long reportedAmount,
            String gatewayMessage
    ) {
        OnlineDepositVerifyResponse response = transactionTemplate.execute(status -> {
            Payment payment = paymentRepository.findByIdForUpdate(paymentId)
                    .orElseThrow(() -> BusinessException.notFound("PAYMENT_NOT_FOUND", "Không tìm thấy giao dịch đặt cọc"));
            Booking booking = bookingRepository.findByIdForUpdate(payment.getBookingId())
                    .orElseThrow(() -> BusinessException.notFound("BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt phòng"));
            String providerName = formatProviderDisplayName(payment.getMethod());

            // Idempotent guard sau khi đã giữ khóa dòng
            if (payment.getStatus() == PaymentStatus.CONFIRMED) {
                return new OnlineDepositVerifyResponse(
                        payment.getId(),
                        booking.getId(),
                        payment.getMethod(),
                        payment.getStatus(),
                        booking.getStatus(),
                        payment.getProviderOrderId(),
                        payment.getProviderTransId(),
                        payment.getConfirmedAt() == null ? null : payment.getConfirmedAt().toInstant(ZoneOffset.UTC),
                        0,
                        "Giao dịch đặt cọc đã được xác nhận thành công",
                        false
                );
            }

            if (state == GatewayTxState.SUCCEEDED) {
                if (reportedAmount == null || !reportedAmount.equals(payment.getAmount())) {
                    log.error("Sai lệch số tiền từ cổng {} cho paymentId={}: kỳ vọng={}, nhận được={}",
                            providerName, payment.getId(), payment.getAmount(), reportedAmount);
                    throw BusinessException.conflict(
                            "PAYMENT_AMOUNT_MISMATCH",
                            "Số tiền xác nhận từ cổng thanh toán không khớp với tiền đặt cọc của đơn");
                }
                if (providerTransId == null || providerTransId.isBlank()) {
                    throw new BusinessException(
                            "PAYMENT_GATEWAY_ERROR",
                            "Cổng thanh toán " + providerName + " không trả về mã giao dịch hợp lệ",
                            HttpStatus.BAD_GATEWAY);
                }

                Instant nowInstant = Instant.now();
                LocalDateTime nowUtc = LocalDateTime.ofInstant(nowInstant, ZoneOffset.UTC);
                String safeTransId = truncate(providerTransId.trim(), PAYMENT_PROVIDER_TRANS_ID_MAX_LENGTH);

                payment.setStatus(PaymentStatus.CONFIRMED);
                payment.setProviderTransId(safeTransId);
                payment.setReferenceCode(truncate(safeTransId, PAYMENT_REFERENCE_CODE_MAX_LENGTH));
                payment.setConfirmedAt(nowUtc);
                // Xác nhận tự động bởi cổng thanh toán nên confirmedBy = null (khớp ràng buộc ck_pay_confirmed)
                payment.setConfirmedBy(null);
                payment.setRejectionReason(null);
                paymentRepository.saveAndFlush(payment);

                boolean latePaymentRefundCreated = false;
                if (booking.getStatus() == BookingStatus.PENDING_DEPOSIT) {
                    booking.setStatus(BookingStatus.CONFIRMED);
                    booking.setApprovedAt(nowInstant);
                    booking.setApprovedBy(null);
                    bookingRepository.saveAndFlush(booking);

                    // Đóng các phiên DEPOSIT PENDING cũ còn sót lại của cùng đơn đặt phòng
                    List<Payment> otherPendingDeposits = paymentRepository.findByBookingIdAndTypeAndStatus(
                            booking.getId(), PaymentType.DEPOSIT, PaymentStatus.PENDING);
                    for (Payment other : otherPendingDeposits) {
                        if (!other.getId().equals(payment.getId())) {
                            other.setStatus(PaymentStatus.REJECTED);
                            other.setRejectionReason(truncate(
                                    "Đơn đã hoàn tất đặt cọc qua giao dịch " + providerName + " #" + payment.getId(),
                                    DEPOSIT_REVIEW_REASON_MAX_LENGTH));
                        }
                    }
                    if (!otherPendingDeposits.isEmpty()) {
                        paymentRepository.saveAllAndFlush(otherPendingDeposits);
                    }
                } else if (booking.getStatus() == BookingStatus.EXPIRED || booking.getStatus() == BookingStatus.CANCELLED) {
                    // Tình huống biên: đơn vừa hết hạn/hủy đúng lúc khách thanh toán xong -> không nhả lại phòng cũ, tạo REFUND PENDING 100%
                    long updatedRefundTotal = (booking.getRefundAmount() == null ? 0L : booking.getRefundAmount()) + payment.getAmount();
                    booking.setRefundAmount(updatedRefundTotal);
                    bookingRepository.saveAndFlush(booking);

                    Payment refund = new Payment();
                    refund.setBookingId(booking.getId());
                    refund.setHomestayId(booking.getHomestayId());
                    refund.setType(PaymentType.REFUND);
                    refund.setAmount(payment.getAmount());
                    refund.setMethod(payment.getMethod());
                    refund.setStatus(PaymentStatus.PENDING);
                    refund.setNote("Tự động tạo khoản hoàn tiền do thanh toán " + providerName + " hoàn tất sau khi đơn đã hết hạn/hủy");
                    refund.setCreatedBy(payment.getCreatedBy());
                    paymentRepository.saveAndFlush(refund);
                    latePaymentRefundCreated = true;
                }

                return new OnlineDepositVerifyResponse(
                        payment.getId(),
                        booking.getId(),
                        payment.getMethod(),
                        payment.getStatus(),
                        booking.getStatus(),
                        payment.getProviderOrderId(),
                        payment.getProviderTransId(),
                        nowInstant,
                        resultCode,
                        latePaymentRefundCreated
                                ? "Thanh toán " + providerName + " đã được ghi nhận nhưng đơn đặt phòng đã hết hạn trước đó. Hệ thống đã tự tạo yêu cầu hoàn tiền 100% để quản lý xử lý."
                                : "Đặt cọc trực tuyến qua " + providerName + " thành công! Đơn đặt phòng của bạn đã được xác nhận.",
                        latePaymentRefundCreated
                );
            }

            if (state == GatewayTxState.PENDING) {
                return new OnlineDepositVerifyResponse(
                        payment.getId(),
                        booking.getId(),
                        payment.getMethod(),
                        payment.getStatus(),
                        booking.getStatus(),
                        payment.getProviderOrderId(),
                        payment.getProviderTransId(),
                        null,
                        resultCode,
                        (gatewayMessage == null || gatewayMessage.isBlank())
                                ? "Giao dịch đang chờ bạn hoàn tất thanh toán trên cổng " + providerName + "."
                                : gatewayMessage,
                        false
                );
            }

            // Trạng thái FAILED: hủy phiên thanh toán hiện tại, giữ nguyên booking PENDING_DEPOSIT để khách thử lại
            if (payment.getStatus() == PaymentStatus.PENDING) {
                payment.setStatus(PaymentStatus.REJECTED);
                payment.setRejectionReason(truncate(buildFailureReason(providerName, resultCode, gatewayMessage), DEPOSIT_REVIEW_REASON_MAX_LENGTH));
                paymentRepository.saveAndFlush(payment);
            }

            return new OnlineDepositVerifyResponse(
                    payment.getId(),
                    booking.getId(),
                    payment.getMethod(),
                    payment.getStatus(),
                    booking.getStatus(),
                    payment.getProviderOrderId(),
                    payment.getProviderTransId(),
                    null,
                    resultCode,
                    (gatewayMessage == null || gatewayMessage.isBlank())
                            ? "Giao dịch thanh toán " + providerName + " chưa thành công hoặc đã bị hủy."
                            : gatewayMessage,
                    false
            );
        });

        if (response == null) {
            throw new IllegalStateException("Không thể đối soát kết quả thanh toán trực tuyến");
        }
        return response;
    }

    private void markPaymentFailedQuietly(Long paymentId, String message) {
        try {
            transactionTemplate.executeWithoutResult(status -> paymentRepository.findByIdForUpdate(paymentId)
                    .filter(p -> p.getStatus() == PaymentStatus.PENDING)
                    .ifPresent(p -> {
                        p.setStatus(PaymentStatus.REJECTED);
                        p.setRejectionReason(truncate(
                                (message == null || message.isBlank())
                                        ? "Không thể khởi tạo phiên thanh toán với cổng thanh toán"
                                        : message,
                                DEPOSIT_REVIEW_REASON_MAX_LENGTH));
                        paymentRepository.saveAndFlush(p);
                    }));
        } catch (Exception cleanupError) {
            log.warn("Không thể cập nhật trạng thái REJECTED cho paymentId={}: {}", paymentId, cleanupError.getMessage());
        }
    }

    private String generateOrderId(String prefix, Long entityId) {
        String vnTimestamp = LocalDateTime.now(VN_ZONE).format(ORDER_TS_FORMAT);
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase(Locale.ROOT);
        String raw = prefix + "_" + entityId + "_" + vnTimestamp + "_" + suffix;
        return truncate(raw, PAYMENT_PROVIDER_ORDER_ID_MAX_LENGTH);
    }

    private String buildFailureReason(String providerName, int resultCode, String message) {
        if (message == null || message.isBlank()) {
            return "Thanh toán " + providerName + " không thành công (mã lỗi " + resultCode + ")";
        }
        return providerName + " (mã " + resultCode + "): " + message.trim();
    }

    private static String formatProviderDisplayName(PaymentMethod method) {
        if (method == PaymentMethod.VNPAY) return "VNPay";
        return method == null ? "Cổng thanh toán" : method.name();
    }

    private static Map<String, String> vnPayIpnResponse(String code, String message) {
        Map<String, String> map = new LinkedHashMap<>();
        map.put("RspCode", code);
        map.put("Message", message);
        return map;
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    private record CreatedPendingPayment(
            Long paymentId,
            Long bookingId,
            String bookingCode,
            Long amount,
            String providerOrderId
    ) {}
}
