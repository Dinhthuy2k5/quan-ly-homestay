package vn.edu.hust.homestay.homestay.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
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
