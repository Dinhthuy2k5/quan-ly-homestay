package vn.edu.hust.homestay.room.dto;

import lombok.Builder;
import lombok.Getter;
import java.util.List;

/** Thông tin tóm tắt để khách duyệt danh sách phòng trong một homestay. */
@Getter
@Builder
public class PublicRoomSummaryResponse {
    private Long id;
    private Long roomTypeId;
    private String name;
    private String roomTypeName;
    private String description;
    private Integer maxGuests;
    private List<String> amenities;
    private String coverImageUrl;
    private Long nightlyPrice;
}
