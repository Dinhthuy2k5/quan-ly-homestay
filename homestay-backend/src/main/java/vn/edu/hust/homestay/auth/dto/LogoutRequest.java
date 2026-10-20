package vn.edu.hust.homestay.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Mã API: API-AUTH-04
 * Tên API: Đăng xuất
 * Request DTO đăng xuất và thu hồi refresh token.
 * Ngày thực hiện: 18/10/2026
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LogoutRequest {

    @NotBlank(message = "Refresh token không được để trống")
    private String refreshToken;
}
