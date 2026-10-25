package vn.edu.hust.homestay.pricing.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Thực thể ánh xạ bảng 'price_rules' trong MySQL (homestayv4).
 * Ngày thực hiện: 17/10/2026
 */
@Entity
@Table(name = "price_rules")
@Getter
@Setter
public class PriceRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "homestay_id", nullable = false)
    private Long homestayId;

    @Column(name = "room_id")
    private Long roomId;

    @Enumerated(EnumType.STRING)
    @Column(name = "rule_type", nullable = false, length = 20)
    private RuleType ruleType;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "base_price")
    private Long basePrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "adjust_type", length = 20)
    private AdjustType adjustType;

    @Column(name = "adjust_value")
    private Long adjustValue;

    @Column(length = 50)
    private String weekdays;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(nullable = false)
    private Short priority = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.ACTIVE;

    @Column(name = "base_room_id", insertable = false, updatable = false)
    private Long baseRoomId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public enum RuleType {
        BASE, ADJUSTMENT
    }

    public enum AdjustType {
        PERCENT, FIXED_PRICE
    }

    public enum Status {
        ACTIVE, INACTIVE, EXPIRED
    }
}
