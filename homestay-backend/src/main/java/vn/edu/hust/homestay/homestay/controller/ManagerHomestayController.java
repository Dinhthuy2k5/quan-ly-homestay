package vn.edu.hust.homestay.homestay.controller;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.response.ApiResponse;
import vn.edu.hust.homestay.homestay.dto.ManagerHomestayResponse;
import vn.edu.hust.homestay.homestay.dto.UpdateManagerHomestayRequest;
import vn.edu.hust.homestay.homestay.service.ManagerHomestayService;
import vn.edu.hust.homestay.policy.dto.HomestayPolicyResponse;
import vn.edu.hust.homestay.policy.service.HomestayPolicyService;

/**
 * Controller xử lý các API quản lý thông tin homestay của Manager:
 * - API-MGR-01: GET /api/v1/manager/homestay
 * - API-MGR-02: PATCH /api/v1/manager/homestay
 * - API-MGR-POLICY-01: GET /api/v1/manager/homestay/policies
 * Ngày thực hiện: 19/10/2026
 */
@RestController
@RequestMapping("/api/v1/manager/homestay")
@PreAuthorize("hasRole('MANAGER')")
public class ManagerHomestayController {

    private final ManagerHomestayService managerHomestayService;
    private final HomestayPolicyService homestayPolicyService;

    public ManagerHomestayController(
            ManagerHomestayService managerHomestayService,
            HomestayPolicyService homestayPolicyService
    ) {
        this.managerHomestayService = managerHomestayService;
        this.homestayPolicyService = homestayPolicyService;
    }

    /**
     * API-MGR-01 — Xem homestay được giao
     */
    @GetMapping
    public ResponseEntity<ApiResponse<ManagerHomestayResponse>> getAssignedHomestay(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        ManagerHomestayResponse response = managerHomestayService.getAssignedHomestay(principal);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * API-MGR-02 — Cập nhật thông tin homestay
     */
    @PatchMapping
    public ResponseEntity<ApiResponse<ManagerHomestayResponse>> updateHomestay(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateManagerHomestayRequest request
    ) {
        ManagerHomestayResponse response = managerHomestayService.updateHomestay(principal, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * API-MGR-POLICY-01 — Xem chính sách & quy định áp dụng cho cơ sở được giao
     */
    @Operation(summary = "API-MGR-POLICY-01: Xem chính sách và quy định áp dụng cho cơ sở quản lý")
    @GetMapping("/policies")
    public ResponseEntity<ApiResponse<HomestayPolicyResponse>> getAssignedHomestayPolicies(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        HomestayPolicyResponse response = homestayPolicyService.getAssignedHomestayPolicies(principal);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
