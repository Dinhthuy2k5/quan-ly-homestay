package vn.edu.hust.homestay.room.dto;

import lombok.Builder;
import lombok.Getter;
import vn.edu.hust.homestay.room.entity.RoomType;

/**
 * Mã API: API-PUB-ROOM-TYPE-01 (GET /public/homestays/{homestayId}/room-types)
 * Tên API: Danh sách loại phòng công khai của homestay
 * Ngày thực hiện: 17/10/2026
 */
@Getter
@Builder
public class RoomTypePublicResponse {
    private Long id;
    private Long homestayId;
    private String name;
    private String description;

    public static RoomTypePublicResponse from(RoomType rt) {
        if (rt == null) return null;
        return RoomTypePublicResponse.builder()
                .id(rt.getId())
                .homestayId(rt.getHomestayId())
                .name(rt.getName())
                .description(rt.getDescription())
                .build();
    }
}
