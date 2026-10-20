package vn.edu.hust.homestay.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import vn.edu.hust.homestay.auth.entity.Role;
import vn.edu.hust.homestay.auth.entity.User;

/**
 * DTO tóm tắt người dùng đi kèm trong phiên đăng nhập.
 * Ngày thực hiện: 18/10/2026
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserSummaryResponse {

    private Long id;
    private String fullName;
    private Role role;
    private Long homestayId;

    public static UserSummaryResponse from(User user) {
        return UserSummaryResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .role(user.getRole())
                .homestayId(user.getHomestayId())
                .build();
    }
}
