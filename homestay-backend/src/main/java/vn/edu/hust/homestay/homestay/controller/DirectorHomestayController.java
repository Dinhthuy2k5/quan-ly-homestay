package vn.edu.hust.homestay.homestay.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hust.homestay.common.response.ApiResponse;
import vn.edu.hust.homestay.common.response.PageMeta;
import vn.edu.hust.homestay.common.response.PagedResult;
import vn.edu.hust.homestay.homestay.dto.AssignHomestayManagerRequest;
import vn.edu.hust.homestay.homestay.dto.AssignHomestayManagerResponse;
import vn.edu.hust.homestay.homestay.dto.CreateDirectorHomestayRequest;
import vn.edu.hust.homestay.homestay.dto.DirectorHomestayResponse;
import vn.edu.hust.homestay.homestay.dto.UpdateDirectorHomestayRequest;
import vn.edu.hust.homestay.homestay.service.DirectorHomestayService;

import java.util.List;

/**
 * Controller cung cấp các API quản lý cơ sở homestay dành riêng cho Giám đốc (DIRECTOR):
 * - API-DIR-HS-01: GET/POST /api/v1/director/homestays
 * - API-DIR-HS-02: PATCH /api/v1/director/homestays/{homestayId}
 * - API-DIR-HS-03: PUT /api/v1/director/homestays/{homestayId}/manager
 */
@RestController
@RequestMapping("/api/v1/director/homestays")
@PreAuthorize("hasRole('DIRECTOR')")
@Tag(name = "Director — Homestays", description = "Các API quản lý danh sách cơ sở homestay toàn công ty")
public class DirectorHomestayController {

    private final DirectorHomestayService directorHomestayService;

    public DirectorHomestayController(DirectorHomestayService directorHomestayService) {
        this.directorHomestayService = directorHomestayService;
    }

    /** API-DIR-HS-01: Danh sách cơ sở homestay toàn công ty (hỗ trợ lọc và phân trang). */
    @GetMapping
    @Operation(summary = "API-DIR-HS-01: Danh sách homestay toàn công ty")
    public ResponseEntity<ApiResponse<List<DirectorHomestayResponse>>> listHomestays(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String province,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PagedResult<DirectorHomestayResponse> result = directorHomestayService.listHomestays(
                status, province, keyword, page, size);

        PageMeta meta = PageMeta.builder()
                .page(result.getPage())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .first(result.getPage() == 0)
                .last(result.getTotalPages() == 0 || result.getPage() >= result.getTotalPages() - 1)
                .build();

        return ResponseEntity.ok(ApiResponse.ok(result.getItems(), meta));
    }

    /** API-DIR-HS-01: Tạo mới cơ sở homestay (bắt buộc hotlinePhone, mặc định ACTIVE). */
    @PostMapping
    @Operation(summary = "API-DIR-HS-01: Tạo mới cơ sở homestay")
    public ResponseEntity<ApiResponse<DirectorHomestayResponse>> createHomestay(
            @Valid @RequestBody CreateDirectorHomestayRequest request
    ) {
        DirectorHomestayResponse created = directorHomestayService.createHomestay(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    /** API-DIR-HS-02: Cập nhật thông tin, hotlinePhone hoặc trạng thái ACTIVE/INACTIVE của homestay. */
    @PatchMapping("/{homestayId}")
    @Operation(summary = "API-DIR-HS-02: Cập nhật hoặc kích hoạt/tạm ngừng homestay")
    public ResponseEntity<ApiResponse<DirectorHomestayResponse>> updateHomestay(
            @PathVariable Long homestayId,
            @Valid @RequestBody UpdateDirectorHomestayRequest request
    ) {
        DirectorHomestayResponse updated = directorHomestayService.updateHomestay(homestayId, request);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    /** API-DIR-HS-03: Gán, thay thế hoặc gỡ Manager phụ trách homestay (managerId = null để gỡ). */
    @PutMapping("/{homestayId}/manager")
    @Operation(summary = "API-DIR-HS-03: Gán, thay thế hoặc gỡ Manager phụ trách homestay")
    public ResponseEntity<ApiResponse<AssignHomestayManagerResponse>> assignManager(
            @PathVariable Long homestayId,
            @RequestBody AssignHomestayManagerRequest request
    ) {
        AssignHomestayManagerResponse response = directorHomestayService.assignManager(homestayId, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
