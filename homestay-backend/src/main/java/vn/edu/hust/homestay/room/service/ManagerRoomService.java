package vn.edu.hust.homestay.room.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.common.response.PagedResult;
import vn.edu.hust.homestay.media.dto.ManagerMediaResponse;
import vn.edu.hust.homestay.media.entity.Media;
import vn.edu.hust.homestay.media.entity.Media.OwnerType;
import vn.edu.hust.homestay.media.repository.MediaRepository;
import vn.edu.hust.homestay.media.service.ManagerMediaService;
import vn.edu.hust.homestay.pricing.entity.PriceRule;
import vn.edu.hust.homestay.pricing.entity.PriceRule.RuleType;
import vn.edu.hust.homestay.pricing.repository.PriceRuleRepository;
import vn.edu.hust.homestay.room.dto.*;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;
import vn.edu.hust.homestay.room.entity.RoomType;
import vn.edu.hust.homestay.room.repository.RoomRepository;
import vn.edu.hust.homestay.room.repository.RoomTypeRepository;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service xử lý các nghiệp vụ phòng cho Manager:
 * - API-MGR-03: Danh sách phòng
 * - API-MGR-04: Thêm phòng
 * - API-MGR-05: Chi tiết phòng
 * - API-MGR-06: Cập nhật phòng
 * - API-MGR-07: Khóa/mở/ngừng phòng
 * Ngày thực hiện: 19/10/2026
 */
@Service
public class ManagerRoomService {

    private static final Logger log = LoggerFactory.getLogger(ManagerRoomService.class);

    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final MediaRepository mediaRepository;
    private final PriceRuleRepository priceRuleRepository;
    private final ManagerMediaService managerMediaService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ManagerRoomService(
            RoomRepository roomRepository,
            RoomTypeRepository roomTypeRepository,
            MediaRepository mediaRepository,
            PriceRuleRepository priceRuleRepository,
            ManagerMediaService managerMediaService
    ) {
        this.roomRepository = roomRepository;
        this.roomTypeRepository = roomTypeRepository;
        this.mediaRepository = mediaRepository;
        this.priceRuleRepository = priceRuleRepository;
        this.managerMediaService = managerMediaService;
    }

    /**
     * API-MGR-03: Danh sách phòng thuộc homestay của Manager, hỗ trợ lọc và phân trang.
     */
    @Transactional(readOnly = true)
    public PagedResult<ManagerRoomSummaryResponse> getRooms(
            UserPrincipal principal,
            RoomStatus status,
            Long roomTypeId,
            String keyword,
            Pageable pageable
    ) {
        Long homestayId = validateAndGetHomestayId(principal);

        Page<Room> page = roomRepository.searchManagerRooms(
                homestayId,
                status,
                roomTypeId,
                keyword != null && !keyword.isBlank() ? keyword.trim() : null,
                pageable
        );

        Map<Long, String> roomTypeNameMap = roomTypeRepository.findByHomestayIdOrderByNameAsc(homestayId)
                .stream()
                .collect(Collectors.toMap(RoomType::getId, RoomType::getName, (a, b) -> a));

        List<ManagerRoomSummaryResponse> items = page.getContent().stream()
                .map(room -> {
                    String coverUrl = mediaRepository
                            .findFirstByOwnerTypeAndOwnerIdOrderBySortOrderAsc(OwnerType.ROOM, room.getId())
                            .map(Media::getUrl)
                            .orElse(null);
                    Long basePrice = priceRuleRepository
                            .findByRoomIdAndRuleTypeAndIsActiveTrue(room.getId(), RuleType.BASE)
                            .map(PriceRule::getBasePrice)
                            .orElse(null);

                    return ManagerRoomSummaryResponse.builder()
                            .id(room.getId())
                            .name(room.getName())
                            .roomTypeId(room.getRoomTypeId())
                            .roomTypeName(roomTypeNameMap.getOrDefault(room.getRoomTypeId(), "Không xác định"))
                            .maxGuests(room.getMaxGuests() != null ? room.getMaxGuests().intValue() : null)
                            .amenities(parseAmenities(room.getAmenities()))
                            .status(room.getStatus())
                            .coverImageUrl(coverUrl)
                            .basePrice(basePrice)
                            .build();
                })
                .toList();

        return PagedResult.of(page, items);
    }

