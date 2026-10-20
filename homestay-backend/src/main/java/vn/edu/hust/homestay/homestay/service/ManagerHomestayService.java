package vn.edu.hust.homestay.homestay.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.homestay.dto.ManagerHomestayResponse;
import vn.edu.hust.homestay.homestay.dto.UpdateManagerHomestayRequest;
import vn.edu.hust.homestay.homestay.entity.Homestay;
import vn.edu.hust.homestay.homestay.repository.HomestayRepository;

/**
 * Service xử lý các nghiệp vụ quản lý Homestay cho Manager:
 * - API-MGR-01: Xem homestay được giao
 * - API-MGR-02: Cập nhật thông tin homestay
 * Ngày thực hiện: 19/10/2026
 */
@Service
public class ManagerHomestayService {

    private final HomestayRepository homestayRepository;

    public ManagerHomestayService(HomestayRepository homestayRepository) {
        this.homestayRepository = homestayRepository;
    }

    /**
     * API-MGR-01: Xem homestay được giao cho Manager đang đăng nhập.
     */
    @Transactional(readOnly = true)
    public ManagerHomestayResponse getAssignedHomestay(UserPrincipal principal) {
        Long homestayId = validateAndGetHomestayId(principal);

        Homestay homestay = homestayRepository.findById(homestayId)
                .orElseThrow(() -> BusinessException.notFound("HOMESTAY_NOT_FOUND", "Không tìm thấy cơ sở homestay"));

        return toResponse(homestay);
    }

    /**
     * API-MGR-02: Cập nhật thông tin homestay của Manager.
     */
    @Transactional
    public ManagerHomestayResponse updateHomestay(UserPrincipal principal, UpdateManagerHomestayRequest req) {
        Long homestayId = validateAndGetHomestayId(principal);

        Homestay homestay = homestayRepository.findById(homestayId)
                .orElseThrow(() -> BusinessException.notFound("HOMESTAY_NOT_FOUND", "Không tìm thấy cơ sở homestay"));

        if (req.getName() != null) {
            homestay.setName(req.getName().trim());
        }
        if (req.getAddress() != null) {



            homestay.setAddress(req.getAddress().trim());
        }
        if (req.getHotlinePhone() != null) {
            homestay.setHotlinePhone(req.getHotlinePhone().trim());
        }
        if (req.getDescription() != null) {
            homestay.setDescription(req.getDescription());
        }

        Homestay saved = homestayRepository.save(homestay);
        return toResponse(saved);
    }

    private Long validateAndGetHomestayId(UserPrincipal principal) {
        if (principal == null || principal.getHomestayId() == null) {
            throw BusinessException.badRequest("HOMESTAY_NOT_ASSIGNED", "Tài khoản quản lý chưa được phân công cơ sở");
        }
        return principal.getHomestayId();
    }

    private ManagerHomestayResponse toResponse(Homestay homestay) {
        return ManagerHomestayResponse.builder()
                .id(homestay.getId())
                .name(homestay.getName())
                .province(homestay.getProvince())
                .address(homestay.getAddress())
                .hotlinePhone(homestay.getHotlinePhone())
                .description(homestay.getDescription())
                .status(homestay.getStatus())
                .build();
    }
}
