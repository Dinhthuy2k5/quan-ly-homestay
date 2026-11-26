package vn.edu.hust.homestay.payment.gateway;

import vn.edu.hust.homestay.payment.entity.Payment;

import java.util.Map;
import java.util.Optional;

/**
 * Giao diện Strategy Pattern trừu tượng hóa cổng thanh toán trực tuyến (VNPay Sandbox, ...).
 * Giúp tách hoàn toàn chi tiết gọi HTTP và ký xác thực HMAC khỏi tầng Service nghiệp vụ.
 */
public interface OnlinePaymentGateway {

    /** Mã nhà cung cấp chuẩn hóa in hoa (ví dụ: "VNPAY"). */
    String getProviderCode();

    /** Phương thức thanh toán tương ứng trong bảng payments. */
    Payment.PaymentMethod getSupportedMethod();

    /** Khởi tạo phiên đặt cọc trực tuyến và nhận về đường dẫn payUrl để chuyển hướng khách hàng. */
    GatewayCreateResult createDepositPayment(GatewayCreateCommand command);

    /** Chủ động truy vấn trạng thái giao dịch trực tiếp từ server cổng thanh toán (querydr). */
    GatewayQueryResult queryPayment(String providerOrderId);

    /**
     * Xác thực tham số redirect có chữ ký mật mã từ cổng (ví dụ VNPay vnp_SecureHash HMAC-SHA512).
     * Mặc định trả empty nếu cổng không hỗ trợ xác thực qua Return URL.
     */
    default Optional<GatewayQueryResult> verifySignedReturnParams(String providerOrderId, Map<String, String> params) {
        return Optional.empty();
    }

    /** Gọi API hoàn tiền tự động (hỗ trợ hoàn 100% hoặc một phần) theo mã giao dịch gốc của cổng. */
    GatewayRefundResult refundPayment(GatewayRefundCommand command);

    /** Dữ liệu đầu vào khi tạo phiên thanh toán đặt cọc. */
    record GatewayCreateCommand(
            String providerOrderId,
            long amount,
            String orderInfo,
            String redirectUrl,
            String extraData
    ) {}

    /** Kết quả tạo phiên thanh toán đặt cọc từ cổng. */
    record GatewayCreateResult(
            String providerOrderId,
            String payUrl,
            int resultCode,
            String message
    ) {}

    /** Kết quả truy vấn trạng thái giao dịch trực tiếp từ server cổng (querydr). */
    record GatewayQueryResult(
            String providerOrderId,
            int resultCode,
            String providerTransId,
            Long amount,
            String message,
            GatewayTxState state
    ) {}

    /** Trạng thái nghiệp vụ chuẩn hóa từ mã kết quả của từng cổng thanh toán. */
    enum GatewayTxState {
        /** Giao dịch đã trừ tiền thành công. */
        SUCCEEDED,
        /** Khách đang thao tác hoặc cổng đang xử lý, chưa có kết quả cuối cùng. */
        PENDING,
        /** Giao dịch bị hủy, hết hạn hoặc thất bại. */
        FAILED
    }

    /** Dữ liệu đầu vào khi gọi API hoàn tiền của cổng thanh toán (requestId dùng chung cho vnp_RequestId và payments.provider_order_id). */
    record GatewayRefundCommand(
            String requestId,
            String originalProviderOrderId,
            String originalProviderTransId,
            long originalDepositAmount,
            long amount,
            String description,
            String createdBy
    ) {}

    /** Kết quả gọi API hoàn tiền từ cổng. */
    record GatewayRefundResult(
            String requestId,
            String refundProviderTransId,
            int resultCode,
            String message
    ) {}
}
