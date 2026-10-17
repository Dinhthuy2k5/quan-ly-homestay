package vn.edu.hust.homestay.room.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Thực thể ánh xạ bảng 'room_types' trong MySQL (homestayv4).
 * Ngày thực hiện: 17/10/2026
 */
@Entity
@Table(name = "room_types")
@Getter
@Setter
public class RoomType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "homestay_id", nullable = false)
    private Long homestayId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 255)
    private String description;
}
