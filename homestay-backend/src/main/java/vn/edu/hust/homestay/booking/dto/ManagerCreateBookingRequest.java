package vn.edu.hust.homestay.booking.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import vn.edu.hust.homestay.service.dto.CustomerBookingServiceSelectionRequest;

import java.time.LocalDate;
import java.util.List;

import static vn.edu.hust.homestay.common.constant.ValidationConstants.BOOKING_GUEST_COUNT_MAX;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.BOOKING_GUEST_COUNT_MIN;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.BOOKING_NOTE_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.CONTACT_EMAIL_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.CONTACT_NAME_MAX_LENGTH;

/**
 * Request DTO cho API-MGR-BOOK-02: Đặt phòng hộ khách.
 * Manager tạo booking cho khách gọi điện hoặc đến trực tiếp tại cơ sở.
 */
@Builder
public record ManagerCreateBookingRequest(
        @NotBlank(message = "Tên liên hệ không được để trống")
        @Size(max = CONTACT_NAME_MAX_LENGTH, message = "Tên liên hệ không được quá " + CONTACT_NAME_MAX_LENGTH + " ký tự")
        String contactName,

        @NotBlank(message = "Số điện thoại không được để trống")
        @Pattern(regexp = "^0[0-9]{9}$", message = "Số điện thoại không đúng định dạng")
        String contactPhone,

        @Pattern(
                regexp = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
                message = "Email không đúng định dạng (ví dụ: user@example.com)"
        )
        @Size(max = CONTACT_EMAIL_MAX_LENGTH, message = "Email không được quá " + CONTACT_EMAIL_MAX_LENGTH + " ký tự")
        String contactEmail,

        @NotEmpty(message = "Danh sách phòng không được để trống")
        List<Long> roomIds,

        @NotNull(message = "Ngày nhận phòng không được để trống")
        LocalDate checkInDate,

        @NotNull(message = "Ngày trả phòng không được để trống")
        LocalDate checkOutDate,

        @NotNull(message = "Số lượng khách không được để trống")
        @Min(value = BOOKING_GUEST_COUNT_MIN, message = "Số lượng khách tối thiểu là " + BOOKING_GUEST_COUNT_MIN)
        @Max(value = BOOKING_GUEST_COUNT_MAX, message = "Số lượng khách tối đa là " + BOOKING_GUEST_COUNT_MAX)
        Integer guestCount,

        @Size(max = BOOKING_NOTE_MAX_LENGTH, message = "Ghi chú không được quá " + BOOKING_NOTE_MAX_LENGTH + " ký tự")
        String note,

        Long customerId,

        List<@Valid CustomerBookingServiceSelectionRequest> services
) {}
