package vn.edu.hust.homestay.room.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;

/**
 * Mã API: API-MGR-07
 * Response sau khi cập nhật trạng thái phòng.
 * Ngày thực hiện: 19/10/2026
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomStatusResponse {
    private Long roomId;
    private RoomStatus status;
    private String reason;
}
