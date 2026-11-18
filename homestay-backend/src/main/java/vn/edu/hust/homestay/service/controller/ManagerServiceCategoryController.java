package vn.edu.hust.homestay.service.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.response.ApiResponse;
import vn.edu.hust.homestay.service.dto.SaveServiceCategoryRequest;
import vn.edu.hust.homestay.service.dto.ServiceCategoryResponse;
import vn.edu.hust.homestay.service.service.ManagerServiceService;

import java.util.List;

@Tag(name = "Manager – Service Categories", description = "CRUD danh mục dịch vụ tại homestay")
@RestController
@RequestMapping("/api/v1/manager/service-categories")
@PreAuthorize("hasRole('MANAGER')")
public class ManagerServiceCategoryController {

    private final ManagerServiceService managerServiceService;

    public ManagerServiceCategoryController(ManagerServiceService managerServiceService) {
        this.managerServiceService = managerServiceService;
    }

    /**
     * API-MGR-CAT-01: Danh sách danh mục dịch vụ
     */
    @Operation(summary = "API-MGR-CAT-01: Danh sách danh mục dịch vụ của homestay")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ServiceCategoryResponse>>> getServiceCategories(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(managerServiceService.getServiceCategories(principal)));
    }

    /**
     * API-MGR-CAT-02: Tạo danh mục dịch vụ mới
     */
    @Operation(summary = "API-MGR-CAT-02: Tạo danh mục dịch vụ mới")
    @PostMapping
    public ResponseEntity<ApiResponse<ServiceCategoryResponse>> createCategory(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody SaveServiceCategoryRequest request
    ) {
        ServiceCategoryResponse response = managerServiceService.createCategory(principal, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    /**
     * API-MGR-CAT-03: Đổi tên danh mục dịch vụ
     */
    @Operation(summary = "API-MGR-CAT-03: Đổi tên danh mục dịch vụ")
    @PatchMapping("/{categoryId}")
    public ResponseEntity<ApiResponse<ServiceCategoryResponse>> updateCategory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long categoryId,
            @RequestBody SaveServiceCategoryRequest request
    ) {
        ServiceCategoryResponse response = managerServiceService.updateCategory(principal, categoryId, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * API-MGR-CAT-04: Xóa danh mục dịch vụ (chỉ được xóa nếu chưa có dịch vụ nào dùng)
     */
    @Operation(summary = "API-MGR-CAT-04: Xóa danh mục dịch vụ")
    @DeleteMapping("/{categoryId}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long categoryId
    ) {
        managerServiceService.deleteCategory(principal, categoryId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
