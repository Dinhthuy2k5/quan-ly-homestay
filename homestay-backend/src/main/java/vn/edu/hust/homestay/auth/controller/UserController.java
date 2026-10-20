package vn.edu.hust.homestay.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.edu.hust.homestay.auth.dto.ChangePasswordRequest;
import vn.edu.hust.homestay.auth.dto.UpdateProfileRequest;
import vn.edu.hust.homestay.auth.dto.UpdateProfileResponse;
import vn.edu.hust.homestay.auth.dto.UserProfileResponse;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.auth.service.UserService;
import vn.edu.hust.homestay.common.response.ApiResponse;

import java.util.Map;

/**
 * Controller phục vụ các API Quản lý tài khoản cá nhân (/api/v1/me) (Tuần 2).
 * Quyền truy cập: Yêu cầu đăng nhập (Authenticated).
 * Ngày thực hiện: 18/10/2026
 */
@Tag(name = "User — Me", description = "Các API xem/cập nhật hồ sơ cá nhân và đổi mật khẩu")
@RestController
@RequestMapping("/api/v1/me")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Mã API: API-USER-01
     * Tên API: Xem hồ sơ của mình
     * Phương thức: GET
     * Đường dẫn: /api/v1/me
     * Quyền: Đã đăng nhập
     * Ngày thực hiện: 18/10/2026
     */
    @Operation(summary = "API-USER-01: Xem thông tin hồ sơ của tài khoản đang đăng nhập")
    @GetMapping
    public ResponseEntity<ApiResponse<UserProfileResponse>> getProfile(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserProfileResponse res = userService.getProfile(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(res));
    }

    /**
     * Mã API: API-USER-02
     * Tên API: Cập nhật hồ sơ
     * Phương thức: PATCH
     * Đường dẫn: /api/v1/me
     * Quyền: Đã đăng nhập
     * Ngày thực hiện: 18/10/2026
     */
    @Operation(summary = "API-USER-02: Cập nhật thông tin họ tên và số điện thoại của mình")
    @PatchMapping
    public ResponseEntity<ApiResponse<UpdateProfileResponse>> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest req
    ) {
        UpdateProfileResponse res = userService.updateProfile(principal.getId(), req);
        return ResponseEntity.ok(ApiResponse.ok(res));
    }

    /**
     * Mã API: API-USER-03
     * Tên API: Đổi mật khẩu
     * Phương thức: PATCH
     * Đường dẫn: /api/v1/me/password
     * Quyền: Đã đăng nhập
     * Ngày thực hiện: 18/10/2026
     */
    @Operation(summary = "API-USER-03: Đổi mật khẩu tài khoản khi biết mật khẩu hiện tại")
    @PatchMapping("/password")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> changePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest req
    ) {
        Map<String, Boolean> res = userService.changePassword(principal.getId(), req);
        return ResponseEntity.ok(ApiResponse.ok(res));
    }
}
