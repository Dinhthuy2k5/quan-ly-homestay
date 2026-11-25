package vn.edu.hust.homestay.payment.dto;

import vn.edu.hust.homestay.payment.entity.Payment.PaymentMethod;
import vn.edu.hust.homestay.payment.entity.Payment.PaymentStatus;

import java.time.Instant;

/**
 * Response cho API-PAY-04: trả kết quả xác nhận hoàn tiền (trực tuyến qua VNPay hoặc thủ công).
 */
public record ConfirmRefundResponse(
        Long paymentId,
        PaymentMethod method,
        PaymentStatus status,
        String providerOrderId,
        String providerTransId,
        Instant confirmedAt
) {}
