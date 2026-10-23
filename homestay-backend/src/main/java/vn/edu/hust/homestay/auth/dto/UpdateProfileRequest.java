package vn.edu.hust.homestay.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Mã API: API-USER-02
 * Tên API: Cập nhật hồ sơ
 * Request DTO cập nhật họ tên và số điện thoại.
 * Ngày thực hiện: 18/10/2026
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateProfileRequest {

    @NotBlank(message = "Họ và tên không được để trống")
    private String fullName;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(
        regexp = "^0[0-9]{9}$",
        message = "Số điện thoại không đúng định dạng (phải gồm 10 chữ số và bắt đầu bằng số 0, ví dụ: 0901234567)"
    )
    private String phone;
}
