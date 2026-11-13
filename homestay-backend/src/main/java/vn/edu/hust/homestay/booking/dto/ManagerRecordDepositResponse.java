package vn.edu.hust.homestay.booking.dto;

import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;
import vn.edu.hust.homestay.payment.entity.Payment.PaymentMethod;
import vn.edu.hust.homestay.payment.entity.Payment.PaymentStatus;
import vn.edu.hust.homestay.payment.entity.Payment.PaymentType;

public record ManagerRecordDepositResponse(
        Long paymentId,
        Long bookingId,
        PaymentType type,
        Long amount,
        PaymentMethod method,
        PaymentStatus status,
        BookingStatus bookingStatus,
        String referenceCode
) {
    public ManagerRecordDepositResponse(Long paymentId, Long bookingId, PaymentType type, Long amount, PaymentMethod method, PaymentStatus status, BookingStatus bookingStatus) {
        this(paymentId, bookingId, type, amount, method, status, bookingStatus, null);
    }
}
