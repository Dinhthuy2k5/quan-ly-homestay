package vn.edu.hust.homestay.room.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.ROOM_MAX_GUESTS_MAX;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.ROOM_MAX_GUESTS_MIN;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.ROOM_NAME_MAX_LENGTH;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * Mã API: API-MGR-04
 * Request thêm phòng mới.
 * Ngày thực hiện: 19/10/2026
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateRoomRequest {

    @NotNull(message = "roomTypeId không được để trống")
    private Long roomTypeId;

    @NotBlank(message = "Tên phòng không được để trống")
    @Size(max = ROOM_NAME_MAX_LENGTH, message = "Tên phòng không được vượt quá " + ROOM_NAME_MAX_LENGTH + " ký tự")
    private String name;

    private String description;

    @NotNull(message = "Sức chứa tối đa (maxGuests) không được để trống")
    @Min(value = ROOM_MAX_GUESTS_MIN, message = "Sức chứa tối đa phải từ " + ROOM_MAX_GUESTS_MIN + " người trở lên")
    @Max(value = ROOM_MAX_GUESTS_MAX, message = "Sức chứa tối đa không vượt quá " + ROOM_MAX_GUESTS_MAX + " người")
    private Byte maxGuests;

    private List<String> amenities;
}
