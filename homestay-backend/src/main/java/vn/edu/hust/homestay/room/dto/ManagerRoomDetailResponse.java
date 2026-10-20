package vn.edu.hust.homestay.room.dto;

import lombok.Builder;
import lombok.Getter;
import vn.edu.hust.homestay.media.dto.MediaItemResponse;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;

import java.time.Instant;
import java.util.List;

/**
 * Mã API: API-MGR-04, API-MGR-05, API-MGR-06
 * DTO chi tiết phòng cho Manager.
 * Ngày thực hiện: 19/10/2026, cập nhật media & giá: 20/10/2026
 */
@Getter
@Builder
public class ManagerRoomDetailResponse {
    private Long id;
    private Long homestayId;
    private Long roomTypeId;
    private String roomTypeName;
    private String name;
    private String description;
    private Integer maxGuests;
    private List<String> amenities;
    private RoomStatus status;
    private List<MediaItemResponse> media;
    private Long basePrice;
    private Instant createdAt;
    private Instant updatedAt;
}
