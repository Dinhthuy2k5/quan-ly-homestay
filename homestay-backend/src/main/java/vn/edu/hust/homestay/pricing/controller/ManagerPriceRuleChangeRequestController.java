package vn.edu.hust.homestay.pricing.controller;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.response.ApiResponse;
import vn.edu.hust.homestay.common.response.PageMeta;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.pricing.dto.CreatePriceRuleChangeRequest;
import vn.edu.hust.homestay.pricing.dto.PriceRuleChangeRequestResponse;
import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest.Status;
import vn.edu.hust.homestay.pricing.service.ManagerPriceRuleChangeRequestService;

import java.util.List;
import java.util.Set;

/**
 * Controller xử lý các yêu cầu thay đổi giá từ Manager:
 * - API-PRICE-03: POST /api/v1/manager/price-rule-change-requests
 * - API-PRICE-04: GET /api/v1/manager/price-rule-change-requests
 * Ngày thực hiện: 25/10/2026
 */
@RestController
@RequestMapping("/api/v1/manager/price-rule-change-requests")
@PreAuthorize("hasRole('MANAGER')")
public class ManagerPriceRuleChangeRequestController {

    private final ManagerPriceRuleChangeRequestService changeRequestService;

    public ManagerPriceRuleChangeRequestController(ManagerPriceRuleChangeRequestService changeRequestService) {
        this.changeRequestService = changeRequestService;
    }

    /**
     * API-PRICE-03 — Gửi yêu cầu thay đổi quy tắc giá (CREATE, UPDATE, DEACTIVATE).
     * Chưa thay đổi giá đang áp dụng cho tới khi Director phê duyệt.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<PriceRuleChangeRequestResponse>> createChangeRequest(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreatePriceRuleChangeRequest request
    ) {
        PriceRuleChangeRequestResponse response = changeRequestService.createChangeRequest(principal, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    /** API-PRICE-04 — Danh sách yêu cầu thay đổi giá do Manager của homestay gửi. */
    @GetMapping
    public ResponseEntity<ApiResponse<List<PriceRuleChangeRequestResponse>>> getChangeRequests(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Status status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "requestedAt,desc") String sort
    ) {
        int validPage = Math.max(0, page);
        int boundedSize = Math.min(Math.max(1, size), 100);
        Page<PriceRuleChangeRequestResponse> result = changeRequestService.getChangeRequests(
                principal,
                status,
                PageRequest.of(validPage, boundedSize, parseSort(sort))
        );
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

    private Sort parseSort(String sort) {
        String[] parts = sort == null ? new String[0] : sort.trim().split(",", 2);
        String property = parts.length > 0 ? parts[0].trim() : "";
        if (!Set.of("requestedAt", "id", "status", "requestType").contains(property)) {
            throw BusinessException.badRequest("INVALID_SORT", "Trường sort không được hỗ trợ");
        }

        Sort.Direction direction;
        try {
            direction = parts.length > 1 ? Sort.Direction.fromString(parts[1].trim()) : Sort.Direction.ASC;
        } catch (IllegalArgumentException e) {
            throw BusinessException.badRequest("INVALID_SORT", "Chiều sort chỉ nhận asc hoặc desc");
        }
        return Sort.by(direction, property);
    }
}
