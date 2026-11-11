package vn.edu.hust.homestay.homestay.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.hust.homestay.common.response.ApiResponse;
import vn.edu.hust.homestay.common.response.PagedResult;
import vn.edu.hust.homestay.homestay.dto.HomestayDetailResponse;
import vn.edu.hust.homestay.homestay.dto.HomestaySummaryResponse;
import vn.edu.hust.homestay.homestay.service.PublicHomestayService;
import vn.edu.hust.homestay.policy.dto.HomestayPolicyResponse;
import vn.edu.hust.homestay.policy.service.HomestayPolicyService;
import vn.edu.hust.homestay.room.dto.RoomTypePublicResponse;
import vn.edu.hust.homestay.room.dto.PublicRoomSummaryResponse;
import vn.edu.hust.homestay.room.service.PublicRoomService;

import java.util.List;

/**
 * Controller phục vụ các API công khai về Homestay (Tuần 1).
 * Quyền truy cập: PUBLIC (không yêu cầu đăng nhập).
 * Ngày thực hiện: 17/10/2026
 */
@Tag(name = "Public — Homestays", description = "Các API công khai tra cứu thông tin homestay")
@RestController
@RequestMapping("/api/v1/public/homestays")
public class PublicHomestayController {

    private final PublicHomestayService publicHomestayService;
    private final PublicRoomService publicRoomService;
    private final HomestayPolicyService homestayPolicyService;

    public PublicHomestayController(
            PublicHomestayService publicHomestayService,
            PublicRoomService publicRoomService,
            HomestayPolicyService homestayPolicyService
    ) {
        this.publicHomestayService = publicHomestayService;
        this.publicRoomService = publicRoomService;
        this.homestayPolicyService = homestayPolicyService;
    }

    /**
     * Mã API: API-PUB-05
     * Tên API: Tra cứu homestay theo địa điểm / danh sách homestay
     * Phương thức: GET
     * Đường dẫn: /api/v1/public/homestays
     * Quyền truy cập: PUBLIC
     * Ngày thực hiện: 17/10/2026
     * Mục đích: Tìm kiếm homestay theo địa điểm hoặc từ khóa trước khi khách chọn phòng và thời gian lưu trú.
     */
    @Operation(summary = "API-PUB-05: Tra cứu danh sách homestay theo địa điểm / từ khóa")
    @GetMapping
    public ResponseEntity<ApiResponse<PagedResult<HomestaySummaryResponse>>> search(
            @RequestParam(required = false) String province,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        PagedResult<HomestaySummaryResponse> result = publicHomestayService.searchHomestays(province, keyword, page, size);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /**
     * Mã API: API-PUB-02
     * Tên API: Chi tiết homestay
     * Phương thức: GET
     * Đường dẫn: /api/v1/public/homestays/{homestayId}
     * Quyền truy cập: PUBLIC
     * Ngày thực hiện: 17/10/2026
     * Mục đích: Trả thông tin giới thiệu, tiện ích/media và loại phòng công khai.
     */
    @Operation(summary = "API-PUB-02: Xem chi tiết thông tin và hình ảnh của một homestay")
    @GetMapping("/{homestayId}")
    public ResponseEntity<ApiResponse<HomestayDetailResponse>> getDetail(
            @PathVariable Long homestayId
    ) {
        HomestayDetailResponse response = publicHomestayService.getHomestayDetail(homestayId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * Mã API: API-PUB-ROOM-TYPE-01 (GET /public/homestays/{homestayId}/room-types)
     * Tên API: Danh sách loại phòng công khai của homestay
     * Phương thức: GET
     * Đường dẫn: /api/v1/public/homestays/{homestayId}/room-types
     * Quyền truy cập: PUBLIC
     * Ngày thực hiện: 17/10/2026
     * Mục đích: Xem danh mục loại phòng thuộc một homestay đang hoạt động.
     */
    @Operation(summary = "Xem danh mục các loại phòng thuộc homestay")
    @GetMapping("/{homestayId}/room-types")
    public ResponseEntity<ApiResponse<List<RoomTypePublicResponse>>> getRoomTypes(
            @PathVariable Long homestayId
    ) {
        List<RoomTypePublicResponse> roomTypes = publicHomestayService.getHomestayRoomTypes(homestayId);
        return ResponseEntity.ok(ApiResponse.ok(roomTypes));
    }

    /** API-PUB-07: Danh sách phòng ACTIVE để khách duyệt tại homestay. */
    @Operation(summary = "API-PUB-07: Danh sách phòng công khai của homestay")
    @GetMapping("/{homestayId}/rooms")
    public ResponseEntity<ApiResponse<PagedResult<PublicRoomSummaryResponse>>> getRooms(
            @PathVariable Long homestayId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PagedResult<PublicRoomSummaryResponse> rooms = publicRoomService.getHomestayRooms(homestayId, page, size);
        return ResponseEntity.ok(ApiResponse.ok(rooms));
    }

    /**
     * Mã API: API-PUB-POLICY-01
     * Tên API: Chính sách và quy định lưu trú của homestay
     * Phương thức: GET
     * Đường dẫn: /api/v1/public/homestays/{homestayId}/policies
     * Quyền truy cập: PUBLIC
     * Mục đích: Khách hàng và người dùng xem chi tiết các quy định về đặt phòng, thanh toán, cọc, hủy và nội quy.
     */
    @Operation(summary = "API-PUB-POLICY-01: Xem chính sách và quy định lưu trú của homestay")
    @GetMapping("/{homestayId}/policies")
    public ResponseEntity<ApiResponse<HomestayPolicyResponse>> getHomestayPolicies(
            @PathVariable Long homestayId
    ) {
        HomestayPolicyResponse response = homestayPolicyService.getHomestayPolicies(homestayId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
