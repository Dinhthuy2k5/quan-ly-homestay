package vn.edu.hust.homestay.service.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.response.ApiResponse;
import vn.edu.hust.homestay.service.dto.ServiceCategoryResponse;
import vn.edu.hust.homestay.service.service.ManagerServiceService;

import java.util.List;

@Tag(name = "Manager — Service Categories", description = "Xem và quản lý danh mục dịch vụ tại homestay")
@RestController
@RequestMapping("/api/v1/manager/service-categories")
@PreAuthorize("hasRole('MANAGER')")
public class ManagerServiceCategoryController {

    private final ManagerServiceService managerServiceService;

    public ManagerServiceCategoryController(ManagerServiceService managerServiceService) {
        this.managerServiceService = managerServiceService;
    }

    @Operation(summary = "Xem danh mục dịch vụ của homestay")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ServiceCategoryResponse>>> getServiceCategories(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(managerServiceService.getServiceCategories(principal)));
    }
}
