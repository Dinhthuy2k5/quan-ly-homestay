package vn.edu.hust.homestay.booking.dto;

import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;

public record CancelBookingResponse(
        Long bookingId,
        BookingStatus status,
        long refundAmount
) {}
