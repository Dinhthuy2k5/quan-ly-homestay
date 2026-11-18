package vn.edu.hust.homestay.booking.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record CheckInBookingRequest(
        @JsonProperty("actualGuestCount")
        @Min(value = 1, message = "Số lượng khách thực tế phải lớn hơn 0")
        Integer actualGuestCount,

        @JsonProperty("note")
        @Size(max = 255, message = "Ghi chú check-in không được vượt quá 255 ký tự")
        String note
) {}
