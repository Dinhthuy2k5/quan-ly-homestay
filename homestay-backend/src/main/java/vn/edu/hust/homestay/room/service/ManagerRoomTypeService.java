package vn.edu.hust.homestay.room.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.room.dto.RoomTypePublicResponse;
import vn.edu.hust.homestay.room.dto.SaveRoomTypeRequest;
import vn.edu.hust.homestay.room.entity.RoomType;
import vn.edu.hust.homestay.room.repository.RoomRepository;
import vn.edu.hust.homestay.room.repository.RoomTypeRepository;

import java.util.List;
import java.util.Map;

@Service
public class ManagerRoomTypeService {

    private final RoomTypeRepository roomTypeRepository;
    private final RoomRepository roomRepository;

    public ManagerRoomTypeService(RoomTypeRepository roomTypeRepository, RoomRepository roomRepository) {
        this.roomTypeRepository = roomTypeRepository;
        this.roomRepository = roomRepository;
    }

    @Transactional(readOnly = true)
    public List<RoomTypePublicResponse> getRoomTypes(UserPrincipal principal) {
        Long homestayId = homestayId(principal);
        return roomTypeRepository.findByHomestayIdOrderByNameAsc(homestayId).stream()
                .map(RoomTypePublicResponse::from)
                .toList();
    }

    @Transactional
    public RoomTypePublicResponse createRoomType(UserPrincipal principal, SaveRoomTypeRequest request) {
        Long homestayId = homestayId(principal);
        String name = request.getName().trim();
        if (roomTypeRepository.existsByHomestayIdAndName(homestayId, name)) {
            throw BusinessException.conflict("ROOM_TYPE_NAME_EXISTS", "Tên loại phòng đã tồn tại");
        }

        RoomType roomType = new RoomType();
        roomType.setHomestayId(homestayId);
        roomType.setName(name);
        roomType.setDescription(trimToNull(request.getDescription()));
        return RoomTypePublicResponse.from(roomTypeRepository.save(roomType));
    }

    @Transactional
    public RoomTypePublicResponse updateRoomType(
            UserPrincipal principal,
            Long roomTypeId,
            SaveRoomTypeRequest request
    ) {
        Long homestayId = homestayId(principal);
        RoomType roomType = findOwnedRoomType(roomTypeId, homestayId);
        String name = request.getName().trim();
        if (!name.equalsIgnoreCase(roomType.getName())
                && roomTypeRepository.existsByHomestayIdAndName(homestayId, name)) {
            throw BusinessException.conflict("ROOM_TYPE_NAME_EXISTS", "Tên loại phòng đã tồn tại");
        }

        roomType.setName(name);
        roomType.setDescription(trimToNull(request.getDescription()));
        return RoomTypePublicResponse.from(roomTypeRepository.save(roomType));
    }

    @Transactional
    public Map<String, Boolean> deleteRoomType(UserPrincipal principal, Long roomTypeId) {
        Long homestayId = homestayId(principal);
        RoomType roomType = findOwnedRoomType(roomTypeId, homestayId);
        if (roomRepository.existsByRoomTypeIdAndHomestayId(roomTypeId, homestayId)) {
            throw BusinessException.conflict("ROOM_TYPE_IN_USE", "Không thể xóa loại phòng đang được phòng sử dụng");
        }
        roomTypeRepository.delete(roomType);
        return Map.of("deleted", true);
    }

    private RoomType findOwnedRoomType(Long roomTypeId, Long homestayId) {
        return roomTypeRepository.findByIdAndHomestayId(roomTypeId, homestayId)
                .orElseThrow(() -> BusinessException.notFound("ROOM_TYPE_NOT_FOUND", "Không tìm thấy loại phòng"));
    }

    private Long homestayId(UserPrincipal principal) {
        if (principal == null || principal.getHomestayId() == null) {
            throw BusinessException.badRequest("HOMESTAY_NOT_ASSIGNED", "Tài khoản quản lý chưa được phân công cơ sở");
        }
        return principal.getHomestayId();
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
