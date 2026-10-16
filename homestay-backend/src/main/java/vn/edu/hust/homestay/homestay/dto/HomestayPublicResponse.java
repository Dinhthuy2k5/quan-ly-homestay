package vn.edu.hust.homestay.homestay.dto;

import lombok.Builder;
import lombok.Getter;
import vn.edu.hust.homestay.homestay.entity.Homestay;

import java.time.Instant;

/**
 * Response DTO cho thông tin homestay công khai.
 * Không lộ thông tin nội bộ.
 */
@Getter
@Builder
public class HomestayPublicResponse {

    private Long id;
    private String name;
    private String province;
    private String address;
    private String hotlinePhone;
    private String description;
    private String status;
    private Instant createdAt;

    /** Map từ entity sang DTO */
    public static HomestayPublicResponse from(Homestay h) {
        return HomestayPublicResponse.builder()
                .id(h.getId())
                .name(h.getName())
                .province(h.getProvince())
                .address(h.getAddress())
                .hotlinePhone(h.getHotlinePhone())
                .description(h.getDescription())
                .status(h.getStatus().name())
                .createdAt(h.getCreatedAt())
                .build();
    }
}
