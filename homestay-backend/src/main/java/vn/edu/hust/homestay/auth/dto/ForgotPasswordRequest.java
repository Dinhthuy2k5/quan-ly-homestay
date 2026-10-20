package vn.edu.hust.homestay.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Mã API: API-AUTH-05
 * Tên API: Yêu cầu đặt lại mật khẩu
 * Request DTO gửi yêu cầu đặt lại mật khẩu qua email.
 * Ngày thực hiện: 18/10/2026
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ForgotPasswordRequest {

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    private String email;
}
