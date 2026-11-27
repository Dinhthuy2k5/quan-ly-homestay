package vn.edu.hust.homestay.homestay.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import static vn.edu.hust.homestay.common.constant.ValidationConstants.HOMESTAY_ADDRESS_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.HOMESTAY_DESCRIPTION_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.HOMESTAY_HOTLINE_PHONE_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.HOMESTAY_NAME_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.HOMESTAY_PROVINCE_MAX_LENGTH;

/**
 * Mã API: API-DIR-HS-02 (PATCH /api/v1/director/homestays/{homestayId}).
 * DTO cập nhật từng phần thông tin cơ sở, hotline hoặc trạng thái ACTIVE/INACTIVE.
 * Chỉ các trường khác null được áp dụng; kiểm tra không rỗng và định dạng thực hiện ở Service.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateDirectorHomestayRequest {

    @Size(max = HOMESTAY_NAME_MAX_LENGTH, message = "Tên homestay không được vượt quá " + HOMESTAY_NAME_MAX_LENGTH + " ký tự")
    private String name;

    @Size(max = HOMESTAY_PROVINCE_MAX_LENGTH, message = "Tỉnh/thành phố không được vượt quá " + HOMESTAY_PROVINCE_MAX_LENGTH + " ký tự")
    private String province;

    @Size(max = HOMESTAY_ADDRESS_MAX_LENGTH, message = "Địa chỉ homestay không được vượt quá " + HOMESTAY_ADDRESS_MAX_LENGTH + " ký tự")
    private String address;

    @Size(max = HOMESTAY_HOTLINE_PHONE_MAX_LENGTH, message = "Số điện thoại hotline không được vượt quá " + HOMESTAY_HOTLINE_PHONE_MAX_LENGTH + " ký tự")
    private String hotlinePhone;

    @Size(max = HOMESTAY_DESCRIPTION_MAX_LENGTH, message = "Mô tả homestay không được vượt quá " + HOMESTAY_DESCRIPTION_MAX_LENGTH + " ký tự")
    private String description;

    private String status;
}
