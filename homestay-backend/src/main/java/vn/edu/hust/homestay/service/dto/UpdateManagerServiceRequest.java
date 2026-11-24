package vn.edu.hust.homestay.service.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import vn.edu.hust.homestay.service.entity.Service.ServiceStatus;

import static vn.edu.hust.homestay.common.constant.ValidationConstants.SERVICE_DESCRIPTION_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.SERVICE_NAME_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.SERVICE_UNIT_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.SERVICE_UNIT_PRICE_MAX;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.SERVICE_UNIT_PRICE_MIN;

public record UpdateManagerServiceRequest(
        @Schema(description = "Mã danh mục dịch vụ mới (nếu muốn chuyển danh mục)", example = "2")
        Long categoryId,

        @Schema(description = "Tên dịch vụ mới", example = "Bữa sáng cao cấp")
        @Size(max = SERVICE_NAME_MAX_LENGTH, message = "Tên dịch vụ không được vượt quá " + SERVICE_NAME_MAX_LENGTH + " ký tự")
        String name,

        @Schema(description = "Đơn vị tính", example = "suất")
        @Size(max = SERVICE_UNIT_MAX_LENGTH, message = "Đơn vị tính không được vượt quá " + SERVICE_UNIT_MAX_LENGTH + " ký tự")
        String unit,

        @Schema(description = "Đơn giá (VNĐ)", example = "110000")
        @Min(value = SERVICE_UNIT_PRICE_MIN, message = "Đơn giá phải lớn hơn hoặc bằng " + SERVICE_UNIT_PRICE_MIN)
        @Max(value = SERVICE_UNIT_PRICE_MAX, message = "Đơn giá không được vượt quá 1.000.000.000 VNĐ")
        Long unitPrice,

        @Schema(description = "Mô tả chi tiết", example = "Bữa sáng tiêu chuẩn với cà phê")
        @Size(max = SERVICE_DESCRIPTION_MAX_LENGTH, message = "Mô tả không được vượt quá " + SERVICE_DESCRIPTION_MAX_LENGTH + " ký tự")
        String description,

        @Schema(description = "Trạng thái dịch vụ: ACTIVE hoặc INACTIVE", example = "ACTIVE")
        ServiceStatus status
) {
}
