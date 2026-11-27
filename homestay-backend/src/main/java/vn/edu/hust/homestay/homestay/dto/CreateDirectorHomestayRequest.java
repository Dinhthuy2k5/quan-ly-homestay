package vn.edu.hust.homestay.homestay.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import static vn.edu.hust.homestay.common.constant.ValidationConstants.HOMESTAY_ADDRESS_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.HOMESTAY_DESCRIPTION_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.HOMESTAY_HOTLINE_PHONE_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.HOMESTAY_HOTLINE_PHONE_REGEX;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.HOMESTAY_NAME_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.HOMESTAY_PROVINCE_MAX_LENGTH;

/**
 * Mã API: API-DIR-HS-01 (POST /api/v1/director/homestays).
 * DTO tạo cơ sở homestay mới bởi Giám đốc.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateDirectorHomestayRequest {

    @NotBlank(message = "Tên homestay không được để trống")
    @Size(max = HOMESTAY_NAME_MAX_LENGTH, message = "Tên homestay không được vượt quá " + HOMESTAY_NAME_MAX_LENGTH + " ký tự")
    private String name;

    @NotBlank(message = "Tỉnh/thành phố không được để trống")
    @Size(max = HOMESTAY_PROVINCE_MAX_LENGTH, message = "Tỉnh/thành phố không được vượt quá " + HOMESTAY_PROVINCE_MAX_LENGTH + " ký tự")
    private String province;

    @NotBlank(message = "Địa chỉ homestay không được để trống")
    @Size(max = HOMESTAY_ADDRESS_MAX_LENGTH, message = "Địa chỉ homestay không được vượt quá " + HOMESTAY_ADDRESS_MAX_LENGTH + " ký tự")
    private String address;

    @NotBlank(message = "Số điện thoại hotline không được để trống")
    @Size(max = HOMESTAY_HOTLINE_PHONE_MAX_LENGTH, message = "Số điện thoại hotline không được vượt quá " + HOMESTAY_HOTLINE_PHONE_MAX_LENGTH + " ký tự")
    @Pattern(
            regexp = HOMESTAY_HOTLINE_PHONE_REGEX,
            message = "Số điện thoại hotline không đúng định dạng (ví dụ: 02123881234 hoặc +842123881234)"
    )
    private String hotlinePhone;

    @Size(max = HOMESTAY_DESCRIPTION_MAX_LENGTH, message = "Mô tả homestay không được vượt quá " + HOMESTAY_DESCRIPTION_MAX_LENGTH + " ký tự")
    private String description;
}
