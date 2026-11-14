package vn.edu.hust.homestay.homestay.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.common.response.PagedResult;
import vn.edu.hust.homestay.homestay.dto.HomestayDetailResponse;
import vn.edu.hust.homestay.homestay.dto.HomestaySummaryResponse;
import vn.edu.hust.homestay.homestay.entity.Homestay;
import vn.edu.hust.homestay.homestay.entity.Homestay.HomestayStatus;
import vn.edu.hust.homestay.homestay.repository.HomestayRepository;
import vn.edu.hust.homestay.media.dto.MediaItemResponse;
import vn.edu.hust.homestay.media.entity.Media.OwnerType;
import vn.edu.hust.homestay.media.repository.MediaRepository;
import vn.edu.hust.homestay.room.dto.RoomTypePublicResponse;
import vn.edu.hust.homestay.room.repository.RoomTypeRepository;
import vn.edu.hust.homestay.service.dto.PublicServiceResponse;
import vn.edu.hust.homestay.service.entity.Service;
import vn.edu.hust.homestay.service.entity.Service.ServiceStatus;
import vn.edu.hust.homestay.service.entity.ServiceCategory;
import vn.edu.hust.homestay.service.repository.ServiceCategoryRepository;
import vn.edu.hust.homestay.service.repository.ServiceRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service xử lý các nghiệp vụ công khai liên quan đến Homestay (Tuần 1).
 * Tuân thủ tài liệu API v1.1 và kế hoạch 10 tuần.
 * Ngày thực hiện: 17/10/2026
 */
@org.springframework.stereotype.Service
@Transactional(readOnly = true)
public class PublicHomestayService {

    private final HomestayRepository homestayRepository;
    private final MediaRepository mediaRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final ServiceRepository serviceRepository;
    private final ServiceCategoryRepository serviceCategoryRepository;

    public PublicHomestayService(
            HomestayRepository homestayRepository,
            MediaRepository mediaRepository,
            RoomTypeRepository roomTypeRepository,
            ServiceRepository serviceRepository,
            ServiceCategoryRepository serviceCategoryRepository
    ) {
        this.homestayRepository = homestayRepository;
        this.mediaRepository = mediaRepository;
        this.roomTypeRepository = roomTypeRepository;
        this.serviceRepository = serviceRepository;
        this.serviceCategoryRepository = serviceCategoryRepository;
    }

    /**
     * Mã API: API-PUB-05
     * Tên API: Tra cứu homestay theo địa điểm / danh sách homestay
     * Ngày thực hiện: 17/10/2026
     * Tìm kiếm homestay theo địa điểm (province) hoặc từ khóa (keyword), phân trang.
     * Chỉ trả về các homestay có status = ACTIVE.
     */
    public PagedResult<HomestaySummaryResponse> searchHomestays(String province, String keyword, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        Pageable pageable = PageRequest.of(safePage, safeSize);

        String trimmedProvince = (province != null && !province.trim().isEmpty()) ? province.trim() : null;
        String trimmedKeyword = (keyword != null && !keyword.trim().isEmpty()) ? keyword.trim() : null;

        Page<Homestay> homestayPage = homestayRepository.searchActiveHomestays(
                HomestayStatus.ACTIVE,
                trimmedProvince,
                trimmedKeyword,
                pageable
        );

        List<HomestaySummaryResponse> items = homestayPage.getContent().stream()
                .map(h -> {
                    String coverImageUrl = mediaRepository
                            .findFirstByOwnerTypeAndOwnerIdOrderBySortOrderAsc(OwnerType.HOMESTAY, h.getId())
                            .map(m -> m.getUrl())
                            .orElse(null);

                    return HomestaySummaryResponse.builder()
                            .id(h.getId())
                            .name(h.getName())
                            .province(h.getProvince())
                            .hotlinePhone(h.getHotlinePhone())
                            .coverImageUrl(coverImageUrl)
                            .build();
                })
                .toList();

        return PagedResult.of(
                items,
                homestayPage.getNumber(),
                homestayPage.getSize(),
                homestayPage.getTotalElements(),
                homestayPage.getTotalPages()
        );
    }

    /**
     * Mã API: API-PUB-02
     * Tên API: Chi tiết homestay
     * Ngày thực hiện: 17/10/2026
     * Trả thông tin giới thiệu, hotlinePhone, địa chỉ và danh sách media của homestay.
     */
    public HomestayDetailResponse getHomestayDetail(Long homestayId) {
        Homestay homestay = homestayRepository.findByIdAndStatus(homestayId, HomestayStatus.ACTIVE)
                .orElseThrow(() -> BusinessException.notFound(
                        "HOMESTAY_NOT_FOUND",
                        "Không tìm thấy homestay với id: " + homestayId
                ));

        List<MediaItemResponse> mediaList = mediaRepository
                .findByOwnerTypeAndOwnerIdOrderBySortOrderAsc(OwnerType.HOMESTAY, homestayId)
                .stream()
                .map(MediaItemResponse::from)
                .toList();

        return HomestayDetailResponse.builder()
                .id(homestay.getId())
                .name(homestay.getName())
                .province(homestay.getProvince())
                .address(homestay.getAddress())
                .hotlinePhone(homestay.getHotlinePhone())
                .description(homestay.getDescription())
                .media(mediaList)
                .build();
    }

    /**
     * Mã API: API-PUB-ROOM-TYPE-01 (GET /public/homestays/{homestayId}/room-types)
     * Tên API: Danh sách loại phòng công khai của homestay
     * Ngày thực hiện: 17/10/2026
     * Xem danh mục loại phòng thuộc một homestay đang hoạt động.
     */
    public List<RoomTypePublicResponse> getHomestayRoomTypes(Long homestayId) {
        // Kiểm tra homestay tồn tại và đang hoạt động
        homestayRepository.findByIdAndStatus(homestayId, HomestayStatus.ACTIVE)
                .orElseThrow(() -> BusinessException.notFound(
                        "HOMESTAY_NOT_FOUND",
                        "Không tìm thấy homestay với id: " + homestayId
                ));

        return roomTypeRepository.findByHomestayIdOrderByNameAsc(homestayId)
                .stream()
                .map(RoomTypePublicResponse::from)
                .toList();
    }

    /** API-PUB-04: Public catalog of currently active services at an active homestay, enriched with category. */
    public List<PublicServiceResponse> getActiveServices(Long homestayId) {
        homestayRepository.findByIdAndStatus(homestayId, HomestayStatus.ACTIVE)
                .orElseThrow(() -> BusinessException.notFound(
                        "HOMESTAY_NOT_FOUND", "Không tìm thấy homestay đang hoạt động"));

        Map<Long, String> categoryNames = serviceCategoryRepository.findAllByHomestayId(homestayId).stream()
                .collect(Collectors.toMap(
                        ServiceCategory::getId,
                        ServiceCategory::getName,
                        (existing, replacement) -> existing
                ));

        return serviceRepository
                .findByHomestayIdAndStatusOrderByNameAsc(homestayId, ServiceStatus.ACTIVE)
                .stream()
                .map(service -> PublicServiceResponse.from(service, categoryNames.get(service.getCategoryId())))
                .toList();
    }
}
