package vn.edu.hust.homestay.homestay.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.homestay.dto.HomestayPublicResponse;
import vn.edu.hust.homestay.homestay.entity.Homestay;
import vn.edu.hust.homestay.homestay.entity.Homestay.HomestayStatus;
import vn.edu.hust.homestay.homestay.repository.HomestayRepository;

@Service
@Transactional(readOnly = true)
public class PublicHomestayService {

    private final HomestayRepository homestayRepository;

    public PublicHomestayService(HomestayRepository homestayRepository) {
        this.homestayRepository = homestayRepository;
    }

    /**
     * Lấy danh sách homestay ACTIVE, phân trang.
     * Public: không cần auth.
     */
    public Page<HomestayPublicResponse> listActiveHomestays(int page, int size) {
        // Giới hạn max size theo API convention
        int safeSize = Math.min(size, 100);
        Pageable pageable = PageRequest.of(page, safeSize, Sort.by("name").ascending());
        return homestayRepository.findByStatus(HomestayStatus.ACTIVE, pageable)
                .map(HomestayPublicResponse::from);
    }

    /**
     * Lấy chi tiết 1 homestay ACTIVE theo id.
     * Public: không cần auth.
     */
    public HomestayPublicResponse getActiveHomestay(Long id) {
        Homestay homestay = homestayRepository.findByIdAndStatus(id, HomestayStatus.ACTIVE)
                .orElseThrow(() -> BusinessException.notFound(
                        "HOMESTAY_NOT_FOUND",
                        "Không tìm thấy homestay với id: " + id));
        return HomestayPublicResponse.from(homestay);
    }
}
