package vn.edu.hust.homestay.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.PASSWORD_MIN_LENGTH;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Mã API: API-USER-03
 * Tên API: Đổi mật khẩu
 * Request DTO đổi mật khẩu khi biết mật khẩu hiện tại.
 * Ngày thực hiện: 18/10/2026
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangePasswordRequest {

    @NotBlank(message = "Mật khẩu hiện tại không được để trống")
    private String currentPassword;

    @NotBlank(message = "Mật khẩu mới không được để trống")
    @Size(min = PASSWORD_MIN_LENGTH, message = "Mật khẩu mới phải chứa ít nhất " + PASSWORD_MIN_LENGTH + " ký tự")
    private String newPassword;
}
