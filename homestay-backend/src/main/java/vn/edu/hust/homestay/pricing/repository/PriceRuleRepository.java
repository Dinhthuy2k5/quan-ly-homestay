package vn.edu.hust.homestay.pricing.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.pricing.entity.PriceRule;
import vn.edu.hust.homestay.pricing.entity.PriceRule.RuleType;

import java.util.Optional;

/**
 * Repository truy vấn bảng 'price_rules'.
 * Ngày thực hiện: 17/10/2026
 */
@Repository
public interface PriceRuleRepository extends JpaRepository<PriceRule, Long> {

    /**
     * Tìm giá BASE đang hoạt động (được duyệt) của một phòng cụ thể.
     * Mỗi phòng chỉ có tối đa 1 dòng BASE active theo unique constraint uq_price_base_room.
     */
    Optional<PriceRule> findByRoomIdAndRuleTypeAndIsActiveTrue(Long roomId, RuleType ruleType);
}
