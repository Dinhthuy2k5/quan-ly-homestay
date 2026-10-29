package vn.edu.hust.homestay.room.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.homestay.entity.Homestay.HomestayStatus;
import vn.edu.hust.homestay.homestay.repository.HomestayRepository;
import vn.edu.hust.homestay.room.dto.RoomAvailabilityResponse;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;
import vn.edu.hust.homestay.room.repository.RoomRepository;

import java.time.LocalDate;
import java.time.ZoneId;

/** Đọc các đêm đã được giữ để vẽ lịch availability công khai cho một phòng. */
@Service
@Transactional(readOnly = true)
public class PublicRoomAvailabilityService {

    private static final ZoneId BUSINESS_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final long MAX_RANGE_DAYS = 367;

    private final RoomRepository roomRepository;
    private final HomestayRepository homestayRepository;

    public PublicRoomAvailabilityService(RoomRepository roomRepository, HomestayRepository homestayRepository) {
        this.roomRepository = roomRepository;
        this.homestayRepository = homestayRepository;
    }

    public RoomAvailabilityResponse getAvailability(Long roomId, LocalDate fromDate, LocalDate toDate) {
        if (fromDate == null || toDate == null || fromDate.isBefore(LocalDate.now(BUSINESS_TIME_ZONE))
                || !toDate.isAfter(fromDate) || toDate.isAfter(fromDate.plusDays(MAX_RANGE_DAYS))) {
            throw BusinessException.badRequest("INVALID_DATE_RANGE", "Khoảng ngày tra cứu không hợp lệ");
        }

        Room room = roomRepository.findByIdAndStatus(roomId, RoomStatus.ACTIVE)
                .orElseThrow(() -> BusinessException.notFound("ROOM_NOT_FOUND", "Không tìm thấy phòng đang hoạt động"));
        homestayRepository.findByIdAndStatus(room.getHomestayId(), HomestayStatus.ACTIVE)
                .orElseThrow(() -> BusinessException.notFound("HOMESTAY_NOT_FOUND", "Không tìm thấy homestay đang hoạt động"));

        return RoomAvailabilityResponse.builder()
                .roomId(roomId)
                .fromDate(fromDate)
                .toDate(toDate)
                .unavailableDates(roomRepository.findUnavailableStayDates(roomId, fromDate, toDate))
                .build();
    }
}
