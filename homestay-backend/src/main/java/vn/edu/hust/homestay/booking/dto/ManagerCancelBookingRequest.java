package vn.edu.hust.homestay.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ManagerCancelBookingRequest(
        @NotBlank @Size(max = 239) String reason,
        @NotNull Boolean requestedByCustomer
) {}
