package vn.edu.hust.homestay.room.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;

import java.util.List;
import java.util.Optional;
import java.time.LocalDate;
import jakarta.persistence.LockModeType;

/**
 * Repository truy vấn bảng 'rooms'.
 * Ngày thực hiện: 17/10/2026, cập nhật Tuần 3: 19/10/2026
 */
@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {

    /** Ngày đã được giữ trong sổ đêm, dùng để gạch ngày không khả dụng trên lịch công khai. */
    @Query(value = """
        SELECT stay_date FROM booking_room_nights
        WHERE room_id = :roomId
          AND stay_date >= :fromDate
          AND stay_date < :toDate
        ORDER BY stay_date
        """, nativeQuery = true)
    List<LocalDate> findUnavailableStayDates(
            @Param("roomId") Long roomId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );

    /** Tìm phòng theo id và status */
    Optional<Room> findByIdAndStatus(Long id, RoomStatus status);

    /** Khóa các phòng trong transaction tạo booking để tuần tự hóa thao tác giữ đêm. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT room FROM Room room WHERE room.id IN :roomIds ORDER BY room.id")
    List<Room> findAllByIdInForUpdate(@Param("roomIds") List<Long> roomIds);

    /** Lấy danh sách phòng theo homestay và status */
    List<Room> findByHomestayIdAndStatus(Long homestayId, RoomStatus status);

    /** Danh sách phòng đang hoạt động công khai thuộc homestay, phân trang ổn định. */
    Page<Room> findByHomestayIdAndStatusOrderByIdAsc(Long homestayId, RoomStatus status, Pageable pageable);

    /** API-PUB-03: phòng ACTIVE, đủ sức chứa, có giá BASE và không bị giữ trong bất kỳ đêm lưu trú nào. */
    @Query(value = """
        SELECT r.*
        FROM rooms r
        JOIN homestays h ON h.id = r.homestay_id
        JOIN room_types rt ON rt.id = r.room_type_id AND rt.homestay_id = r.homestay_id
        WHERE r.status = 'ACTIVE'
          AND h.status = 'ACTIVE'
          AND r.max_guests >= :guestCount
          AND (:homestayId IS NULL OR h.id = :homestayId)
          AND (:province IS NULL OR LOWER(h.province) LIKE CONCAT('%', LOWER(:province), '%'))
          AND (:keyword IS NULL OR (
                LOWER(h.name) LIKE CONCAT('%', LOWER(:keyword), '%')
                OR LOWER(h.address) LIKE CONCAT('%', LOWER(:keyword), '%')
                OR LOWER(h.province) LIKE CONCAT('%', LOWER(:keyword), '%')
                OR LOWER(COALESCE(h.description, '')) LIKE CONCAT('%', LOWER(:keyword), '%')
                OR LOWER(r.name) LIKE CONCAT('%', LOWER(:keyword), '%')
                OR LOWER(COALESCE(r.description, '')) LIKE CONCAT('%', LOWER(:keyword), '%')
                OR LOWER(rt.name) LIKE CONCAT('%', LOWER(:keyword), '%')
          ))
          AND EXISTS (
                SELECT 1 FROM price_rules base_rule
                WHERE base_rule.homestay_id = h.id
                  AND base_rule.room_id = r.id
                  AND base_rule.rule_type = 'BASE'
                  AND base_rule.status = 'ACTIVE'
          )
          AND NOT EXISTS (
                SELECT 1 FROM booking_room_nights reserved_night
                WHERE reserved_night.room_id = r.id
                  AND reserved_night.stay_date >= :checkInDate
                  AND reserved_night.stay_date < :checkOutDate
          )
        ORDER BY h.name ASC, r.id ASC
        """,
        countQuery = """
        SELECT COUNT(*)
        FROM rooms r
        JOIN homestays h ON h.id = r.homestay_id
        JOIN room_types rt ON rt.id = r.room_type_id AND rt.homestay_id = r.homestay_id
        WHERE r.status = 'ACTIVE'
          AND h.status = 'ACTIVE'
          AND r.max_guests >= :guestCount
          AND (:homestayId IS NULL OR h.id = :homestayId)
          AND (:province IS NULL OR LOWER(h.province) LIKE CONCAT('%', LOWER(:province), '%'))
          AND (:keyword IS NULL OR (
                LOWER(h.name) LIKE CONCAT('%', LOWER(:keyword), '%')
                OR LOWER(h.address) LIKE CONCAT('%', LOWER(:keyword), '%')
                OR LOWER(h.province) LIKE CONCAT('%', LOWER(:keyword), '%')
                OR LOWER(COALESCE(h.description, '')) LIKE CONCAT('%', LOWER(:keyword), '%')
                OR LOWER(r.name) LIKE CONCAT('%', LOWER(:keyword), '%')
                OR LOWER(COALESCE(r.description, '')) LIKE CONCAT('%', LOWER(:keyword), '%')
                OR LOWER(rt.name) LIKE CONCAT('%', LOWER(:keyword), '%')
          ))
          AND EXISTS (
                SELECT 1 FROM price_rules base_rule
                WHERE base_rule.homestay_id = h.id
                  AND base_rule.room_id = r.id
                  AND base_rule.rule_type = 'BASE'
                  AND base_rule.status = 'ACTIVE'
          )
          AND NOT EXISTS (
                SELECT 1 FROM booking_room_nights reserved_night
                WHERE reserved_night.room_id = r.id
                  AND reserved_night.stay_date >= :checkInDate
                  AND reserved_night.stay_date < :checkOutDate
          )
        """,
        nativeQuery = true)
    Page<Room> searchAvailableRooms(
            @Param("homestayId") Long homestayId,
            @Param("province") String province,
            @Param("keyword") String keyword,
            @Param("checkInDate") LocalDate checkInDate,
            @Param("checkOutDate") LocalDate checkOutDate,
            @Param("guestCount") int guestCount,
            Pageable pageable
    );

    /** Kiểm tra tên phòng đã tồn tại trong homestay chưa */
    boolean existsByHomestayIdAndName(Long homestayId, String name);

    /** Kiểm tra tên phòng đã tồn tại trong homestay ngoại trừ phòng hiện tại */
    boolean existsByHomestayIdAndNameAndIdNot(Long homestayId, String name, Long id);

    /** Kiểm tra loại phòng còn được phòng nào trong cùng homestay sử dụng không. */
    boolean existsByRoomTypeIdAndHomestayId(Long roomTypeId, Long homestayId);

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
