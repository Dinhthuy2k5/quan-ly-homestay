package vn.edu.hust.homestay.booking.dto;

import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;
import vn.edu.hust.homestay.payment.entity.Payment.PaymentStatus;

import java.time.Instant;

/**
 * Response DTO cho API-MGR-BOOK-05: Kết quả duyệt/từ chối đặt cọc.
 */
public record DepositReviewResponse(
        Long bookingId,
        BookingStatus bookingStatus,
        Long paymentId,
        PaymentStatus paymentStatus,
        Instant approvedAt,
        String rejectionReason
) {
    public DepositReviewResponse(
            Long bookingId,
            BookingStatus bookingStatus,
            Long paymentId,
            PaymentStatus paymentStatus,
            Instant approvedAt
    ) {
        this(bookingId, bookingStatus, paymentId, paymentStatus, approvedAt, null);
    }
}
