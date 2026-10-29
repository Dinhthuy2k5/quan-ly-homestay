package vn.edu.hust.homestay.room.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/** Request body API-PUB-03: tìm phòng còn trống và báo giá theo từng đêm. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AvailabilitySearchRequest {

    private String province;
    private String keyword;
    private Long homestayId;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Integer guestCount;
    private Integer page = 0;
    private Integer size = 10;
}
