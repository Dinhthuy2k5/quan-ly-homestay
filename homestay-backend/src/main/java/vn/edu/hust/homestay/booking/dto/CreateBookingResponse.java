package vn.edu.hust.homestay.booking.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record CreateBookingResponse(
        Long id,
        String code,
        BookingStatus status,
        Long roomTotalPrice,
        Long depositAmount,
        OffsetDateTime holdExpiresAt,
        LocalDate checkInDate,
        LocalDate checkOutDate,
        PaymentInstruction paymentInstruction
) {
    @JsonProperty("bookingId")
    public Long bookingId() {
        return id;
    }

    public record PaymentInstruction(
            String bankName,
            String bankAccountNumber,
            String bankAccountHolder,
            String transferContent
    ) {}
}
