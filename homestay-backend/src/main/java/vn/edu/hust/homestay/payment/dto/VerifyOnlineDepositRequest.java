package vn.edu.hust.homestay.payment.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.Map;

/**
 * Request tùy chọn khi Frontend gọi xác thực kết quả đặt cọc trực tuyến (API-PAY-06).
 * - providerOrderId: mã đơn gửi sang cổng (dùng cho VNPay khi Return URL trả về vnp_TxnRef).
 * - gatewayParams: tập tham số callback có chữ ký mật mã (ví dụ vnp_* kèm vnp_SecureHash của VNPay).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record VerifyOnlineDepositRequest(
        String providerOrderId,
        Map<String, String> gatewayParams
) {}
