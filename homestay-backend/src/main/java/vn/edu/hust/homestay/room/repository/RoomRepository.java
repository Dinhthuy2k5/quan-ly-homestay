package vn.edu.hust.homestay.room.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;

import java.util.List;
import java.util.Optional;

/**
 * Repository truy vấn bảng 'rooms'.
 * Ngày thực hiện: 17/10/2026, cập nhật Tuần 3: 19/10/2026
 */
@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {

    /** Tìm phòng theo id và status */
    Optional<Room> findByIdAndStatus(Long id, RoomStatus status);

    /** Lấy danh sách phòng theo homestay và status */
    List<Room> findByHomestayIdAndStatus(Long homestayId, RoomStatus status);

    /** Danh sách phòng đang hoạt động công khai thuộc homestay, phân trang ổn định. */
    Page<Room> findByHomestayIdAndStatusOrderByIdAsc(Long homestayId, RoomStatus status, Pageable pageable);

    /** Kiểm tra tên phòng đã tồn tại trong homestay chưa */
    boolean existsByHomestayIdAndName(Long homestayId, String name);

    /** Kiểm tra tên phòng đã tồn tại trong homestay ngoại trừ phòng hiện tại */
    boolean existsByHomestayIdAndNameAndIdNot(Long homestayId, String name, Long id);

    /**
     * Tra cứu danh sách phòng theo homestay, có hỗ trợ lọc theo trạng thái, loại phòng, từ khóa và phân trang.
     * Dùng cho API-MGR-03.
     */
    @Query("""
        SELECT r FROM Room r
        WHERE r.homestayId = :homestayId
          AND (:status IS NULL OR r.status = :status)
          AND (:roomTypeId IS NULL OR r.roomTypeId = :roomTypeId)
          AND (:keyword IS NULL OR LOWER(r.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
        ORDER BY r.id ASC
    """)
    Page<Room> searchManagerRooms(
            @Param("homestayId") Long homestayId,
            @Param("status") RoomStatus status,
            @Param("roomTypeId") Long roomTypeId,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    /**
     * Đếm số lượt đặt phòng còn hiệu lực trong tương lai gắn với phòng này.
     * Phục vụ kiểm tra điều kiện trước khi khóa hoặc ngừng hoạt động phòng (API-MGR-07).
     */
    @Query(value = """
        SELECT COUNT(*) FROM booking_rooms br
        JOIN bookings b ON br.booking_id = b.id
        WHERE br.room_id = :roomId
          AND b.status IN ('PENDING_DEPOSIT', 'PENDING_APPROVAL', 'CONFIRMED', 'CHECKED_IN')
          AND b.check_out_date >= CURRENT_DATE
    """, nativeQuery = true)
    long countFutureActiveBookings(@Param("roomId") Long roomId);

    /**
     * Đếm số lượt đặt phòng trong tương lai có số lượng khách lớn hơn sức chứa mới.
     * Phục vụ kiểm tra xung đột khi cập nhật sức chứa phòng (API-MGR-06).
     */
    @Query(value = """
        SELECT COUNT(*) FROM booking_rooms br
        JOIN bookings b ON br.booking_id = b.id
        WHERE br.room_id = :roomId
          AND b.status IN ('PENDING_DEPOSIT', 'PENDING_APPROVAL', 'CONFIRMED', 'CHECKED_IN')
          AND b.check_out_date >= CURRENT_DATE
          AND b.guest_count > :newMaxGuests
    """, nativeQuery = true)
    long countFutureActiveBookingsWithMoreGuests(@Param("roomId") Long roomId, @Param("newMaxGuests") int newMaxGuests);
}
