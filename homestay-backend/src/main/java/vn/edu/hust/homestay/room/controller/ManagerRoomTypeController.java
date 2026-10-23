package vn.edu.hust.homestay.room.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.response.ApiResponse;
import vn.edu.hust.homestay.room.dto.RoomTypePublicResponse;
import vn.edu.hust.homestay.room.dto.SaveRoomTypeRequest;
import vn.edu.hust.homestay.room.service.ManagerRoomTypeService;

import java.util.List;

/**
 * Controller cho phép Manager lấy danh sách loại phòng của homestay mình phụ trách.
 * Ngày thực hiện: 19/10/2026
 */
@RestController
@RequestMapping("/api/v1/manager/room-types")
@PreAuthorize("hasRole('MANAGER')")
public class ManagerRoomTypeController {

    private final ManagerRoomTypeService managerRoomTypeService;

    public ManagerRoomTypeController(ManagerRoomTypeService managerRoomTypeService) {
        this.managerRoomTypeService = managerRoomTypeService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RoomTypePublicResponse>>> getRoomTypes(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        List<RoomTypePublicResponse> roomTypes = managerRoomTypeService.getRoomTypes(principal);
        return ResponseEntity.ok(ApiResponse.ok(roomTypes));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RoomTypePublicResponse>> createRoomType(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody SaveRoomTypeRequest request
    ) {
        RoomTypePublicResponse response = managerRoomTypeService.createRoomType(principal, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @PatchMapping("/{roomTypeId}")
    public ResponseEntity<ApiResponse<RoomTypePublicResponse>> updateRoomType(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long roomTypeId,
            @Valid @RequestBody SaveRoomTypeRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                managerRoomTypeService.updateRoomType(principal, roomTypeId, request)));
    }

    @DeleteMapping("/{roomTypeId}")
    public ResponseEntity<ApiResponse<java.util.Map<String, Boolean>>> deleteRoomType(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long roomTypeId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                managerRoomTypeService.deleteRoomType(principal, roomTypeId)));
    }
}
