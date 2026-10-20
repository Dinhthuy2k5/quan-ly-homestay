package vn.edu.hust.homestay.homestay.dto;

import lombok.Builder;
import lombok.Getter;
import vn.edu.hust.homestay.homestay.entity.Homestay.HomestayStatus;

/**
 * Mã API: API-MGR-01, API-MGR-02
 * DTO trả về thông tin homestay cho Manager phụ trách.
 * Ngày thực hiện: 19/10/2026
 */
@Getter
@Builder
public class ManagerHomestayResponse {
    private Long id;
    private String name;
    private String province;
    private String address;
    private String hotlinePhone;
    private String description;
    private HomestayStatus status;
}
