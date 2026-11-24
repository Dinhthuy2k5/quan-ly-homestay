package vn.edu.hust.homestay.room.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.ROOM_TYPE_DESCRIPTION_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.ROOM_TYPE_NAME_MAX_LENGTH;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class SaveRoomTypeRequest {

    @NotBlank(message = "Tên loại phòng không được để trống")
    @Size(max = ROOM_TYPE_NAME_MAX_LENGTH, message = "Tên loại phòng không được vượt quá " + ROOM_TYPE_NAME_MAX_LENGTH + " ký tự")
    private String name;

    @Size(max = ROOM_TYPE_DESCRIPTION_MAX_LENGTH, message = "Mô tả không được vượt quá " + ROOM_TYPE_DESCRIPTION_MAX_LENGTH + " ký tự")
    private String description;
}
