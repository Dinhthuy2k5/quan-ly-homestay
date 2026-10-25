package vn.edu.hust.homestay.room.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.common.response.PagedResult;
import vn.edu.hust.homestay.homestay.entity.Homestay;
import vn.edu.hust.homestay.homestay.entity.Homestay.HomestayStatus;
import vn.edu.hust.homestay.homestay.repository.HomestayRepository;
import vn.edu.hust.homestay.media.dto.MediaItemResponse;
import vn.edu.hust.homestay.media.entity.Media.OwnerType;
import vn.edu.hust.homestay.media.repository.MediaRepository;
import vn.edu.hust.homestay.pricing.entity.PriceRule;
import vn.edu.hust.homestay.pricing.entity.PriceRule.RuleType;
import vn.edu.hust.homestay.pricing.repository.PriceRuleRepository;
import vn.edu.hust.homestay.room.dto.RoomDetailPublicResponse;
import vn.edu.hust.homestay.room.dto.PublicRoomSummaryResponse;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;
import vn.edu.hust.homestay.room.entity.RoomType;
import vn.edu.hust.homestay.room.repository.RoomRepository;
import vn.edu.hust.homestay.room.repository.RoomTypeRepository;

import java.util.Collections;
import java.util.List;

/**
 * Service xử lý các nghiệp vụ công khai liên quan đến Phòng và giá cơ bản (Tuần 1).
 * Tuân thủ tài liệu API v1.1 và kế hoạch 10 tuần.
 * Ngày thực hiện: 17/10/2026
 */
@Service
@Transactional(readOnly = true)
public class PublicRoomService {

    private static final Logger log = LoggerFactory.getLogger(PublicRoomService.class);

    private final RoomRepository roomRepository;
    private final HomestayRepository homestayRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final MediaRepository mediaRepository;
    private final PriceRuleRepository priceRuleRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PublicRoomService(
            RoomRepository roomRepository,
            HomestayRepository homestayRepository,
            RoomTypeRepository roomTypeRepository,
            MediaRepository mediaRepository,
            PriceRuleRepository priceRuleRepository
    ) {
        this.roomRepository = roomRepository;
        this.homestayRepository = homestayRepository;
        this.roomTypeRepository = roomTypeRepository;
        this.mediaRepository = mediaRepository;
        this.priceRuleRepository = priceRuleRepository;
    }

