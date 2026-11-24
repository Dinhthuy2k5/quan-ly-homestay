package vn.edu.hust.homestay.service.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.common.response.ApiResponse;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.MAX_PAGE_SIZE;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.MIN_PAGE_SIZE;
import vn.edu.hust.homestay.common.response.PageMeta;
import vn.edu.hust.homestay.common.response.PagedResult;
import vn.edu.hust.homestay.service.dto.CreateManagerServiceRequest;
import vn.edu.hust.homestay.service.dto.ManagerCreateServiceResponse;
import vn.edu.hust.homestay.service.dto.ManagerServiceSummaryResponse;
import vn.edu.hust.homestay.service.dto.UpdateManagerServiceRequest;
import vn.edu.hust.homestay.service.entity.Service.ServiceStatus;
import vn.edu.hust.homestay.service.service.ManagerServiceService;

import java.util.List;
import java.util.Set;

@Tag(name = "Manager — Services", description = "Các API quản lý dịch vụ tại cơ sở homestay")
@RestController
@RequestMapping("/api/v1/manager/services")
@PreAuthorize("hasRole('MANAGER')")
public class ManagerServiceController {

    private final ManagerServiceService managerServiceService;

    public ManagerServiceController(ManagerServiceService managerServiceService) {
        this.managerServiceService = managerServiceService;
    }

    /**
     * API-MGR-SVC-01: Danh sách dịch vụ cơ sở
     */
    @Operation(summary = "API-MGR-SVC-01: Danh sách dịch vụ cơ sở")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ManagerServiceSummaryResponse>>> getServices(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) ServiceStatus status,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "name,asc") String sort
    ) {
        int validPage = Math.max(0, page);
        int boundedSize = Math.max(MIN_PAGE_SIZE, Math.min(MAX_PAGE_SIZE, size));
        Pageable pageable = PageRequest.of(validPage, boundedSize, parseSort(sort));

        PagedResult<ManagerServiceSummaryResponse> result = managerServiceService.getServices(
                principal,
                status,
                categoryId,
                pageable
        );

        PageMeta meta = PageMeta.builder()
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
     * API-MGR-SVC-02: Khai báo dịch vụ
     */
    @Operation(summary = "API-MGR-SVC-02: Khai báo dịch vụ")
    @PostMapping
    public ResponseEntity<ApiResponse<ManagerCreateServiceResponse>> createService(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateManagerServiceRequest request
    ) {
        ManagerCreateServiceResponse response = managerServiceService.createService(principal, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    /**
     * Xem chi tiết dịch vụ cơ sở
     */
    @Operation(summary = "Xem chi tiết dịch vụ cơ sở")
    @GetMapping("/{serviceId}")
    public ResponseEntity<ApiResponse<ManagerServiceSummaryResponse>> getServiceDetail(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long serviceId
    ) {
        ManagerServiceSummaryResponse response = managerServiceService.getServiceDetail(principal, serviceId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * API-MGR-SVC-03: Cập nhật dịch vụ
     */
    @Operation(summary = "API-MGR-SVC-03: Cập nhật dịch vụ")
    @PatchMapping("/{serviceId}")
    public ResponseEntity<ApiResponse<ManagerServiceSummaryResponse>> updateService(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long serviceId,
            @Valid @RequestBody UpdateManagerServiceRequest request
    ) {
        ManagerServiceSummaryResponse response = managerServiceService.updateService(principal, serviceId, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    private Sort parseSort(String sort) {
        String[] parts = sort == null ? new String[0] : sort.trim().split(",", 2);
        String property = parts.length > 0 ? parts[0].trim() : "name";
        if (property.isEmpty()) {
            property = "name";
        }
        if (!Set.of("name", "unitPrice", "status", "id", "categoryId").contains(property)) {
            throw BusinessException.badRequest("INVALID_SORT", "Trường sort không được hỗ trợ");
        }

        Sort.Direction direction = Sort.Direction.ASC;
        if (parts.length > 1) {
            try {
                direction = Sort.Direction.fromString(parts[1].trim());
            } catch (IllegalArgumentException e) {
                throw BusinessException.badRequest("INVALID_SORT", "Chiều sort chỉ nhận asc hoặc desc");
            }
        }
        return Sort.by(direction, property);
    }
}
