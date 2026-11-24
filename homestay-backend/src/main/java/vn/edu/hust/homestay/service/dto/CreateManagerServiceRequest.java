package vn.edu.hust.homestay.service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import static vn.edu.hust.homestay.common.constant.ValidationConstants.SERVICE_DESCRIPTION_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.SERVICE_NAME_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.SERVICE_UNIT_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.SERVICE_UNIT_PRICE_MAX;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.SERVICE_UNIT_PRICE_MIN;

public record CreateManagerServiceRequest(
        @JsonProperty("categoryId")
        @NotNull(message = "Danh mục dịch vụ không được để trống")
        @Min(value = 1, message = "Mã danh mục dịch vụ không hợp lệ")
        Long categoryId,

        @JsonProperty("name")
        @NotBlank(message = "Tên dịch vụ không được để trống")
        @Size(max = SERVICE_NAME_MAX_LENGTH, message = "Tên dịch vụ không được vượt quá " + SERVICE_NAME_MAX_LENGTH + " ký tự")
        String name,

        @JsonProperty("unit")
        @NotBlank(message = "Đơn vị tính không được để trống")
        @Size(max = SERVICE_UNIT_MAX_LENGTH, message = "Đơn vị tính không được vượt quá " + SERVICE_UNIT_MAX_LENGTH + " ký tự")
        String unit,

        @JsonProperty("unitPrice")
        @NotNull(message = "Đơn giá không được để trống")
        @Min(value = SERVICE_UNIT_PRICE_MIN, message = "Đơn giá phải lớn hơn hoặc bằng " + SERVICE_UNIT_PRICE_MIN)
        @Max(value = SERVICE_UNIT_PRICE_MAX, message = "Đơn giá không được vượt quá 1.000.000.000 VNĐ")
        Long unitPrice,

        @JsonProperty("description")
        @Size(max = SERVICE_DESCRIPTION_MAX_LENGTH, message = "Mô tả không được vượt quá " + SERVICE_DESCRIPTION_MAX_LENGTH + " ký tự")
        String description
) {}
