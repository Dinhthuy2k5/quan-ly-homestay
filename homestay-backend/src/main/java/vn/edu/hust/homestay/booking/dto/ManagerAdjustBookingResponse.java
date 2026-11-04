package vn.edu.hust.homestay.booking.dto;

import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Response DTO cho API-MGR-BOOK-04: Điều chỉnh booking.
 */
public record ManagerAdjustBookingResponse(
        Long id,
        Long bookingId,
        String code,
        BookingStatus status,
        LocalDate checkInDate,
        LocalDate checkOutDate,
        Integer guestCount,
        List<Long> roomIds,
        Long roomTotalPrice,
        Long depositAmount,
        OffsetDateTime updatedAt
) {
    public ManagerAdjustBookingResponse(
            Long id,
            String code,
            BookingStatus status,
            LocalDate checkInDate,
            LocalDate checkOutDate,
            Integer guestCount,
            List<Long> roomIds,
            Long roomTotalPrice,
            Long depositAmount,
            OffsetDateTime updatedAt
    ) {
        this(id, id, code, status, checkInDate, checkOutDate, guestCount, roomIds, roomTotalPrice, depositAmount, updatedAt);
    }
}
