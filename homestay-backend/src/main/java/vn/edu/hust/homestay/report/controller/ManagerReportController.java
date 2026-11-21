package vn.edu.hust.homestay.report.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.common.response.ApiResponse;
import vn.edu.hust.homestay.report.dto.ManagerReportOverviewResponse;
import vn.edu.hust.homestay.report.service.ManagerReportService;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

@RestController
@RequestMapping("/api/v1/manager/reports")
@PreAuthorize("hasRole('MANAGER')")
@Tag(name = "Manager Reports")
public class ManagerReportController {

    private final ManagerReportService reportService;

    public ManagerReportController(ManagerReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/overview")
    @Operation(summary = "API-REPORT-MGR-01: Báo cáo tổng quan cơ sở homestay")
    public ResponseEntity<ApiResponse<ManagerReportOverviewResponse>> getOverview(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate
    ) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getOverviewReport(
                principal, parseDate(fromDate), parseDate(toDate))));
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException exception) {
            throw BusinessException.badRequest("INVALID_DATE_RANGE", "Ngày phải theo định dạng YYYY-MM-DD");
        }
    }
}
