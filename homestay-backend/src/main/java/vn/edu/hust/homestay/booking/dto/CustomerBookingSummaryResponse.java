package vn.edu.hust.homestay.booking.dto;

import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record CustomerBookingSummaryResponse(
        Long id,
        String code,
        Long homestayId,
        String homestayName,
        String homestayProvince,
        BookingStatus status,
        Long roomTotalPrice,
        Long depositAmount,
        LocalDate checkInDate,
        LocalDate checkOutDate,
        Short guestCount,
        OffsetDateTime holdExpiresAt,
        Instant createdAt,
        List<BookingRoomSummary> rooms,
        CreateBookingResponse.PaymentInstruction paymentInstruction
) {
    public record BookingRoomSummary(
            Long roomId,
            String roomName,
            String coverImageUrl
    ) {}
}
