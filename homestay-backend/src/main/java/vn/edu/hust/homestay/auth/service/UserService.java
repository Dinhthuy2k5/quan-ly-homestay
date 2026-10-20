package vn.edu.hust.homestay.auth.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.auth.dto.ChangePasswordRequest;
import vn.edu.hust.homestay.auth.dto.UpdateProfileRequest;
import vn.edu.hust.homestay.auth.dto.UpdateProfileResponse;
import vn.edu.hust.homestay.auth.dto.UserProfileResponse;
import vn.edu.hust.homestay.auth.entity.User;
import vn.edu.hust.homestay.auth.entity.UserStatus;
import vn.edu.hust.homestay.auth.repository.RefreshTokenRepository;
import vn.edu.hust.homestay.auth.repository.UserRepository;
import vn.edu.hust.homestay.common.exception.BusinessException;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Service quản lý hồ sơ và thông tin cá nhân của người dùng hiện tại (Tuần 2).
 * Phục vụ API-USER-01, API-USER-02, API-USER-03.
 * Ngày thực hiện: 18/10/2026
 */
@Service
public class UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * API-USER-01: Xem hồ sơ của mình
     */
    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(Long userId) {
        User user = getUserOrThrow(userId);
        return UserProfileResponse.from(user);
    }

    /**
     * API-USER-02: Cập nhật hồ sơ (chỉ họ tên và số điện thoại)
     */
    @Transactional
    public UpdateProfileResponse updateProfile(Long userId, UpdateProfileRequest req) {
        User user = getUserOrThrow(userId);

        user.setFullName(req.getFullName().trim());
        user.setPhone(req.getPhone().trim());
        user = userRepository.save(user);

        return UpdateProfileResponse.from(user);
    }

    /**
     * API-USER-03: Đổi mật khẩu
     */
    @Transactional
    public Map<String, Boolean> changePassword(Long userId, ChangePasswordRequest req) {
        User user = getUserOrThrow(userId);

        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPasswordHash())) {
            throw BusinessException.badRequest("CURRENT_PASSWORD_INVALID", "Mật khẩu hiện tại không chính xác.");
        }

        validatePasswordPolicy(req.getNewPassword());

        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);

        // Thu hồi toàn bộ refresh token cũ để đảm bảo an toàn
        refreshTokenRepository.revokeAllByUserId(userId, LocalDateTime.now());

        return Map.of("passwordChanged", true);
    }

    private User getUserOrThrow(Long userId) {
        if (userId == null) {
            throw BusinessException.unauthorized("UNAUTHORIZED", "Không xác định được danh tính người dùng.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> BusinessException.notFound("USER_NOT_FOUND", "Không tìm thấy người dùng."));

        if (user.getStatus() == UserStatus.LOCKED) {
            throw BusinessException.forbidden("ACCOUNT_LOCKED", "Tài khoản của bạn đã bị khóa.");
        }
        return user;
    }

    private void validatePasswordPolicy(String password) {
        if (password == null || password.length() < 8) {
            throw BusinessException.badRequest("PASSWORD_POLICY_VIOLATION", "Mật khẩu mới phải chứa ít nhất 8 ký tự.");
        }
    }
}
