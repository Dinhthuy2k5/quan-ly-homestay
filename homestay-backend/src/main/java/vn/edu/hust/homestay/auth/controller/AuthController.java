package vn.edu.hust.homestay.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.hust.homestay.auth.dto.*;
import vn.edu.hust.homestay.auth.service.AuthService;
import vn.edu.hust.homestay.common.response.ApiResponse;

import java.util.Map;

/**
 * Controller phục vụ các API Xác thực và Quản lý phiên (Tuần 2).
 * Quyền truy cập: PUBLIC (ngoại trừ logout yêu cầu đã đăng nhập).
 * Ngày thực hiện: 18/10/2026
 */
@Tag(name = "Auth", description = "Các API xác thực: đăng ký, đăng nhập, refresh token, đăng xuất, quên/đặt lại mật khẩu")
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Mã API: API-AUTH-01
     * Tên API: Đăng ký Customer
     * Phương thức: POST
     * Đường dẫn: /api/v1/auth/register
     * Quyền: PUBLIC
     * Ngày thực hiện: 18/10/2026
     */
    @Operation(summary = "API-AUTH-01: Đăng ký tài khoản khách hàng (Customer)")
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<RegisterResponse>> register(@Valid @RequestBody RegisterRequest req) {
        RegisterResponse res = authService.register(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(res));
    }

    /**
     * Mã API: API-AUTH-02
     * Tên API: Đăng nhập
     * Phương thức: POST
     * Đường dẫn: /api/v1/auth/login
     * Quyền: PUBLIC
     * Ngày thực hiện: 18/10/2026
     */
    @Operation(summary = "API-AUTH-02: Đăng nhập hệ thống bằng email và mật khẩu")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest req) {
        AuthResponse res = authService.login(req);
        return ResponseEntity.ok(ApiResponse.ok(res));
    }

    /**
     * Mã API: API-AUTH-03
     * Tên API: Refresh token
     * Phương thức: POST
     * Đường dẫn: /api/v1/auth/refresh
     * Quyền: PUBLIC
     * Ngày thực hiện: 18/10/2026
     */
    @Operation(summary = "API-AUTH-03: Cấp access token mới từ refresh token")
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<RefreshTokenResponse>> refresh(@Valid @RequestBody RefreshTokenRequest req) {
        RefreshTokenResponse res = authService.refresh(req);
        return ResponseEntity.ok(ApiResponse.ok(res));
    }

    /**
     * Mã API: API-AUTH-04
     * Tên API: Đăng xuất
     * Phương thức: POST
     * Đường dẫn: /api/v1/auth/logout
     * Quyền: Đã đăng nhập
     * Ngày thực hiện: 18/10/2026
     */
    @Operation(summary = "API-AUTH-04: Đăng xuất và thu hồi refresh token của phiên hiện tại")
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> logout(@Valid @RequestBody LogoutRequest req) {
        Map<String, Boolean> res = authService.logout(req);
        return ResponseEntity.ok(ApiResponse.ok(res));
    }

    /**
     * Mã API: API-AUTH-05
     * Tên API: Yêu cầu đặt lại mật khẩu
     * Phương thức: POST
     * Đường dẫn: /api/v1/auth/forgot-password
     * Quyền: PUBLIC
     * Ngày thực hiện: 18/10/2026
     */
    @Operation(summary = "API-AUTH-05: Yêu cầu đặt lại mật khẩu qua email")
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Map<String, String>>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        Map<String, String> res = authService.forgotPassword(req);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiResponse.ok(res));
    }

    /**
     * Mã API: API-AUTH-06
     * Tên API: Đặt lại mật khẩu
     * Phương thức: POST
     * Đường dẫn: /api/v1/auth/reset-password
     * Quyền: PUBLIC
     * Ngày thực hiện: 18/10/2026
     */
    @Operation(summary = "API-AUTH-06: Đặt lại mật khẩu bằng reset token")
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        Map<String, Boolean> res = authService.resetPassword(req);
        return ResponseEntity.ok(ApiResponse.ok(res));
    }
}
