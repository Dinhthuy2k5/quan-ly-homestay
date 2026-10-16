package vn.edu.hust.homestay.homestay.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.homestay.entity.Homestay;
import vn.edu.hust.homestay.homestay.entity.Homestay.HomestayStatus;

import java.util.Optional;

@Repository
public interface HomestayRepository extends JpaRepository<Homestay, Long> {

    /** Danh sách homestay theo status, hỗ trợ phân trang */
    Page<Homestay> findByStatus(HomestayStatus status, Pageable pageable);

    /** Tìm homestay theo id và status (cho public API chỉ xem ACTIVE) */
    Optional<Homestay> findByIdAndStatus(Long id, HomestayStatus status);
}
