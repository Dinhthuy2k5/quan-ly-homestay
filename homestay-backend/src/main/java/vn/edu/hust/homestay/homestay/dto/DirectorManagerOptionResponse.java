package vn.edu.hust.homestay.homestay.dto;

import vn.edu.hust.homestay.auth.entity.User;
import vn.edu.hust.homestay.auth.entity.UserStatus;

/**
 * Thông tin tài khoản Manager trả về cho Giám đốc khi chọn người phụ trách cơ sở (GET /api/v1/director/managers).
 */
public record DirectorManagerOptionResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        UserStatus status,
        Long homestayId,
        String homestayName
) {
    public static DirectorManagerOptionResponse from(User user, String homestayName) {
        return new DirectorManagerOptionResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getStatus(),
                user.getHomestayId(),
                homestayName
        );
    }
}
