package vn.edu.hust.homestay.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import vn.edu.hust.homestay.auth.entity.Role;
import vn.edu.hust.homestay.auth.entity.User;

/**
 * Mã API: API-AUTH-01
 * Tên API: Đăng ký Customer
 * Response DTO trả về thông tin tài khoản vừa tạo.
 * Ngày thực hiện: 18/10/2026
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterResponse {

    private Long id;
    private String email;
    private String fullName;
    private Role role;

    public static RegisterResponse from(User user) {
        return RegisterResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .build();
    }
}
