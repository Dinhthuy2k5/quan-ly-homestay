package vn.edu.hust.homestay.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.auth.dto.*;
import vn.edu.hust.homestay.auth.entity.PasswordResetToken;
import vn.edu.hust.homestay.auth.entity.RefreshToken;
import vn.edu.hust.homestay.auth.entity.Role;
import vn.edu.hust.homestay.auth.entity.User;
import vn.edu.hust.homestay.auth.entity.UserStatus;
import vn.edu.hust.homestay.auth.repository.PasswordResetTokenRepository;
import vn.edu.hust.homestay.auth.repository.RefreshTokenRepository;
import vn.edu.hust.homestay.auth.repository.UserRepository;
import vn.edu.hust.homestay.auth.security.JwtService;
import vn.edu.hust.homestay.auth.util.TokenHashUtil;
import vn.edu.hust.homestay.common.exception.BusinessException;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Service xử lý toàn bộ logic nghiệp vụ Xác thực và Phân quyền (Tuần 2).
 * Phục vụ API-AUTH-01 đến API-AUTH-06.
 * Ngày thực hiện: 18/10/2026
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final long refreshTokenExpirationMs;

    public AuthService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            EmailService emailService,
            @Value("${app.jwt.refresh-token-expiration-ms:604800000}") long refreshTokenExpirationMs
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    /**
     * API-AUTH-01: Đăng ký tài khoản Customer
     */
    @Transactional
    public RegisterResponse register(RegisterRequest req) {
        String cleanEmail = req.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(cleanEmail)) {
            throw BusinessException.badRequest("EMAIL_ALREADY_EXISTS", "Email này đã được sử dụng.");
        }

        validatePasswordPolicy(req.getPassword());

        User user = User.builder()
                .email(cleanEmail)
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .fullName(req.getFullName().trim())
                .phone(req.getPhone().trim())
                .role(Role.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build();

        user = userRepository.save(user);
        return RegisterResponse.from(user);
    }

    /**
     * API-AUTH-02: Đăng nhập
     */
    @Transactional
    public AuthResponse login(LoginRequest req) {
        String cleanEmail = req.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> BusinessException.unauthorized("INVALID_CREDENTIALS", "Email hoặc mật khẩu không chính xác."));

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw BusinessException.unauthorized("INVALID_CREDENTIALS", "Email hoặc mật khẩu không chính xác.");
        }

        if (user.getStatus() == UserStatus.LOCKED) {
            throw BusinessException.forbidden("ACCOUNT_LOCKED", "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
        }

        String accessToken = jwtService.generateAccessToken(user);
        String rawRefreshToken = TokenHashUtil.generateSecureToken();
        String refreshHash = TokenHashUtil.hashToken(rawRefreshToken);

        LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(refreshTokenExpirationMs / 1000);
        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .userId(user.getId())
                .tokenHash(refreshHash)
                .expiresAt(expiresAt)
                .build();
        refreshTokenRepository.save(refreshTokenEntity);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(rawRefreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtService.getAccessTokenExpirationSeconds())
                .user(UserSummaryResponse.from(user))
                .build();
    }

    /**
     * API-AUTH-03: Refresh token
     */
    @Transactional
    public RefreshTokenResponse refresh(RefreshTokenRequest req) {
        String rawToken = req.getRefreshToken();
        String tokenHash = TokenHashUtil.hashToken(rawToken);

        RefreshToken refreshToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> BusinessException.badRequest("INVALID_REFRESH_TOKEN", "Refresh token không hợp lệ."));

        if (refreshToken.getRevokedAt() != null) {
            throw BusinessException.badRequest("TOKEN_REVOKED", "Refresh token đã bị thu hồi.");
        }

        if (refreshToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw BusinessException.badRequest("TOKEN_EXPIRED", "Refresh token đã hết hạn.");
        }

        User user = userRepository.findById(refreshToken.getUserId())
                .orElseThrow(() -> BusinessException.notFound("USER_NOT_FOUND", "Không tìm thấy người dùng sở hữu token."));

        if (user.getStatus() == UserStatus.LOCKED) {
            throw BusinessException.forbidden("ACCOUNT_LOCKED", "Tài khoản của bạn đã bị khóa.");
        }

        // Xoay vòng refresh token (thu hồi token cũ)
        refreshToken.setRevokedAt(LocalDateTime.now());
        refreshTokenRepository.save(refreshToken);

        // Tạo cặp token mới
        String newAccessToken = jwtService.generateAccessToken(user);
        String newRawRefreshToken = TokenHashUtil.generateSecureToken();
        String newHash = TokenHashUtil.hashToken(newRawRefreshToken);

        LocalDateTime newExpiresAt = LocalDateTime.now().plusSeconds(refreshTokenExpirationMs / 1000);
        RefreshToken newRefreshTokenEntity = RefreshToken.builder()
                .userId(user.getId())
                .tokenHash(newHash)
                .expiresAt(newExpiresAt)
                .build();
        refreshTokenRepository.save(newRefreshTokenEntity);

        return RefreshTokenResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRawRefreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtService.getAccessTokenExpirationSeconds())
                .build();
    }

    /**
     * API-AUTH-04: Đăng xuất
     */
    @Transactional
    public Map<String, Boolean> logout(LogoutRequest req) {
        String tokenHash = TokenHashUtil.hashToken(req.getRefreshToken());
        RefreshToken refreshToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> BusinessException.badRequest("INVALID_REFRESH_TOKEN", "Refresh token không tồn tại hoặc không hợp lệ."));

        if (refreshToken.getRevokedAt() == null) {
            refreshToken.setRevokedAt(LocalDateTime.now());
            refreshTokenRepository.save(refreshToken);
        }

        return Map.of("loggedOut", true);
    }

    /**
     * API-AUTH-05: Yêu cầu đặt lại mật khẩu
     */
    @Transactional
    public Map<String, String> forgotPassword(ForgotPasswordRequest req) {
        String cleanEmail = req.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(cleanEmail).orElse(null);

        if (user != null && user.getStatus() == UserStatus.ACTIVE) {
            String rawResetToken = TokenHashUtil.generateSecureToken();
            String hash = TokenHashUtil.hashToken(rawResetToken);

            PasswordResetToken resetTokenEntity = PasswordResetToken.builder()
                    .userId(user.getId())
                    .tokenHash(hash)
                    .expiresAt(LocalDateTime.now().plusMinutes(15))
                    .build();
            passwordResetTokenRepository.save(resetTokenEntity);

            // Luôn giữ token reset ngoài response và log; chỉ gửi token trong email của chủ tài khoản.
            emailService.sendPasswordResetEmail(cleanEmail, user.getFullName(), rawResetToken);
        }

        return Map.of("message", "Nếu tài khoản tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi qua email.");
    }

    /**
     * API-AUTH-06: Đặt lại mật khẩu
     */
    @Transactional
    public Map<String, Boolean> resetPassword(ResetPasswordRequest req) {
        String tokenHash = TokenHashUtil.hashToken(req.getToken());
        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> BusinessException.badRequest("RESET_TOKEN_INVALID", "Mã đặt lại mật khẩu không hợp lệ."));

        if (resetToken.getUsedAt() != null) {
            throw BusinessException.badRequest("RESET_TOKEN_INVALID", "Mã đặt lại mật khẩu đã được sử dụng.");
        }

        if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw BusinessException.badRequest("RESET_TOKEN_EXPIRED", "Mã đặt lại mật khẩu đã hết hạn.");
        }

        validatePasswordPolicy(req.getNewPassword());

        User user = userRepository.findById(resetToken.getUserId())
                .orElseThrow(() -> BusinessException.notFound("USER_NOT_FOUND", "Không tìm thấy tài khoản người dùng."));

        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);

        resetToken.setUsedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(resetToken);

        // Thu hồi toàn bộ refresh token cũ của tài khoản
        refreshTokenRepository.revokeAllByUserId(user.getId(), LocalDateTime.now());

        return Map.of("passwordReset", true);
    }

    private void validatePasswordPolicy(String password) {
        if (password == null || password.length() < 8) {
            throw BusinessException.badRequest("PASSWORD_POLICY_VIOLATION", "Mật khẩu phải chứa ít nhất 8 ký tự.");
        }
    }
}
