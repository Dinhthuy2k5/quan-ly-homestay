package vn.edu.hust.homestay.room.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.room.entity.RoomType;

import java.util.List;
import java.util.Optional;

/**
 * Repository truy vấn bảng 'room_types'.
 * Ngày thực hiện: 17/10/2026, cập nhật Tuần 3: 19/10/2026
 */
@Repository
public interface RoomTypeRepository extends JpaRepository<RoomType, Long> {

    /** Lấy danh sách loại phòng của một homestay */
    List<RoomType> findByHomestayIdOrderByNameAsc(Long homestayId);

    /** Tìm loại phòng theo id và homestayId để kiểm tra phạm vi */
    Optional<RoomType> findByIdAndHomestayId(Long id, Long homestayId);

    /** Kiểm tra loại phòng có thuộc homestay hay không */
    boolean existsByIdAndHomestayId(Long id, Long homestayId);
}
