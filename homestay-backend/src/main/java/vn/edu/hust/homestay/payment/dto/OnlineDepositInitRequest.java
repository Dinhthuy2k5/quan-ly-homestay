package vn.edu.hust.homestay.payment.dto;

import jakarta.validation.constraints.Size;

/**
 * Request khởi tạo phiên đặt cọc trực tuyến (API-PAY-05).
 * Mặc định sử dụng "VNPAY" nếu client không truyền trường provider.
 */
public record OnlineDepositInitRequest(
        @Size(max = 30) String provider
) {}
