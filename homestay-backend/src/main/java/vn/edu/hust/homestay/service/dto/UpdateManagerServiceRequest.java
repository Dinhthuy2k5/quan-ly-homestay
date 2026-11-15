package vn.edu.hust.homestay.service.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import vn.edu.hust.homestay.service.entity.Service.ServiceStatus;

public record UpdateManagerServiceRequest(
        @Schema(description = "Mã danh mục dịch vụ mới (nếu muốn chuyển danh mục)", example = "2")
        Long categoryId,

        @Schema(description = "Tên dịch vụ mới", example = "Bữa sáng cao cấp")
        @Size(max = 150, message = "Tên dịch vụ không được vượt quá 150 ký tự")
        String name,

        @Schema(description = "Đơn vị tính", example = "suất")
        @Size(max = 30, message = "Đơn vị tính không được vượt quá 30 ký tự")
        String unit,

        @Schema(description = "Đơn giá (VNĐ)", example = "110000")
        @Min(value = 0, message = "Đơn giá phải lớn hơn hoặc bằng 0")
        @Max(value = 1_000_000_000L, message = "Đơn giá không được vượt quá 1.000.000.000 VNĐ")
        Long unitPrice,

        @Schema(description = "Mô tả chi tiết", example = "Bữa sáng tiêu chuẩn với cà phê")
        @Size(max = 255, message = "Mô tả không được vượt quá 255 ký tự")
        String description,

        @Schema(description = "Trạng thái dịch vụ: ACTIVE hoặc INACTIVE", example = "ACTIVE")
        ServiceStatus status
) {
}
