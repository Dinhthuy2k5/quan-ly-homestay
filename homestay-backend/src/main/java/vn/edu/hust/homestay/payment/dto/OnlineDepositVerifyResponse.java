package vn.edu.hust.homestay.payment.dto;

import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;
import vn.edu.hust.homestay.payment.entity.Payment.PaymentMethod;
import vn.edu.hust.homestay.payment.entity.Payment.PaymentStatus;

import java.time.Instant;

/**
 * Response cho API-PAY-06: kết quả đối soát giao dịch đặt cọc trực tuyến với server cổng thanh toán (/query).
 */
public record OnlineDepositVerifyResponse(
        Long paymentId,
        Long bookingId,
        PaymentMethod method,
        PaymentStatus paymentStatus,
        BookingStatus bookingStatus,
        String providerOrderId,
        String providerTransId,
        Instant confirmedAt,
        Integer gatewayResultCode,
        String gatewayMessage,
        boolean latePaymentRefundCreated
) {}
