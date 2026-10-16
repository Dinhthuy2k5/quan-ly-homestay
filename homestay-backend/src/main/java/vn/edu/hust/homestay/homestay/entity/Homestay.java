package vn.edu.hust.homestay.homestay.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * Ánh xạ bảng homestays trong schema homestayv4.
 * ddl-auto=validate → không tự thêm/sửa cột.
 */
@Entity
@Table(name = "homestays")
@Getter
@Setter
public class Homestay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 100)
    private String province;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(name = "hotline_phone", length = 20)
    private String hotlinePhone;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private HomestayStatus status = HomestayStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public enum HomestayStatus {
        ACTIVE, INACTIVE
    }
}
