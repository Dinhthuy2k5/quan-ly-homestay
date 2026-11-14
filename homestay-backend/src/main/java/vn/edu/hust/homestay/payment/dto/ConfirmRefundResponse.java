package vn.edu.hust.homestay.payment.dto;

import vn.edu.hust.homestay.payment.entity.Payment.PaymentStatus;

import java.time.Instant;

public record ConfirmRefundResponse(
        Long paymentId,
        PaymentStatus status,
        Instant confirmedAt
) {}