    /**
     * Mã API: API-PUB-06
     * Tên API: Xem chi tiết thông tin phòng
     * Phương thức: GET
     * Đường dẫn: /api/v1/public/rooms/{roomId}
     * Quyền truy cập: PUBLIC
     * Ngày thực hiện: 17/10/2026
     * Mục đích: Xem thông tin đầy đủ của một phòng trước khi đặt: giá cơ bản theo đêm (BASE price),
     * tiện nghi, hình ảnh, sức chứa và thông tin homestay.
     */
    public RoomDetailPublicResponse getRoomDetail(Long roomId) {
        // 1. Kiểm tra phòng tồn tại và đang hoạt động (ACTIVE)
        Room room = roomRepository.findByIdAndStatus(roomId, RoomStatus.ACTIVE)
                .orElseThrow(() -> BusinessException.notFound(
                        "ROOM_NOT_FOUND",
                        "Không tìm thấy phòng với id: " + roomId
                ));

        // 2. Lấy thông tin homestay (phải là ACTIVE)
        Homestay homestay = homestayRepository.findByIdAndStatus(room.getHomestayId(), HomestayStatus.ACTIVE)
                .orElseThrow(() -> BusinessException.notFound(
                        "HOMESTAY_NOT_FOUND",
                        "Homestay của phòng này không tồn tại hoặc đã ngừng hoạt động"
                ));

        // 3. Lấy thông tin loại phòng
        RoomType roomType = roomTypeRepository.findById(room.getRoomTypeId())
                .orElse(null);

        // 4. Parse tiện nghi từ JSON column
        List<String> amenitiesList = Collections.emptyList();
        if (room.getAmenities() != null && !room.getAmenities().trim().isEmpty()) {
            try {
                amenitiesList = objectMapper.readValue(room.getAmenities(), new TypeReference<List<String>>() {});
            } catch (Exception e) {
                log.warn("Không thể parse amenities JSON cho room id {}: {}", roomId, e.getMessage());
            }
        }

        // 5. Lấy danh sách media của phòng
        List<MediaItemResponse> mediaList = mediaRepository
                .findByOwnerTypeAndOwnerIdOrderBySortOrderAsc(OwnerType.ROOM, roomId)
                .stream()
                .map(MediaItemResponse::from)
                .toList();

        // 6. Lấy giá BASE hiện tại đang hoạt động
        Long nightlyPrice = priceRuleRepository
                .findByRoomIdAndRuleTypeAndStatus(roomId, RuleType.BASE, PriceRule.Status.ACTIVE)
                .map(PriceRule::getBasePrice)
                .orElse(null);

        return RoomDetailPublicResponse.builder()
                .id(room.getId())
                .name(room.getName())
                .description(room.getDescription())
                .maxGuests(room.getMaxGuests() != null ? room.getMaxGuests().intValue() : null)
                .amenities(amenitiesList)
                .media(mediaList)
                .nightlyPrice(nightlyPrice)
                .homestay(RoomDetailPublicResponse.HomestayInfo.builder()
                        .id(homestay.getId())
                        .name(homestay.getName())
                        .province(homestay.getProvince())
                        .address(homestay.getAddress())
                        .hotlinePhone(homestay.getHotlinePhone())
                        .build())
                .roomType(roomType != null ? RoomDetailPublicResponse.RoomTypeInfo.builder()
                        .id(roomType.getId())
                        .name(roomType.getName())
                        .description(roomType.getDescription())
                        .build() : null)
                .build();
    }

    /** Danh sách phòng ACTIVE có thể xem công khai tại một homestay ACTIVE. */
    public PagedResult<PublicRoomSummaryResponse> getHomestayRooms(Long homestayId, int page, int size) {
        homestayRepository.findByIdAndStatus(homestayId, HomestayStatus.ACTIVE)
                .orElseThrow(() -> BusinessException.notFound("HOMESTAY_NOT_FOUND", "Không tìm thấy homestay đang hoạt động"));

        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Page<Room> rooms = roomRepository.findByHomestayIdAndStatusOrderByIdAsc(
                homestayId, RoomStatus.ACTIVE, PageRequest.of(safePage, safeSize));

        List<PublicRoomSummaryResponse> items = rooms.getContent().stream().map(room -> {
            RoomType roomType = roomTypeRepository.findByIdAndHomestayId(room.getRoomTypeId(), homestayId).orElse(null);
            List<String> amenities = parseAmenities(room.getAmenities(), room.getId());
            String coverUrl = mediaRepository.findFirstByOwnerTypeAndOwnerIdOrderBySortOrderAsc(OwnerType.ROOM, room.getId())
                    .map(media -> media.getUrl()).orElse(null);
            Long nightlyPrice = priceRuleRepository.findByRoomIdAndRuleTypeAndStatus(room.getId(), RuleType.BASE, PriceRule.Status.ACTIVE)
                    .map(PriceRule::getBasePrice).orElse(null);

            return PublicRoomSummaryResponse.builder()
                    .id(room.getId())
                    .roomTypeId(room.getRoomTypeId())
                    .name(room.getName())
                    .roomTypeName(roomType != null ? roomType.getName() : null)
                    .description(room.getDescription())
                    .maxGuests(room.getMaxGuests() != null ? room.getMaxGuests().intValue() : null)
                    .amenities(amenities)
                    .coverImageUrl(coverUrl)
                    .nightlyPrice(nightlyPrice)
                    .build();
        }).toList();

        return PagedResult.of(rooms, items);
    }

    private List<String> parseAmenities(String json, Long roomId) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            log.warn("Không thể parse amenities JSON cho room id {}: {}", roomId, e.getMessage());
            return Collections.emptyList();
        }
    }
}
