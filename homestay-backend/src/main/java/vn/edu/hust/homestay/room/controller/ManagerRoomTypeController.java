package vn.edu.hust.homestay.room.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.response.ApiResponse;
import vn.edu.hust.homestay.room.dto.RoomTypePublicResponse;
import vn.edu.hust.homestay.room.service.ManagerRoomService;

import java.util.List;

/**
 * Controller cho phép Manager lấy danh sách loại phòng của homestay mình phụ trách.
 * Ngày thực hiện: 19/10/2026
 */
@RestController
@RequestMapping("/api/v1/manager/room-types")
@PreAuthorize("hasRole('MANAGER')")
public class ManagerRoomTypeController {

    private final ManagerRoomService managerRoomService;

    public ManagerRoomTypeController(ManagerRoomService managerRoomService) {
        this.managerRoomService = managerRoomService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RoomTypePublicResponse>>> getRoomTypes(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<RoomTypePublicResponse> roomTypes = managerRoomService.getHomestayRoomTypes(principal);
        return ResponseEntity.ok(ApiResponse.ok(roomTypes));
    }
}
