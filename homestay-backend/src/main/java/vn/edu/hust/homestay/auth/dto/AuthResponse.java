package vn.edu.hust.homestay.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Mã API: API-AUTH-02
 * Tên API: Đăng nhập
 * Response DTO trả về bộ token và thông tin user đăng nhập.
 * Ngày thực hiện: 18/10/2026
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String accessToken;
    private String refreshToken;
    @Builder.Default
    private String tokenType = "Bearer";
    private Long expiresIn;
    private UserSummaryResponse user;
}
