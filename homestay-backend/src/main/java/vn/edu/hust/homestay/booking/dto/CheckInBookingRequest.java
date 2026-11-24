package vn.edu.hust.homestay.booking.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import static vn.edu.hust.homestay.common.constant.ValidationConstants.BOOKING_GUEST_COUNT_MIN;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.CHECK_IN_NOTE_MAX_LENGTH;

public record CheckInBookingRequest(
        @JsonProperty("actualGuestCount")
        @Min(value = BOOKING_GUEST_COUNT_MIN, message = "Số lượng khách thực tế phải lớn hơn 0")
        Integer actualGuestCount,

        @JsonProperty("note")
        @Size(max = CHECK_IN_NOTE_MAX_LENGTH, message = "Ghi chú check-in không được vượt quá " + CHECK_IN_NOTE_MAX_LENGTH + " ký tự")
        String note
) {}
