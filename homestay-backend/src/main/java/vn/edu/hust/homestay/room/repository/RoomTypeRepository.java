package vn.edu.hust.homestay.room.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.room.entity.RoomType;

import java.util.List;

/**
 * Repository truy vấn bảng 'room_types'.
 * Ngày thực hiện: 17/10/2026
 */
@Repository
public interface RoomTypeRepository extends JpaRepository<RoomType, Long> {

    /** Lấy danh sách loại phòng của một homestay */
    List<RoomType> findByHomestayIdOrderByNameAsc(Long homestayId);
}
