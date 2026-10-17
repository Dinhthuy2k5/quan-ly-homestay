package vn.edu.hust.homestay.room.dto;

import lombok.Builder;
import lombok.Getter;
import vn.edu.hust.homestay.media.dto.MediaItemResponse;

import java.util.List;

/**
 * Mã API: API-PUB-06
 * Tên API: Xem chi tiết thông tin phòng
 * DTO trả về thông tin đầy đủ của một phòng: giá cơ bản theo đêm, tiện nghi, hình ảnh, sức chứa và homestay.
 * Ngày thực hiện: 17/10/2026
 */
@Getter
@Builder
public class RoomDetailPublicResponse {
    private Long id;
    private HomestayInfo homestay;
    private RoomTypeInfo roomType;
    private String name;
    private String description;
    private Integer maxGuests;
    private List<String> amenities;
    private List<MediaItemResponse> media;
    private Long nightlyPrice;

    @Getter
    @Builder
    public static class HomestayInfo {
        private Long id;
        private String name;
        private String province;
        private String address;
        private String hotlinePhone;
    }

    @Getter
    @Builder
    public static class RoomTypeInfo {
        private Long id;
        private String name;
        private String description;
    }
}
