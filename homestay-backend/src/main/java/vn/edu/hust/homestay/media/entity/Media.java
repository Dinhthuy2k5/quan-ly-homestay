package vn.edu.hust.homestay.media.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * Thực thể ánh xạ bảng 'media' trong MySQL (homestayv4).
 * Tham chiếu đa hình theo owner_type ('HOMESTAY', 'ROOM', 'SERVICE') và owner_id.
 * Ngày thực hiện: 17/10/2026
 */
@Entity
@Table(name = "media")
@Getter
@Setter
public class Media {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "homestay_id", nullable = false)
    private Long homestayId;

    @Enumerated(EnumType.STRING)
    @Column(name = "owner_type", nullable = false, length = 20)
    private OwnerType ownerType;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(nullable = false, length = 500)
    private String url;

    @Column(name = "mime_type", length = 100)
    private String mimeType;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(length = 255)
    private String caption;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "uploaded_by", nullable = false)
    private Long uploadedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public enum OwnerType {
        HOMESTAY, ROOM, SERVICE
    }
}
