package vn.edu.hust.homestay.payment.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.payment.dto.ConfirmRefundRequest;
import vn.edu.hust.homestay.payment.dto.ConfirmRefundResponse;
import vn.edu.hust.homestay.payment.entity.Payment;
import vn.edu.hust.homestay.payment.gateway.OnlinePaymentGateway;
import vn.edu.hust.homestay.payment.gateway.OnlinePaymentGateway.GatewayRefundCommand;
import vn.edu.hust.homestay.payment.gateway.OnlinePaymentGateway.GatewayRefundResult;
import vn.edu.hust.homestay.payment.gateway.PaymentGatewayRegistry;
import vn.edu.hust.homestay.payment.repository.PaymentRepository;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import static vn.edu.hust.homestay.common.constant.ValidationConstants.PAYMENT_PROVIDER_ORDER_ID_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.PAYMENT_PROVIDER_TRANS_ID_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.PAYMENT_REFERENCE_CODE_MAX_LENGTH;

@Service
public class ManagerPaymentService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter REFUND_REQ_TS_FORMAT = DateTimeFormatter.ofPattern("yyMMddHHmmss");
    private static final int VNPAY_REQUEST_ID_MAX_LENGTH = 32;

    private static final List<Payment.PaymentMethod> ONLINE_GATEWAY_METHODS = List.of(
            Payment.PaymentMethod.VNPAY
    );

    private final PaymentRepository paymentRepository;
    private final PaymentGatewayRegistry gatewayRegistry;

    public ManagerPaymentService(
            PaymentRepository paymentRepository,
            PaymentGatewayRegistry gatewayRegistry
    ) {
        this.paymentRepository = paymentRepository;
        this.gatewayRegistry = gatewayRegistry;
    }

    /**
     * API-PAY-04: Xác nhận hoàn tiền cho booking đã hủy.
     * - Khóa bi quan dòng payment bằng findByIdForUpdate để tránh bấm đúp hoàn tiền 2 lần.
     * - Nếu đơn cọc gốc thanh toán trực tuyến qua VNPay (có provider_trans_id):
     *   + Mặc định (manualFallback != true): tự động gọi API Hoàn tiền thật của VNPay (100% hoặc 50%).
     *   + Dự phòng (manualFallback == true): khi cổng VNPay lỗi/bảo trì, cho phép Manager xác nhận
     *     hoàn tiền thủ công ngoài hệ thống (chuyển method thực tế sang BANK_TRANSFER hoặc CASH).
     * - Nếu đơn cọc gốc là CASH / BANK_TRANSFER (bao gồm đơn quản lý đặt hộ): chạy luồng xác nhận thủ công như cũ.
     */
    @Transactional
    public ConfirmRefundResponse confirmRefund(
            UserPrincipal principal, Long paymentId, ConfirmRefundRequest request
    ) {
        if (principal == null || principal.getHomestayId() == null) {
            throw BusinessException.badRequest("HOMESTAY_NOT_ASSIGNED", "Tài khoản quản lý chưa được phân công cơ sở");
        }

        Payment payment = paymentRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> BusinessException.notFound("PAYMENT_NOT_FOUND", "Không tìm thấy khoản thanh toán"));
        if (!principal.getHomestayId().equals(payment.getHomestayId())) {
            throw BusinessException.forbidden(
                    "HOMESTAY_SCOPE_VIOLATION", "Khoản hoàn tiền không thuộc cơ sở homestay được giao quản lý");
        }
        if (payment.getType() != Payment.PaymentType.REFUND) {
            throw BusinessException.badRequest("PAYMENT_NOT_REFUND", "Khoản thanh toán này không phải khoản hoàn tiền");
        }
        if (payment.getStatus() != Payment.PaymentStatus.PENDING) {
            throw BusinessException.conflict("PAYMENT_ALREADY_REVIEWED", "Khoản hoàn tiền đã được xử lý");
        }

        // Tìm giao dịch đặt cọc gốc đã xác nhận qua cổng VNPay (nếu có) để quyết định nhánh hoàn online hay thủ công
        Optional<Payment> originalOnlineDeposit = paymentRepository
                .findTopByBookingIdAndTypeAndStatusAndMethodInAndProviderTransIdIsNotNullOrderByConfirmedAtDesc(
                        payment.getBookingId(),
                        Payment.PaymentType.DEPOSIT,
                        Payment.PaymentStatus.CONFIRMED,
                        ONLINE_GATEWAY_METHODS
                )
                .filter(dep -> dep.getProviderTransId() != null && !dep.getProviderTransId().isBlank());

        String note = trimToNull(request == null ? null : request.note());
        boolean manualFallback = request != null && Boolean.TRUE.equals(request.manualFallback());

        if ((originalOnlineDeposit.isPresent()
                || (payment.getMethod() != null && payment.getMethod().isOnlineGateway()))
                && !manualFallback) {
            Payment sourceDeposit = originalOnlineDeposit.orElseThrow(() -> BusinessException.badRequest(
                    "ORIGINAL_DEPOSIT_TRANSACTION_MISSING",
                    "Không tìm thấy mã giao dịch của khoản đặt cọc VNPay gốc để thực hiện hoàn tiền trực tuyến"));

            Payment.PaymentMethod sourceMethod = sourceDeposit.getMethod();
            String providerLabel = formatProviderLabel(sourceMethod);

            OnlinePaymentGateway gateway = gatewayRegistry.resolveByMethod(sourceMethod)
                    .orElseThrow(() -> BusinessException.badRequest(
                            "UNSUPPORTED_PAYMENT_PROVIDER", "Cổng thanh toán " + providerLabel + " chưa được cấu hình"));

            // Sinh 1 mã duy nhất Alphanumeric[1,32] dùng chung làm vnp_RequestId gửi VNPay và lưu vào payments.provider_order_id
            String refundRequestId = generateRefundRequestId(payment.getId());
            String description = note != null ? note : ("Hoan tien dat coc booking " + payment.getBookingId());

            GatewayRefundResult refundResult = gateway.refundPayment(new GatewayRefundCommand(
                    refundRequestId,
                    sourceDeposit.getProviderOrderId(),
                    sourceDeposit.getProviderTransId(),
                    sourceDeposit.getAmount(),
                    payment.getAmount(),
                    description,
                    "manager" + principal.getId()
            ));

            Instant confirmedAt = Instant.now();
            payment.setMethod(sourceMethod);
            payment.setProviderOrderId(truncate(refundResult.requestId(), PAYMENT_PROVIDER_ORDER_ID_MAX_LENGTH));
            payment.setProviderTransId(truncate(refundResult.refundProviderTransId(), PAYMENT_PROVIDER_TRANS_ID_MAX_LENGTH));
            payment.setReferenceCode(truncate(refundResult.refundProviderTransId(), PAYMENT_REFERENCE_CODE_MAX_LENGTH));
            payment.setStatus(Payment.PaymentStatus.CONFIRMED);
            payment.setConfirmedBy(principal.getId());
            payment.setConfirmedAt(LocalDateTime.ofInstant(confirmedAt, ZoneOffset.UTC));
            payment.setNote(note != null ? note : ("Hoàn tiền tự động qua cổng " + providerLabel));

            paymentRepository.saveAndFlush(payment);
            return new ConfirmRefundResponse(
                    payment.getId(),
                    payment.getMethod(),
                    payment.getStatus(),
                    payment.getProviderOrderId(),
                    payment.getProviderTransId(),
                    confirmedAt
            );
        }

        // Nhánh 2: Đơn cọc thủ công (CASH / BANK_TRANSFER) HOẶC Manager chọn hoàn thủ công dự phòng khi cổng VNPay lỗi
        if (manualFallback) {
            Payment.PaymentMethod resolvedMethod = request.fallbackMethod() == null
                    ? Payment.PaymentMethod.BANK_TRANSFER
                    : request.fallbackMethod();
            if (resolvedMethod != Payment.PaymentMethod.BANK_TRANSFER && resolvedMethod != Payment.PaymentMethod.CASH) {
                throw BusinessException.badRequest(
                        "INVALID_PAYMENT_METHOD",
                        "Phương thức hoàn tiền thủ công dự phòng chỉ hỗ trợ BANK_TRANSFER hoặc CASH");
            }
            payment.setMethod(resolvedMethod);
            payment.setProviderOrderId(null);
            payment.setProviderTransId(null);
        }

        Instant confirmedAt = Instant.now();
        payment.setStatus(Payment.PaymentStatus.CONFIRMED);
        payment.setConfirmedBy(principal.getId());
        payment.setConfirmedAt(LocalDateTime.ofInstant(confirmedAt, ZoneOffset.UTC));

        String referenceCode = trimToNull(request == null ? null : request.referenceCode());
        if (referenceCode != null) {
            payment.setReferenceCode(referenceCode);
        }
        if (note != null) {
            payment.setNote(note);
        } else if (manualFallback) {
            payment.setNote("Hoàn tiền thủ công dự phòng (cổng VNPay gặp sự cố)");
        }

        paymentRepository.saveAndFlush(payment);
        return new ConfirmRefundResponse(
                payment.getId(),
                payment.getMethod(),
                payment.getStatus(),
                payment.getProviderOrderId(),
                payment.getProviderTransId(),
                confirmedAt
        );
    }

    /** Sinh mã yêu cầu hoàn tiền thuần chữ-số (Alphanumeric[1,32]) khớp chuẩn vnp_RequestId của VNPay v2.1.0. */
    private String generateRefundRequestId(Long paymentId) {
        String ts = LocalDateTime.now(VN_ZONE).format(REFUND_REQ_TS_FORMAT);
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 4).toUpperCase(Locale.ROOT);
        int maxLen = Math.min(VNPAY_REQUEST_ID_MAX_LENGTH, PAYMENT_PROVIDER_ORDER_ID_MAX_LENGTH);
        return truncate("REF" + paymentId + ts + suffix, maxLen);
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String formatProviderLabel(Payment.PaymentMethod method) {
        if (method == Payment.PaymentMethod.VNPAY) {
            return "VNPay";
        }
        return method == null ? "trực tuyến" : method.name();
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
