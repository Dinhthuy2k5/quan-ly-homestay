package vn.edu.hust.homestay.auth.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.auth.entity.RefreshToken;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Repository truy xuất dữ liệu bảng `refresh_tokens`.
 * Ngày thực hiện: 18/10/2026
 */
@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("UPDATE RefreshToken r SET r.revokedAt = :now WHERE r.userId = :userId AND r.revokedAt IS NULL")
    void revokeAllByUserId(@Param("userId") Long userId, @Param("now") LocalDateTime now);
}
