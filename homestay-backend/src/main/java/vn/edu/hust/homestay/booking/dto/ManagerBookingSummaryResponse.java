package vn.edu.hust.homestay.booking.dto;

import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Response DTO cho API-MGR-BOOK-01: Danh sách booking cơ sở.
 * Phục vụ Manager tra cứu và quản lý đơn đặt phòng tại homestay được giao.
 */
public record ManagerBookingSummaryResponse(
        Long id,
        String code,
        String contactName,
        String contactPhone,
        String contactEmail,
        BookingStatus status,
        LocalDate checkInDate,
        LocalDate checkOutDate,
        Short guestCount,
        Long roomTotalPrice,
        Long depositAmount,
        OffsetDateTime holdExpiresAt,
        Instant createdAt,
        String source,
        List<BookingRoomSummary> rooms
) {
    public record BookingRoomSummary(
            Long roomId,
            String roomName
    ) {}
}
