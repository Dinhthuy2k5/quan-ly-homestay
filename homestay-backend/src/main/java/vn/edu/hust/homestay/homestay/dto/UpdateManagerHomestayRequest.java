package vn.edu.hust.homestay.homestay.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Mã API: API-MGR-02
 * DTO cập nhật thông tin homestay của Manager.
 * Ngày thực hiện: 19/10/2026
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateManagerHomestayRequest {

    @NotBlank(message = "Tên homestay không được để trống")
    @Size(max = 150, message = "Tên homestay không được vượt quá 150 ký tự")
    private String name;

    @NotBlank(message = "Địa chỉ homestay không được để trống")
    @Size(max = 255, message = "Địa chỉ homestay không được vượt quá 255 ký tự")
    private String address;

    @NotBlank(message = "Số điện thoại hotline không được để trống")
    @Pattern(
        regexp = "^(0|\\+84)[0-9]{8,11}$",
        message = "Số điện thoại hotline không đúng định dạng (ví dụ: 02143871999 hoặc +842143871999)"
    )
    private String hotlinePhone;

    private String description;
}
