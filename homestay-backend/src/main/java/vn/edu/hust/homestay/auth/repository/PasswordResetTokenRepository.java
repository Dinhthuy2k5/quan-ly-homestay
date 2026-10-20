package vn.edu.hust.homestay.auth.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.auth.entity.PasswordResetToken;

import java.util.Optional;

/**
 * Repository truy xuất dữ liệu bảng `password_reset_tokens`.
 * Ngày thực hiện: 18/10/2026
 */
@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);
}
