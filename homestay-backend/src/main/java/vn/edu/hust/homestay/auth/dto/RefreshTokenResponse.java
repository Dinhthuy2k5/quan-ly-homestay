package vn.edu.hust.homestay.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Mã API: API-AUTH-03
 * Tên API: Refresh token
 * Response DTO trả về token mới sau khi xoay vòng refresh token.
 * Ngày thực hiện: 18/10/2026
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshTokenResponse {

    private String accessToken;
    private String refreshToken;
    @Builder.Default
    private String tokenType = "Bearer";
    private Long expiresIn;
}
