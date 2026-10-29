package vn.edu.hust.homestay.pricing.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Thực thể ánh xạ bảng 'price_rule_change_requests' trong MySQL (homestayv4).
 * Phục vụ quy trình đề xuất giá của Manager và phê duyệt của Director (Tuần 4).
 * Ngày thực hiện: 25/10/2026
 */
@Entity
@Table(name = "price_rule_change_requests")
@Getter
@Setter
@NoArgsConstructor
public class PriceRuleChangeRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "homestay_id", nullable = false)
    private Long homestayId;

    @Column(name = "target_rule_id")
    private Long targetRuleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false, length = 20)
    private RequestType requestType;

    @Column(name = "proposed_rule", columnDefinition = "JSON", nullable = false)
    private String proposedRule;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.PENDING_APPROVAL;

    @Column(name = "requested_by", nullable = false)
    private Long requestedBy;

    @Column(name = "requested_at", nullable = false)
    private Instant requestedAt = Instant.now();

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "rejection_reason", length = 255)
    private String rejectionReason;

    public enum RequestType {
        CREATE, UPDATE, DEACTIVATE
    }

    public enum Status {
        PENDING_APPROVAL, APPROVED, REJECTED
    }
}
