package vn.edu.hust.homestay.booking.dto;

import jakarta.validation.constraints.Size;

public record CancelBookingRequest(
        @Size(max = 255, message = "Lý do hủy không được vượt quá 255 ký tự")
        String reason
) {}
