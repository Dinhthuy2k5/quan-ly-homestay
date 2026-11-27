package vn.edu.hust.homestay.auth.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.auth.entity.Role;
import vn.edu.hust.homestay.auth.entity.User;
import vn.edu.hust.homestay.auth.entity.UserStatus;

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

    /** Khóa dòng tài khoản để tuần tự hóa thao tác gán/gỡ Manager (API-DIR-HS-03). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Long id);

    /** Lấy danh sách Manager đang phụ trách theo tập homestayId (tránh truy vấn N+1). */
    List<User> findByRoleAndHomestayIdIn(Role role, Collection<Long> homestayIds);

    /** Lấy Manager đang phụ trách một homestay cụ thể. */
    Optional<User> findByRoleAndHomestayId(Role role, Long homestayId);

    /** Lấy và khóa Manager hiện đang phụ trách một homestay (dùng trong transaction API-DIR-HS-03). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.role = :role AND u.homestayId = :homestayId")
    Optional<User> findByRoleAndHomestayIdForUpdate(
            @Param("role") Role role,
            @Param("homestayId") Long homestayId
    );

    /** Tra cứu danh sách tài khoản theo vai trò cho Giám đốc chọn phân công Manager. */
    @Query("""
        SELECT u FROM User u
        WHERE u.role = :role
          AND (:status IS NULL OR u.status = :status)
          AND (:unassignedOnly = false OR u.homestayId IS NULL)
          AND (:keyword IS NULL OR (
                LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(COALESCE(u.phone, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
          ))
        ORDER BY u.fullName ASC, u.id ASC
    """)
    List<User> searchUsersByRoleForDirector(
            @Param("role") Role role,
            @Param("status") UserStatus status,
            @Param("unassignedOnly") boolean unassignedOnly,
            @Param("keyword") String keyword
    );
}
