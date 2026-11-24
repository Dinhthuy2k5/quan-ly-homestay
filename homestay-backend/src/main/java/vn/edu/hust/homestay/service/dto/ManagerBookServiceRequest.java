package vn.edu.hust.homestay.service.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

import static vn.edu.hust.homestay.common.constant.ValidationConstants.BOOKING_SERVICE_NOTE_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.BOOKING_SERVICE_QUANTITY_MAX;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.BOOKING_SERVICE_QUANTITY_MIN;

public record ManagerBookServiceRequest(
        @NotNull(message = "Mã phòng không được để trống")
        @Positive(message = "Mã phòng không hợp lệ")
        Long roomId,

        @NotNull(message = "Mã dịch vụ không được để trống")
        @Positive(message = "Mã dịch vụ không hợp lệ")
        Long serviceId,

        @NotNull(message = "Số lượng không được để trống")
        @Min(value = BOOKING_SERVICE_QUANTITY_MIN, message = "Số lượng dịch vụ tối thiểu là " + BOOKING_SERVICE_QUANTITY_MIN)
        @Max(value = BOOKING_SERVICE_QUANTITY_MAX, message = "Số lượng dịch vụ tối đa là " + BOOKING_SERVICE_QUANTITY_MAX)
        Integer quantity,

        LocalDate serviceDate,

        @Size(max = BOOKING_SERVICE_NOTE_MAX_LENGTH, message = "Ghi chú dịch vụ không vượt quá " + BOOKING_SERVICE_NOTE_MAX_LENGTH + " ký tự")
        String note
) {}
