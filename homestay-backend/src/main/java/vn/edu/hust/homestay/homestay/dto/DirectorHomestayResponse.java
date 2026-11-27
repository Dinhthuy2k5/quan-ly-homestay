package vn.edu.hust.homestay.homestay.dto;

import vn.edu.hust.homestay.auth.entity.User;
import vn.edu.hust.homestay.auth.entity.UserStatus;
import vn.edu.hust.homestay.homestay.entity.Homestay;
import vn.edu.hust.homestay.homestay.entity.Homestay.HomestayStatus;

import java.time.Instant;

/**
 * Dữ liệu cơ sở homestay trả về cho Giám đốc (API-DIR-HS-01, API-DIR-HS-02).
 * Bao gồm thông tin cơ sở, Manager đang phụ trách (nếu có) và thống kê quỹ phòng.
 */
public record DirectorHomestayResponse(
        Long id,
        String name,
        String province,
        String address,
        String hotlinePhone,
        String description,
        HomestayStatus status,
        AssignedManagerSummary manager,
        long totalRooms,
        long activeRooms,
        Instant createdAt,
        Instant updatedAt
) {
    /** Tóm tắt tài khoản Manager hiện đang được phân công phụ trách homestay. */
    public record AssignedManagerSummary(
            Long id,
            String fullName,
            String email,
            String phone,
            UserStatus status
    ) {
        public static AssignedManagerSummary from(User user) {
            if (user == null) {
                return null;
            }
            return new AssignedManagerSummary(
                    user.getId(),
                    user.getFullName(),
                    user.getEmail(),
                    user.getPhone(),
                    user.getStatus()
            );
        }
    }

    public static DirectorHomestayResponse from(
            Homestay homestay,
            User assignedManager,
            long totalRooms,
            long activeRooms
    ) {
        return new DirectorHomestayResponse(
                homestay.getId(),
                homestay.getName(),
                homestay.getProvince(),
                homestay.getAddress(),
                homestay.getHotlinePhone(),
                homestay.getDescription(),
                homestay.getStatus(),
                AssignedManagerSummary.from(assignedManager),
                totalRooms,
                activeRooms,
                homestay.getCreatedAt(),
                homestay.getUpdatedAt()
        );
    }
}