    /**
     * API-MGR-04: Thêm phòng mới thuộc homestay của Manager.
     */
    @Transactional
    public ManagerRoomDetailResponse createRoom(UserPrincipal principal, CreateRoomRequest req) {
        Long homestayId = validateAndGetHomestayId(principal);

        RoomType roomType = roomTypeRepository.findByIdAndHomestayId(req.getRoomTypeId(), homestayId)
                .orElseThrow(() -> BusinessException.badRequest(
                        "ROOM_TYPE_SCOPE_MISMATCH",
                        "Loại phòng không thuộc homestay được giao"
                ));

        String trimmedName = req.getName().trim();
        if (roomRepository.existsByHomestayIdAndName(homestayId, trimmedName)) {
            throw BusinessException.conflict("ROOM_NAME_EXISTS", "Tên phòng đã tồn tại trong homestay");
        }

        Room room = new Room();
        room.setHomestayId(homestayId);
        room.setRoomTypeId(req.getRoomTypeId());
        room.setName(trimmedName);
        room.setDescription(req.getDescription());
        room.setMaxGuests(req.getMaxGuests());
        room.setAmenities(serializeAmenities(req.getAmenities()));
        room.setStatus(RoomStatus.ACTIVE);

        Room saved = roomRepository.save(room);
        return toDetailResponse(saved, roomType.getName());
    }

    /** API-MGR-04: Tạo phòng và các ảnh kèm theo trong cùng một transaction. */
    @Transactional
    public ManagerRoomDetailResponse createRoomWithMedia(
            UserPrincipal principal,
            CreateRoomRequest req,
            List<MultipartFile> files
    ) {
        List<MultipartFile> selectedFiles = files == null ? List.of() : files.stream()
                .filter(file -> file != null && !file.isEmpty())
                .toList();
        if (selectedFiles.size() > 8) {
            throw BusinessException.badRequest("TOO_MANY_MEDIA_FILES", "Mỗi lần tạo phòng chỉ được tải tối đa 8 ảnh");
        }

        ManagerRoomDetailResponse created = createRoom(principal, req);
        for (int i = 0; i < selectedFiles.size(); i++) {
            managerMediaService.upload(principal, "ROOM", created.getId(), null, i, selectedFiles.get(i));
        }

        return getRoomDetail(principal, created.getId());
    }

    /**
     * API-MGR-05: Chi tiết phòng thuộc homestay của Manager.
     */
    @Transactional(readOnly = true)
    public ManagerRoomDetailResponse getRoomDetail(UserPrincipal principal, Long roomId) {
        Long homestayId = validateAndGetHomestayId(principal);

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> BusinessException.notFound("ROOM_NOT_FOUND", "Không tìm thấy phòng"));

        if (!room.getHomestayId().equals(homestayId)) {
            throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Không có quyền thao tác trên phòng thuộc cơ sở khác");
        }

