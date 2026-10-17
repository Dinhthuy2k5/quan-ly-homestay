package vn.edu.hust.homestay.homestay.dto;

import lombok.Builder;
import lombok.Getter;
import vn.edu.hust.homestay.media.dto.MediaItemResponse;

import java.util.List;

/**
 * Mã API: API-PUB-02
 * Tên API: Chi tiết homestay
 * DTO trả về thông tin chi tiết của homestay kèm danh sách media.
 * Ngày thực hiện: 17/10/2026
 */
@Getter
@Builder
public class HomestayDetailResponse {
    private Long id;
    private String name;
    private String province;
    private String address;
    private String hotlinePhone;
    private String description;
    private List<MediaItemResponse> media;
}
