package vn.edu.hust.homestay.booking.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

/**
 * Request DTO cho API-MGR-BOOK-02: Đặt phòng hộ khách.
 * Manager tạo booking cho khách gọi điện hoặc đến trực tiếp tại cơ sở.
 */
@Builder
public record ManagerCreateBookingRequest(
        @NotBlank(message = "Tên liên hệ không được để trống")
        @Size(max = 100, message = "Tên liên hệ không được quá 100 ký tự")
        String contactName,

        @NotBlank(message = "Số điện thoại không được để trống")
        @Pattern(regexp = "^0[0-9]{9}$", message = "Số điện thoại không đúng định dạng")
        String contactPhone,

        @Pattern(
                regexp = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
                message = "Email không đúng định dạng (ví dụ: user@example.com)"
        )
        @Size(max = 150, message = "Email không được quá 150 ký tự")
        String contactEmail,

        @NotEmpty(message = "Danh sách phòng không được để trống")
        List<Long> roomIds,

        @NotNull(message = "Ngày nhận phòng không được để trống")
        LocalDate checkInDate,

        @NotNull(message = "Ngày trả phòng không được để trống")
        LocalDate checkOutDate,

        @NotNull(message = "Số lượng khách không được để trống")
        @Min(value = 1, message = "Số lượng khách tối thiểu là 1")
        @Max(value = 50, message = "Số lượng khách tối đa là 50")
        Integer guestCount,

        @Size(max = 500, message = "Ghi chú không được quá 500 ký tự")
        String note
) {}
