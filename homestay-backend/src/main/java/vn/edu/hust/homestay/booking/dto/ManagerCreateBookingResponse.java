package vn.edu.hust.homestay.booking.dto;

import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * Response DTO cho API-MGR-BOOK-02: Đặt phòng hộ khách.
 */
public record ManagerCreateBookingResponse(
        Long id,
        String code,
        String source,
        BookingStatus status,
        LocalDate checkInDate,
        LocalDate checkOutDate,
        Long roomTotalPrice,
        Long depositAmount,
        OffsetDateTime holdExpiresAt
) {}
