package vn.edu.hust.homestay.pricing.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hust.homestay.common.response.ApiResponse;
import vn.edu.hust.homestay.common.response.PageMeta;
import vn.edu.hust.homestay.common.response.PagedResult;
import vn.edu.hust.homestay.pricing.dto.DirectorPriceRuleChangeRequestDetailResponse;
import vn.edu.hust.homestay.pricing.dto.DirectorPriceRuleChangeRequestSummaryResponse;
import vn.edu.hust.homestay.pricing.service.DirectorPriceRuleChangeRequestService;

import java.util.List;

/**
 * Controller quản lý yêu cầu phê duyệt thay đổi quy tắc giá dành cho Giám đốc (DIRECTOR):
 * - API-DIR-PRICE-01: GET /api/v1/director/price-rule-change-requests
 * - API-DIR-PRICE-02: GET /api/v1/director/price-rule-change-requests/{requestId}
 */
@RestController
@RequestMapping("/api/v1/director/price-rule-change-requests")
@PreAuthorize("hasRole('DIRECTOR')")
@Tag(name = "Director — Price Approvals", description = "Các API xem và phê duyệt yêu cầu thay đổi quy tắc giá")
public class DirectorPriceRuleChangeRequestController {

    private final DirectorPriceRuleChangeRequestService directorPriceRequestService;

    public DirectorPriceRuleChangeRequestController(
            DirectorPriceRuleChangeRequestService directorPriceRequestService
    ) {
        this.directorPriceRequestService = directorPriceRequestService;
    }

    /** API-DIR-PRICE-01: Danh sách yêu cầu phê duyệt giá toàn công ty, hỗ trợ lọc và phân trang. */
    @GetMapping
    @Operation(summary = "API-DIR-PRICE-01: Danh sách yêu cầu phê duyệt thay đổi giá")
    public ResponseEntity<ApiResponse<List<DirectorPriceRuleChangeRequestSummaryResponse>>> listChangeRequests(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String homestayId,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "requestedAt,desc") String sort
    ) {
        PagedResult<DirectorPriceRuleChangeRequestSummaryResponse> result =
                directorPriceRequestService.listChangeRequests(
                        status, homestayId, fromDate, toDate, page, size, sort
                );

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

    /** API-DIR-PRICE-02: Xem chi tiết yêu cầu phê duyệt giá (quy tắc hiện tại, proposedRule, hồ sơ phòng và các quy tắc đang áp dụng). */
    @GetMapping("/{requestId}")
    @Operation(summary = "API-DIR-PRICE-02: Chi tiết yêu cầu phê duyệt thay đổi giá")
    public ResponseEntity<ApiResponse<DirectorPriceRuleChangeRequestDetailResponse>> getChangeRequestDetail(
            @PathVariable Long requestId
    ) {
        DirectorPriceRuleChangeRequestDetailResponse detail =
                directorPriceRequestService.getChangeRequestDetail(requestId);
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }
}
