package vn.edu.hust.homestay.homestay.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hust.homestay.common.response.ApiResponse;
import vn.edu.hust.homestay.homestay.dto.DirectorManagerOptionResponse;
import vn.edu.hust.homestay.homestay.service.DirectorHomestayService;

import java.util.List;

/**
 * Controller phụ trợ chỉ đọc danh sách tài khoản Manager cho Giám đốc phục vụ thao tác gán/đổi Manager (API-DIR-HS-03).
 */
@RestController
@RequestMapping("/api/v1/director/managers")
@PreAuthorize("hasRole('DIRECTOR')")
@Tag(name = "Director — Managers", description = "Tra cứu danh sách tài khoản Quản lý để phân công phụ trách cơ sở")
public class DirectorManagerController {

    private final DirectorHomestayService directorHomestayService;

    public DirectorManagerController(DirectorHomestayService directorHomestayService) {
        this.directorHomestayService = directorHomestayService;
    }

    /** Danh sách tài khoản MANAGER toàn công ty kèm cơ sở đang phụ trách (nếu có). */
    @GetMapping
    @Operation(summary = "Danh sách tài khoản Manager phục vụ phân công cơ sở")
    public ResponseEntity<ApiResponse<List<DirectorManagerOptionResponse>>> listManagers(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Boolean unassignedOnly,
            @RequestParam(required = false) String keyword
    ) {
        List<DirectorManagerOptionResponse> managers = directorHomestayService.listManagers(
                status, unassignedOnly, keyword);
        return ResponseEntity.ok(ApiResponse.ok(managers));
    }
}
