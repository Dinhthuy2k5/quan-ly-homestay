package vn.edu.hust.homestay.homestay.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.hust.homestay.common.response.ApiResponse;
import vn.edu.hust.homestay.common.response.PageMeta;
import vn.edu.hust.homestay.homestay.dto.HomestayPublicResponse;
import vn.edu.hust.homestay.homestay.service.PublicHomestayService;

/**
 * API công khai — không cần đăng nhập.
 * Prefix: /api/v1/public/homestays
 *
 * CUS-01.1 Xem danh sách homestay
 * CUS-01.2 Xem thông tin chi tiết homestay
 */
@Tag(name = "Public — Homestays", description = "Xem thông tin homestay công khai")
@RestController
@RequestMapping("/api/v1/public/homestays")
public class PublicHomestayController {

    private final PublicHomestayService publicHomestayService;

    public PublicHomestayController(PublicHomestayService publicHomestayService) {
        this.publicHomestayService = publicHomestayService;
    }

    /**
     * GET /api/v1/public/homestays?page=0&size=20
     * CUS-01.1 — Danh sách homestay ACTIVE
     */
    @Operation(summary = "Danh sách homestay đang hoạt động")
    @GetMapping
    public ResponseEntity<ApiResponse<java.util.List<HomestayPublicResponse>>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<HomestayPublicResponse> result = publicHomestayService.listActiveHomestays(page, size);

        PageMeta meta = PageMeta.builder()
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .first(result.isFirst())
                .last(result.isLast())
                .build();

        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), meta));
    }

    /**
     * GET /api/v1/public/homestays/{id}
     * CUS-01.2 — Chi tiết homestay
     */
    @Operation(summary = "Chi tiết một homestay")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<HomestayPublicResponse>> getOne(@PathVariable Long id) {
        HomestayPublicResponse dto = publicHomestayService.getActiveHomestay(id);
        return ResponseEntity.ok(ApiResponse.ok(dto));
    }
}
