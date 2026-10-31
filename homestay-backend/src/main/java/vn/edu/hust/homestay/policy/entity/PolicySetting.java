package vn.edu.hust.homestay.policy.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "policy_settings",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_policy",
                columnNames = {"policy_group", "policy_key"}
        )
)
@Getter
public class PolicySetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "policy_group", nullable = false, length = 30)
    private String policyGroup;

    @Column(name = "policy_key", nullable = false, length = 60)
    private String policyKey;

    @Column(name = "value_type", nullable = false, length = 20)
    private String valueType;

    @Column(name = "policy_value", nullable = false, columnDefinition = "TEXT")
    private String policyValue;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
