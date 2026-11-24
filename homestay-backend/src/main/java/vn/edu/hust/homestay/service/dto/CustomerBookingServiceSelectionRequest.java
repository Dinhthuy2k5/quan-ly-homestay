package vn.edu.hust.homestay.service.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

import static vn.edu.hust.homestay.common.constant.ValidationConstants.BOOKING_SERVICE_NOTE_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.BOOKING_SERVICE_QUANTITY_MIN;

/** Optional service selected in the same transaction as API-CUS-01 booking creation. */
public record CustomerBookingServiceSelectionRequest(
        @NotNull @Positive Long roomId,
        @NotNull @Positive Long serviceId,
        @NotNull @Min(BOOKING_SERVICE_QUANTITY_MIN) Integer quantity,
        LocalDate serviceDate,
        @Size(max = BOOKING_SERVICE_NOTE_MAX_LENGTH) String note
) {}
