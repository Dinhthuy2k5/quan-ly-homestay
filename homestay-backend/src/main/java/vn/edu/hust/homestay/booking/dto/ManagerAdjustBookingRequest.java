package vn.edu.hust.homestay.booking.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/**
 * Request DTO cho API-MGR-BOOK-04: Điều chỉnh booking dành cho Quản lý.
 * Các trường đều là tùy chọn (PATCH), nếu trường nào không truyền thì giữ nguyên giá trị cũ.
 */
public record ManagerAdjustBookingRequest(
        @Schema(description = "Ngày nhận phòng mới (YYYY-MM-DD)", example = "2026-11-01")
        LocalDate checkInDate,

        @Schema(description = "Ngày trả phòng mới (YYYY-MM-DD)", example = "2026-11-03")
        LocalDate checkOutDate,

        @Schema(description = "Danh sách ID phòng mới (nếu muốn thay đổi phòng)", example = "[101]")
        List<Long> roomIds,

        @Min(value = 1, message = "Số khách phải lớn hơn hoặc bằng 1")
        @Schema(description = "Số lượng khách dự kiến", example = "2")
        Integer guestCount,

        @Size(max = 500, message = "Lý do điều chỉnh tối đa 500 ký tự")
        @Schema(description = "Lý do điều chỉnh booking", example = "Khách yêu cầu kéo dài thời gian lưu trú")
        String reason
) {
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private LocalDate checkInDate;
        private LocalDate checkOutDate;
        private List<Long> roomIds;
        private Integer guestCount;
        private String reason;

        public Builder checkInDate(LocalDate checkInDate) {
            this.checkInDate = checkInDate;
            return this;
        }

        public Builder checkOutDate(LocalDate checkOutDate) {
            this.checkOutDate = checkOutDate;
            return this;
        }

        public Builder roomIds(List<Long> roomIds) {
            this.roomIds = roomIds;
            return this;
        }

        public Builder guestCount(Integer guestCount) {
            this.guestCount = guestCount;
            return this;
        }

        public Builder reason(String reason) {
            this.reason = reason;
            return this;
        }

        public ManagerAdjustBookingRequest build() {
            return new ManagerAdjustBookingRequest(checkInDate, checkOutDate, roomIds, guestCount, reason);
        }
    }
}
