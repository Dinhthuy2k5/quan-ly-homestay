package vn.edu.hust.homestay.homestay.controller;

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

/**
 * Controller xử lý các API quản lý thông tin homestay của Manager:
 * - API-MGR-01: GET /api/v1/manager/homestay
 * - API-MGR-02: PATCH /api/v1/manager/homestay
 * Ngày thực hiện: 19/10/2026
 */
@RestController
@RequestMapping("/api/v1/manager/homestay")
@PreAuthorize("hasRole('MANAGER')")
public class ManagerHomestayController {

    private final ManagerHomestayService managerHomestayService;

    public ManagerHomestayController(ManagerHomestayService managerHomestayService) {
        this.managerHomestayService = managerHomestayService;
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
}
