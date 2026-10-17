package vn.edu.hust.homestay.room.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;

import java.util.List;
import java.util.Optional;

/**
 * Repository truy vấn bảng 'rooms'.
 * Ngày thực hiện: 17/10/2026
 */
@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {

    /** Tìm phòng theo id và status */
    Optional<Room> findByIdAndStatus(Long id, RoomStatus status);

    /** Lấy danh sách phòng theo homestay và status */
    List<Room> findByHomestayIdAndStatus(Long homestayId, RoomStatus status);
}
