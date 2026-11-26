package vn.edu.hust.homestay.payment.dto;

import vn.edu.hust.homestay.payment.entity.Payment.PaymentStatus;

/**
 * Response cho API-PAY-05: trả thông tin giao dịch vừa khởi tạo và đường dẫn payUrl để Frontend redirect sang cổng thanh toán.
 */
public record OnlineDepositInitResponse(
        Long paymentId,
        Long bookingId,
        String provider,
        Long amount,
        PaymentStatus status,
        String providerOrderId,
        String payUrl
) {}
