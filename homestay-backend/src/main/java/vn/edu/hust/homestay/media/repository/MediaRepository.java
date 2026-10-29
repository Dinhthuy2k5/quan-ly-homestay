package vn.edu.hust.homestay.media.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.media.entity.Media;
import vn.edu.hust.homestay.media.entity.Media.OwnerType;

import java.util.List;
import java.util.Optional;
import java.util.Collection;

/**
 * Repository truy vấn bảng 'media'.
 * Ngày thực hiện: 17/10/2026
 */
@Repository
public interface MediaRepository extends JpaRepository<Media, Long> {

    /** Lấy danh sách media của một đối tượng sắp xếp theo sort_order */
    List<Media> findByOwnerTypeAndOwnerIdOrderBySortOrderAsc(OwnerType ownerType, Long ownerId);

    /** Lấy ảnh đầu tiên (cover image) của một đối tượng */
    Optional<Media> findFirstByOwnerTypeAndOwnerIdOrderBySortOrderAsc(OwnerType ownerType, Long ownerId);

    /** Tải media của nhiều phòng trong một truy vấn để dựng thẻ kết quả availability. */
    List<Media> findByOwnerTypeAndOwnerIdInOrderBySortOrderAsc(OwnerType ownerType, Collection<Long> ownerIds);

    /** Đếm tổng số lượng tệp media của một đối tượng */
    long countByOwnerTypeAndOwnerId(OwnerType ownerType, Long ownerId);
}