        RoomType roomType = roomTypeRepository.findById(room.getRoomTypeId()).orElse(null);
        return toDetailResponse(room, roomType != null ? roomType.getName() : null);
    }

    /**
     * API-MGR-06: Cập nhật phòng.
     */
    @Transactional
    public ManagerRoomDetailResponse updateRoom(UserPrincipal principal, Long roomId, UpdateRoomRequest req) {
        Long homestayId = validateAndGetHomestayId(principal);

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> BusinessException.notFound("ROOM_NOT_FOUND", "Không tìm thấy phòng"));

        if (!room.getHomestayId().equals(homestayId)) {
            throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Không có quyền thao tác trên phòng thuộc cơ sở khác");
        }

        // 1. Kiểm tra nếu đổi roomTypeId
        if (req.getRoomTypeId() != null && !req.getRoomTypeId().equals(room.getRoomTypeId())) {
            roomTypeRepository.findByIdAndHomestayId(req.getRoomTypeId(), homestayId)
                    .orElseThrow(() -> BusinessException.badRequest(
                            "ROOM_TYPE_SCOPE_MISMATCH",
                            "Loại phòng không thuộc homestay được giao"
                    ));

            if (roomRepository.countFutureActiveBookings(roomId) > 0) {
                throw BusinessException.conflict(
                        "ROOM_HAS_CONFLICTING_BOOKINGS",
                        "Không thể thay đổi loại phòng khi phòng đã có lịch đặt trong tương lai"
                );
            }
            room.setRoomTypeId(req.getRoomTypeId());
        }

        // 2. Kiểm tra nếu đổi tên
        if (req.getName() != null) {
            String trimmedName = req.getName().trim();
            if (!trimmedName.equalsIgnoreCase(room.getName())) {
                if (roomRepository.existsByHomestayIdAndNameAndIdNot(homestayId, trimmedName, roomId)) {
                    throw BusinessException.conflict("ROOM_NAME_EXISTS", "Tên phòng đã tồn tại trong homestay");
                }
            }
            room.setName(trimmedName);
        }

        // 3. Kiểm tra nếu đổi maxGuests
        if (req.getMaxGuests() != null && !req.getMaxGuests().equals(room.getMaxGuests())) {
            if (req.getMaxGuests() < room.getMaxGuests()) {
                if (roomRepository.countFutureActiveBookingsWithMoreGuests(roomId, req.getMaxGuests()) > 0) {
                    throw BusinessException.conflict(
                            "ROOM_HAS_CONFLICTING_BOOKINGS",
                            "Sức chứa mới nhỏ hơn số lượng khách trong lịch đặt tương lai"
                    );
                }
            }
            room.setMaxGuests(req.getMaxGuests());
        }

        // 4. Cập nhật mô tả & tiện nghi
        if (req.getDescription() != null) {
            room.setDescription(req.getDescription());
        }
        if (req.getAmenities() != null) {
            room.setAmenities(serializeAmenities(req.getAmenities()));
        }

        Room saved = roomRepository.save(room);
        RoomType rt = roomTypeRepository.findById(saved.getRoomTypeId()).orElse(null);
        return toDetailResponse(saved, rt != null ? rt.getName() : null);
    }

    /**
     * API-MGR-07: Khóa/mở/ngừng hoạt động phòng.
     */
    @Transactional
    public RoomStatusResponse updateRoomStatus(UserPrincipal principal, Long roomId, UpdateRoomStatusRequest req) {
        Long homestayId = validateAndGetHomestayId(principal);

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> BusinessException.notFound("ROOM_NOT_FOUND", "Không tìm thấy phòng"));

        if (!room.getHomestayId().equals(homestayId)) {
            throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Không có quyền thao tác trên phòng thuộc cơ sở khác");
        }

        if ((req.getStatus() == RoomStatus.LOCKED || req.getStatus() == RoomStatus.INACTIVE)
                && room.getStatus() != req.getStatus()) {
            if (roomRepository.countFutureActiveBookings(roomId) > 0) {
                throw BusinessException.conflict(
                        "ROOM_HAS_FUTURE_BOOKINGS",
                        "Phòng đang có lịch đặt trong tương lai, không thể khóa hoặc ngừng hoạt động"
                );
            }
        }

        String reason = req.getReason() != null && !req.getReason().isBlank()
                ? req.getReason().trim()
                : null;
        room.setStatus(req.getStatus());
        room.setStatusReason(reason);
        roomRepository.save(room);

        return new RoomStatusResponse(roomId, req.getStatus(), reason);
    }

    /**
     * Lấy danh sách loại phòng của homestay phục vụ dropdown khi tạo/sửa phòng.
     */
    @Transactional(readOnly = true)
    public List<RoomTypePublicResponse> getHomestayRoomTypes(UserPrincipal principal) {
        Long homestayId = validateAndGetHomestayId(principal);
        return roomTypeRepository.findByHomestayIdOrderByNameAsc(homestayId)
                .stream()
                .map(RoomTypePublicResponse::from)
                .toList();
    }

    private Long validateAndGetHomestayId(UserPrincipal principal) {
        if (principal == null || principal.getHomestayId() == null) {
            throw BusinessException.badRequest("HOMESTAY_NOT_ASSIGNED", "Tài khoản quản lý chưa được phân công cơ sở");
        }
        return principal.getHomestayId();
    }

    private List<String> parseAmenities(String json) {
        if (json == null || json.trim().isEmpty()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            log.warn("Không thể parse amenities JSON: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private String serializeAmenities(List<String> amenities) {
        if (amenities == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(amenities);
        } catch (Exception e) {
            log.warn("Không thể serialize amenities JSON: {}", e.getMessage());
            return "[]";
        }
    }

    private ManagerRoomDetailResponse toDetailResponse(Room room, String roomTypeName) {
        List<ManagerMediaResponse> mediaList = mediaRepository
                .findByOwnerTypeAndOwnerIdOrderBySortOrderAsc(OwnerType.ROOM, room.getId())
                .stream()
                .map(ManagerMediaResponse::from)
                .toList();

        Long basePrice = priceRuleRepository
                .findByRoomIdAndRuleTypeAndIsActiveTrue(room.getId(), RuleType.BASE)
                .map(PriceRule::getBasePrice)
                .orElse(null);

        return ManagerRoomDetailResponse.builder()
                .id(room.getId())
                .homestayId(room.getHomestayId())
                .roomTypeId(room.getRoomTypeId())
                .roomTypeName(roomTypeName)
                .name(room.getName())
                .description(room.getDescription())
                .maxGuests(room.getMaxGuests() != null ? room.getMaxGuests().intValue() : null)
                .amenities(parseAmenities(room.getAmenities()))
                .status(room.getStatus())
                .media(mediaList)
                .basePrice(basePrice)
                .createdAt(room.getCreatedAt())
                .updatedAt(room.getUpdatedAt())
                .build();
    }
}
