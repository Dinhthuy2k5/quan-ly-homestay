package vn.edu.hust.homestay.booking.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.BOOKING_NOTE_MAX_LENGTH;
import jakarta.validation.Valid;
import vn.edu.hust.homestay.service.dto.CustomerBookingServiceSelectionRequest;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class CreateBookingRequest {

    @NotNull
    @Positive
    private Long homestayId;

    @NotEmpty
    private List<@NotNull @Positive Long> roomIds;

    @NotNull
    private LocalDate checkInDate;

    @NotNull
    private LocalDate checkOutDate;

    @NotNull
    @Positive
    private Integer guestCount;

    @Size(max = BOOKING_NOTE_MAX_LENGTH)
    private String note;

    private List<@Valid CustomerBookingServiceSelectionRequest> services;
}
