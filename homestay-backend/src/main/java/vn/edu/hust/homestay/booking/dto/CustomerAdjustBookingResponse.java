package vn.edu.hust.homestay.booking.dto;

import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;

import java.time.LocalDate;
import java.util.List;

/**
 * Response DTO cho API-CUS-09: Điều chỉnh đặt phòng cá nhân.
 */
public record CustomerAdjustBookingResponse(
        Long bookingId,
        String bookingCode,
        BookingStatus status,
        LocalDate checkInDate,
        LocalDate checkOutDate,
        Integer guestCount,
        List<Long> roomIds,
        Long roomTotalPrice,
        Long depositAmount
) {}
