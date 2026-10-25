package vn.edu.hust.homestay.room.controller;

import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.response.ApiResponse;
import vn.edu.hust.homestay.common.response.PagedResult;
import vn.edu.hust.homestay.room.dto.*;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;
import vn.edu.hust.homestay.room.service.ManagerRoomService;
import vn.edu.hust.homestay.pricing.dto.ManagerRoomBasePriceResponse;

/**
 * Controller xử lý các API quản lý phòng của Manager:
 * - API-MGR-03: GET /api/v1/manager/rooms
 * - API-MGR-04: POST /api/v1/manager/rooms
 * - API-MGR-05: GET /api/v1/manager/rooms/{roomId}
 * - API-MGR-06: PATCH /api/v1/manager/rooms/{roomId}
 * - API-MGR-07: PATCH /api/v1/manager/rooms/{roomId}/status
 * Ngày thực hiện: 19/10/2026
 */
@RestController
@RequestMapping("/api/v1/manager/rooms")
@PreAuthorize("hasRole('MANAGER')")
public class ManagerRoomController {

    private final ManagerRoomService managerRoomService;

    public ManagerRoomController(ManagerRoomService managerRoomService) {
        this.managerRoomService = managerRoomService;
    }

    /**
     * API-MGR-03 — Danh sách phòng thuộc homestay của Manager
     */
    @GetMapping
    public ResponseEntity<ApiResponse<java.util.List<ManagerRoomSummaryResponse>>> getRooms(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) RoomStatus status,
            @RequestParam(required = false) Long roomTypeId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        int boundedSize = Math.min(Math.max(1, size), 100);
        int validPage = Math.max(0, page);
        Pageable pageable = PageRequest.of(validPage, boundedSize);

        PagedResult<ManagerRoomSummaryResponse> result = managerRoomService.getRooms(
                principal,
                status,
                roomTypeId,
                keyword,
                pageable
        );

        vn.edu.hust.homestay.common.response.PageMeta meta = vn.edu.hust.homestay.common.response.PageMeta.builder()
                .page(result.getPage())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .first(result.getPage() == 0)
                .last(result.getPage() >= result.getTotalPages() - 1)
                .build();

        return ResponseEntity.ok(ApiResponse.ok(result.getItems(), meta));
    }

    /**
     * API-MGR-04 — Thêm phòng mới bằng JSON, không đính kèm tệp.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ManagerRoomDetailResponse>> createRoom(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateRoomRequest request
    ) {
        ManagerRoomDetailResponse response = managerRoomService.createRoom(principal, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    /** API-MGR-04: Tạo phòng kèm tối đa 8 ảnh trong một request multipart/form-data. */
    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<ManagerRoomDetailResponse>> createRoomWithMedia(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestPart("room") CreateRoomRequest request,
            @RequestPart(value = "files", required = false) java.util.List<MultipartFile> files
    ) {
        ManagerRoomDetailResponse response = managerRoomService.createRoomWithMedia(principal, request, files);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    /**
     * API-MGR-05 — Chi tiết phòng
     */
    @GetMapping("/{roomId}")
    public ResponseEntity<ApiResponse<ManagerRoomDetailResponse>> getRoomDetail(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long roomId
    ) {
        ManagerRoomDetailResponse response = managerRoomService.getRoomDetail(principal, roomId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /** API-PRICE-01 — Giá BASE mỗi đêm đã được Director phê duyệt. */
    @GetMapping("/{roomId}/base-price")
    public ResponseEntity<ApiResponse<ManagerRoomBasePriceResponse>> getRoomBasePrice(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long roomId
    ) {
        ManagerRoomBasePriceResponse response = managerRoomService.getRoomBasePrice(principal, roomId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * API-MGR-06 — Cập nhật phòng
     */
    @PatchMapping("/{roomId}")
    public ResponseEntity<ApiResponse<ManagerRoomDetailResponse>> updateRoom(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long roomId,
            @Valid @RequestBody UpdateRoomRequest request
    ) {
        ManagerRoomDetailResponse response = managerRoomService.updateRoom(principal, roomId, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * API-MGR-07 — Khóa/mở/ngừng phòng
     */
    @PatchMapping("/{roomId}/status")
    public ResponseEntity<ApiResponse<RoomStatusResponse>> updateRoomStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long roomId,
            @Valid @RequestBody UpdateRoomStatusRequest request
    ) {
        RoomStatusResponse response = managerRoomService.updateRoomStatus(principal, roomId, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
