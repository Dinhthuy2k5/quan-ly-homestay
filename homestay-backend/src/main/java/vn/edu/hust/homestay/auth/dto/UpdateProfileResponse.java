package vn.edu.hust.homestay.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import vn.edu.hust.homestay.auth.entity.User;

/**
 * Mã API: API-USER-02
 * Tên API: Cập nhật hồ sơ
 * Response DTO trả về sau khi cập nhật hồ sơ.
 * Ngày thực hiện: 18/10/2026
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileResponse {

    private Long id;
    private String fullName;
    private String phone;

    public static UpdateProfileResponse from(User user) {
        return UpdateProfileResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .build();
    }
}
