package vn.edu.hust.homestay.homestay.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.homestay.entity.Homestay;
import vn.edu.hust.homestay.homestay.entity.Homestay.HomestayStatus;

import java.util.Optional;

/**
 * Repository truy vấn bảng 'homestays'.
 * Ngày thực hiện: 17/10/2026
 */
@Repository
public interface HomestayRepository extends JpaRepository<Homestay, Long> {

    /** Danh sách homestay theo status, hỗ trợ phân trang */
    Page<Homestay> findByStatus(HomestayStatus status, Pageable pageable);

    /** Tìm homestay theo id và status (cho public API chỉ xem ACTIVE) */
    Optional<Homestay> findByIdAndStatus(Long id, HomestayStatus status);

    /** Khóa bản ghi homestay khi Director cập nhật thông tin hoặc đổi trạng thái. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT h FROM Homestay h WHERE h.id = :id")
    Optional<Homestay> findByIdForUpdate(@Param("id") Long id);

    /** Kiểm tra trùng cặp (province, name) theo ràng buộc uq_homestays_name. */
    boolean existsByProvinceIgnoreCaseAndNameIgnoreCase(String province, String name);

    /** Kiểm tra trùng cặp (province, name) với cơ sở khác khi cập nhật. */
    boolean existsByProvinceIgnoreCaseAndNameIgnoreCaseAndIdNot(String province, String name, Long id);

    /**
     * Tra cứu toàn bộ homestay cho Director (API-DIR-HS-01), hỗ trợ lọc theo trạng thái, tỉnh/thành và từ khóa.
     */
    @Query("""
        SELECT h FROM Homestay h
        WHERE (:status IS NULL OR h.status = :status)
          AND (:province IS NULL OR LOWER(h.province) LIKE LOWER(CONCAT('%', :province, '%')))
          AND (:keyword IS NULL OR (
                LOWER(h.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(h.address) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(h.province) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(h.hotlinePhone) LIKE LOWER(CONCAT('%', :keyword, '%'))
          ))
        ORDER BY h.id DESC
    """)
    Page<Homestay> searchDirectorHomestays(
            @Param("status") HomestayStatus status,
            @Param("province") String province,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    /**
     * Tra cứu homestay theo địa điểm và từ khóa (API-PUB-05).
     * Chỉ trả các homestay có status = ACTIVE.
     */
    @Query("""
        SELECT h FROM Homestay h
        WHERE h.status = :status
          AND (:province IS NULL OR LOWER(h.province) LIKE LOWER(CONCAT('%', :province, '%')))
          AND (:keyword IS NULL OR (
                LOWER(h.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(h.address) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(h.province) LIKE LOWER(CONCAT('%', :keyword, '%'))
          ))
        ORDER BY h.name ASC
    """)
    Page<Homestay> searchActiveHomestays(
            @Param("status") HomestayStatus status,
            @Param("province") String province,
            @Param("keyword") String keyword,
            Pageable pageable
    );
}
