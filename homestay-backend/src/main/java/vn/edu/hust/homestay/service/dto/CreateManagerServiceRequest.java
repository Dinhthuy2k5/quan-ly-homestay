package vn.edu.hust.homestay.service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateManagerServiceRequest(
        @JsonProperty("categoryId")
        @NotNull(message = "Danh mục dịch vụ không được để trống")
        @Min(value = 1, message = "Mã danh mục dịch vụ không hợp lệ")
        Long categoryId,

        @JsonProperty("name")
        @NotBlank(message = "Tên dịch vụ không được để trống")
        @Size(max = 150, message = "Tên dịch vụ không được vượt quá 150 ký tự")
        String name,

        @JsonProperty("unit")
        @NotBlank(message = "Đơn vị tính không được để trống")
        @Size(max = 30, message = "Đơn vị tính không được vượt quá 30 ký tự")
        String unit,

        @JsonProperty("unitPrice")
        @NotNull(message = "Đơn giá không được để trống")
        @Min(value = 0, message = "Đơn giá phải lớn hơn hoặc bằng 0")
        @Max(value = 1_000_000_000L, message = "Đơn giá không được vượt quá 1.000.000.000 VNĐ")
        Long unitPrice,

        @JsonProperty("description")
        @Size(max = 255, message = "Mô tả không được vượt quá 255 ký tự")
        String description
) {}
