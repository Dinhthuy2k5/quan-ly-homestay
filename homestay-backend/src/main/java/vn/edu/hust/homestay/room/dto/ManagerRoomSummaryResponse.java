package vn.edu.hust.homestay.room.dto;

import lombok.Builder;
import lombok.Getter;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;

import java.util.List;

/**
 * Mã API: API-MGR-03
 * DTO tóm tắt thông tin phòng trong danh sách quản lý.
 * Ngày thực hiện: 19/10/2026, cập nhật media & giá: 20/10/2026
 */
@Getter
@Builder
public class ManagerRoomSummaryResponse {
    private Long id;
    private String name;
    private Long roomTypeId;
    private String roomTypeName;
    private Integer maxGuests;
    private List<String> amenities;
    private RoomStatus status;
    private String coverImageUrl;
    private Long basePrice;
}
