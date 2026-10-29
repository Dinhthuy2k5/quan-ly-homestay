package vn.edu.hust.homestay.room.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/** Một phòng còn trống cùng giá được tính từ các rule ACTIVE đã duyệt. */
@Getter
@Builder
public class AvailabilitySearchResponse {
    private Long homestayId;
    private String homestayName;
    private String hotlinePhone;
    private Long roomId;
    private String roomName;
    private String roomTypeName;
    private Integer maxGuests;
    private List<String> amenities;
    private String coverImageUrl;
    private List<QuotedNightResponse> quotedNights;
    private Long roomTotalPrice;
}
