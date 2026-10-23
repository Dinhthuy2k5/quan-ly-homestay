package vn.edu.hust.homestay.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Mã API: API-AUTH-02
 * Tên API: Đăng nhập
 * Request DTO đăng nhập bằng email và mật khẩu.
 * Ngày thực hiện: 18/10/2026
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginRequest {

    @NotBlank(message = "Email không được để trống")
    @Pattern(
        regexp = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
        message = "Email không đúng định dạng (ví dụ: user@example.com)"
    )
    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    private String password;
}
