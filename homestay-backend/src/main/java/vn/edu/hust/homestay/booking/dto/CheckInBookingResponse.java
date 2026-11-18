package vn.edu.hust.homestay.booking.dto;

import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;

public record CheckInBookingResponse(
        Long bookingId,
        BookingStatus status
) {}
