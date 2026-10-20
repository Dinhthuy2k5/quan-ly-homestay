package vn.edu.hust.homestay.room.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;

/**
 * Mã API: API-MGR-07
 * Request khóa/mở/ngừng hoạt động phòng.
 * Ngày thực hiện: 19/10/2026
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateRoomStatusRequest {

    @NotNull(message = "Trạng thái mới không được để trống")
    private RoomStatus status;

    @Size(max = 255, message = "Lý do không được vượt quá 255 ký tự")
    private String reason;
}
