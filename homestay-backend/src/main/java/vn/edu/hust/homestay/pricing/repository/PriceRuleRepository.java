package vn.edu.hust.homestay.pricing.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.pricing.entity.PriceRule;
import vn.edu.hust.homestay.pricing.entity.PriceRule.RuleType;

import java.time.LocalDate;
import java.util.Optional;

/**
 * Repository truy vấn bảng 'price_rules'.
 * Ngày thực hiện: 17/10/2026
 */
@Repository
public interface PriceRuleRepository extends JpaRepository<PriceRule, Long> {

    /**
     * Tìm giá BASE đang áp dụng của một phòng cụ thể.
     * Mỗi phòng chỉ có tối đa 1 dòng BASE ACTIVE theo unique constraint uq_price_base_room.
     */
    Optional<PriceRule> findByRoomIdAndRuleTypeAndStatus(Long roomId, RuleType ruleType, PriceRule.Status status);

    /** API-PRICE-02: list approved rules inside the Manager's homestay with optional filters. */
    @Query("""
        SELECT rule FROM PriceRule rule
        WHERE rule.homestayId = :homestayId
          AND (:roomId IS NULL OR rule.roomId = :roomId
               OR (rule.ruleType = :adjustmentType AND rule.roomId IS NULL))
          AND (:ruleType IS NULL OR rule.ruleType = :ruleType)
          AND (:status IS NULL OR rule.status = :status)
          AND (:fromDate IS NULL OR rule.endDate IS NULL OR rule.endDate >= :fromDate)
          AND (:toDate IS NULL OR rule.startDate IS NULL OR rule.startDate <= :toDate)
        ORDER BY rule.ruleType ASC, rule.priority DESC, rule.name ASC, rule.id ASC
        """)
    Page<PriceRule> findManagerPriceRules(
            @Param("homestayId") Long homestayId,
            @Param("roomId") Long roomId,
            @Param("adjustmentType") RuleType adjustmentType,
            @Param("ruleType") RuleType ruleType,
            @Param("status") PriceRule.Status status,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            Pageable pageable
    );

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            UPDATE PriceRule rule
            SET rule.status = :expiredStatus
            WHERE rule.status <> :expiredStatus
              AND rule.endDate IS NOT NULL
              AND rule.endDate < :today
            """)
    int expireEndedRules(
            @Param("expiredStatus") PriceRule.Status expiredStatus,
            @Param("today") LocalDate today
    );
}
