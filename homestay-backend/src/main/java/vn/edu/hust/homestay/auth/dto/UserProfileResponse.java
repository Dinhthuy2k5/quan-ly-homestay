package vn.edu.hust.homestay.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import vn.edu.hust.homestay.auth.entity.Role;
import vn.edu.hust.homestay.auth.entity.User;

/**
 * Mã API: API-USER-01
 * Tên API: Xem hồ sơ của mình
 * Response DTO trả về hồ sơ tài khoản hiện tại.
 * Ngày thực hiện: 18/10/2026
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserProfileResponse {

    private Long id;
    private String email;
    private String fullName;
    private String phone;
    private Role role;
    private Long homestayId;

    public static UserProfileResponse from(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .role(user.getRole())
                .homestayId(user.getHomestayId())
                .build();
    }
}
