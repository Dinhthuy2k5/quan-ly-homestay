package vn.edu.hust.homestay.room.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hust.homestay.common.response.ApiResponse;
import vn.edu.hust.homestay.room.dto.RoomDetailPublicResponse;
import vn.edu.hust.homestay.room.service.PublicRoomService;
import vn.edu.hust.homestay.room.service.PublicRoomAvailabilityService;
import vn.edu.hust.homestay.room.dto.RoomAvailabilityResponse;

import java.time.LocalDate;

/**
 * Controller phục vụ các API công khai về Phòng (Tuần 1).
 * Quyền truy cập: PUBLIC (không yêu cầu đăng nhập).
 * Ngày thực hiện: 17/10/2026
 */
@Tag(name = "Public — Rooms", description = "Các API công khai tra cứu thông tin phòng và giá cơ bản")
@RestController
@RequestMapping("/api/v1/public/rooms")
public class PublicRoomController {

    private final PublicRoomService publicRoomService;
    private final PublicRoomAvailabilityService availabilityService;

    public PublicRoomController(PublicRoomService publicRoomService, PublicRoomAvailabilityService availabilityService) {
        this.publicRoomService = publicRoomService;
        this.availabilityService = availabilityService;
    }

    /**
     * Mã API: API-PUB-06
     * Tên API: Xem chi tiết thông tin phòng
     * Phương thức: GET
     * Đường dẫn: /api/v1/public/rooms/{roomId}
     * Quyền truy cập: PUBLIC
     * Ngày thực hiện: 17/10/2026
     * Mục đích: Xem thông tin đầy đủ của một phòng trước khi đặt: giá cơ bản theo đêm, tiện nghi,
     * hình ảnh, sức chứa và thông tin homestay.
     */
    @Operation(summary = "API-PUB-06: Xem thông tin chi tiết một phòng")
    @GetMapping("/{roomId}")
    public ResponseEntity<ApiResponse<RoomDetailPublicResponse>> getRoomDetail(
            @PathVariable Long roomId
    ) {
        RoomDetailPublicResponse response = publicRoomService.getRoomDetail(roomId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /** Ngày đã được giữ để khách xem lịch phòng trước khi chọn check-in/check-out. */
    @Operation(summary = "Tra cứu ngày không khả dụng của phòng")
    @GetMapping("/{roomId}/availability")
    public ResponseEntity<ApiResponse<RoomAvailabilityResponse>> getAvailability(
            @PathVariable Long roomId,
            @RequestParam LocalDate fromDate,
            @RequestParam LocalDate toDate
    ) {
        return ResponseEntity.ok(ApiResponse.ok(availabilityService.getAvailability(roomId, fromDate, toDate)));
    }
}
