package vn.edu.hust.homestay.room.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

/** Những đêm đã được giữ của một phòng trong khoảng ngày đã tra cứu. */
@Getter
@Builder
public class RoomAvailabilityResponse {
    private Long roomId;
    private LocalDate fromDate;
    private LocalDate toDate;
    private List<LocalDate> unavailableDates;
}
