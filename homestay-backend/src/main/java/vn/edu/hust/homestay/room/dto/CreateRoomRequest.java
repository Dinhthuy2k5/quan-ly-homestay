package vn.edu.hust.homestay.room.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
    @Size(max = 100, message = "Tên phòng không được vượt quá 100 ký tự")
    private String name;

    private String description;

    @NotNull(message = "Sức chứa tối đa (maxGuests) không được để trống")
    @Min(value = 1, message = "Sức chứa tối đa phải từ 1 người trở lên")
    @Max(value = 50, message = "Sức chứa tối đa không vượt quá 50 người")
    private Byte maxGuests;

    private List<String> amenities;
}
