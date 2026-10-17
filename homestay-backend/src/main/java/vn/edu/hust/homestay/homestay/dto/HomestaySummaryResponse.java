package vn.edu.hust.homestay.homestay.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * Mã API: API-PUB-05
 * Tên API: Tra cứu homestay theo địa điểm / danh sách homestay
 * DTO trả về cho từng mục homestay tóm tắt.
 * Ngày thực hiện: 17/10/2026
 */
@Getter
@Builder
public class HomestaySummaryResponse {
    private Long id;
    private String name;
    private String province;
    private String hotlinePhone;
    private String coverImageUrl;
}
