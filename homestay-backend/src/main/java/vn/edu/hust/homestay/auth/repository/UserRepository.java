package vn.edu.hust.homestay.auth.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.auth.entity.User;

import java.util.Optional;

/**
 * Repository truy xuất dữ liệu bảng `users`.
 * Ngày thực hiện: 18/10/2026
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
}
