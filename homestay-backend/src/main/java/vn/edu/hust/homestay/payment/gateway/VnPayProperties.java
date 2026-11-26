package vn.edu.hust.homestay.payment.gateway;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Cấu hình cổng thanh toán VNPay API v2.1.0 (Sandbox / Production) đọc từ application.yaml / .env.
 * Đăng ký tài khoản Sandbox miễn phí tại https://sandbox.vnpayment.vn/devreg/ để nhận tmnCode và hashSecret.
 */
@Component
@ConfigurationProperties(prefix = "app.payment.vnpay")
@Getter
@Setter
public class VnPayProperties {

    /** URL trang thanh toán redirect của VNPay (Sandbox: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html). */
    private String payUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

    /** URL API server-to-server cho querydr và refund (Sandbox: https://sandbox.vnpayment.vn/merchant_webapi/api/transaction). */
    private String apiUrl = "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction";

    /** Mã website merchant (vnp_TmnCode) do VNPay cấp qua email đăng ký Sandbox. */
    private String tmnCode = "";

    /** Chuỗi bí mật tạo checksum HMAC-SHA512 (vnp_HashSecret) do VNPay cấp. */
    private String hashSecret = "";

    /** Địa chỉ IP mặc định gửi trong yêu cầu VNPay khi chạy môi trường nội bộ. */
    private String ipAddr = "127.0.0.1";

    /** Thời gian chờ kết nối TCP sang VNPay (ms). */
    private int connectTimeoutMs = 10_000;

    /** Thời gian chờ phản hồi HTTP từ VNPay (ms). */
    private int readTimeoutMs = 15_000;
}
