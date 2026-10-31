package vn.edu.hust.homestay.booking.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
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

    @Size(max = 500)
    private String note;
}
