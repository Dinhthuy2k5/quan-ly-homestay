package vn.edu.hust.homestay.booking.dto;

import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;
import vn.edu.hust.homestay.payment.entity.Payment.PaymentStatus;
import vn.edu.hust.homestay.payment.entity.Payment.PaymentType;

public record DepositSubmissionResponse(
        Long paymentId,
        Long bookingId,
        PaymentType type,
        Long amount,
        PaymentStatus status,
        BookingStatus bookingStatus
) {}
