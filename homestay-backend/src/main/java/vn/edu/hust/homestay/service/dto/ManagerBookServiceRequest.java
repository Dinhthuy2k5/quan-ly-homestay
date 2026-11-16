package vn.edu.hust.homestay.service.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record ManagerBookServiceRequest(
        @NotNull(message = "Mã phòng không được để trống")
        @Positive(message = "Mã phòng không hợp lệ")
        Long roomId,

        @NotNull(message = "Mã dịch vụ không được để trống")
        @Positive(message = "Mã dịch vụ không hợp lệ")
        Long serviceId,

        @NotNull(message = "Số lượng không được để trống")
        @Min(value = 1, message = "Số lượng dịch vụ tối thiểu là 1")
        @Max(value = 100, message = "Số lượng dịch vụ tối đa là 100")
        Integer quantity,

        LocalDate serviceDate,

        @Size(max = 255, message = "Ghi chú dịch vụ không vượt quá 255 ký tự")
        String note
) {}
