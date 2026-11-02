package vn.edu.hust.homestay.booking.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

/**
 * Request DTO cho API-CUS-09: Điều chỉnh đặt phòng cá nhân.
 * Chỉ gửi các trường cần thay đổi.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CustomerAdjustBookingRequest {

    @Schema(description = "Ngày nhận phòng mới (YYYY-MM-DD)", example = "2026-10-10")
    private LocalDate checkInDate;

    @Schema(description = "Ngày trả phòng mới (YYYY-MM-DD)", example = "2026-10-12")
    private LocalDate checkOutDate;

    @Min(value = 1, message = "Số khách phải lớn hơn hoặc bằng 1")
    @Schema(description = "Số lượng khách dự kiến", example = "2")
    private Integer guestCount;

    @Schema(description = "Danh sách ID phòng mới (nếu muốn đổi phòng)", example = "[101]")
    private List<Long> roomIds;
}
