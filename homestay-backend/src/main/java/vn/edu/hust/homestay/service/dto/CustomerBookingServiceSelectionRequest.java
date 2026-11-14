package vn.edu.hust.homestay.service.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** Optional service selected in the same transaction as API-CUS-01 booking creation. */
public record CustomerBookingServiceSelectionRequest(
        @NotNull @Positive Long roomId,
        @NotNull @Positive Long serviceId,
        @NotNull @Min(1) Integer quantity,
        LocalDate serviceDate,
        @Size(max = 255) String note
) {}
