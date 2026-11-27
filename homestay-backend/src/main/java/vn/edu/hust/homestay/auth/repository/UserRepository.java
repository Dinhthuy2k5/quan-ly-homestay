package vn.edu.hust.homestay.auth.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.auth.entity.Role;
import vn.edu.hust.homestay.auth.entity.User;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Repository truy xuất dữ liệu bảng `users`.
 * Ngày thực hiện: 18/10/2026
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<User> findByPhone(String phone);

    /** Lấy danh sách Manager đang phụ trách theo tập homestayId (tránh truy vấn N+1). */
    List<User> findByRoleAndHomestayIdIn(Role role, Collection<Long> homestayIds);

    /** Lấy Manager đang phụ trách một homestay cụ thể. */
    Optional<User> findByRoleAndHomestayId(Role role, Long homestayId);
}
