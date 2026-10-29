package vn.edu.hust.homestay.pricing.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest;
import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest.Status;

import java.util.Optional;

/**
 * Repository truy vấn bảng 'price_rule_change_requests'.
 * Ngày thực hiện: 25/10/2026
 */
@Repository
public interface PriceRuleChangeRequestRepository extends JpaRepository<PriceRuleChangeRequest, Long> {

    /** Kiểm tra xem một quy tắc giá mục tiêu đã có đề xuất đang chờ duyệt hay chưa */
    boolean existsByTargetRuleIdAndStatus(Long targetRuleId, Status status);

    /** API-PRICE-04: danh sách yêu cầu trong homestay, có lọc trạng thái và sắp xếp qua Pageable. */
    Page<PriceRuleChangeRequest> findByHomestayIdAndStatus(
            Long homestayId,
            Status status,
            Pageable pageable
    );

    Page<PriceRuleChangeRequest> findByHomestayId(
            Long homestayId,
            Pageable pageable
    );

    Optional<PriceRuleChangeRequest> findByIdAndHomestayId(Long id, Long homestayId);

    /** Đếm số lượng đề xuất tạo giá BASE cho phòng cụ thể đang chờ duyệt */
    @Query(value = """
        SELECT COUNT(*) FROM price_rule_change_requests
        WHERE homestay_id = :homestayId
          AND status = 'PENDING_APPROVAL'
          AND request_type = 'CREATE'
          AND proposed_rule->>'$.ruleType' = 'BASE'
          AND proposed_rule->>'$.roomId' = CAST(:roomId AS CHAR)
    """, nativeQuery = true)
    long countPendingCreateBaseRequestForRoom(
            @Param("homestayId") Long homestayId,
            @Param("roomId") Long roomId
    );

    /** Kiểm tra xem phòng cụ thể đã có đề xuất tạo giá BASE nào đang chờ duyệt hay chưa */
    default boolean existsPendingCreateBaseRequestForRoom(Long homestayId, Long roomId) {
        return countPendingCreateBaseRequestForRoom(homestayId, roomId) > 0;
    }
}
