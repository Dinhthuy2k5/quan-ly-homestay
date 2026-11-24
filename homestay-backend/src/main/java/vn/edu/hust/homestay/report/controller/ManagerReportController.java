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
import vn.edu.hust.homestay.report.dto.ManagerReportFinanceResponse;
import vn.edu.hust.homestay.report.dto.ManagerReportOverviewResponse;
import vn.edu.hust.homestay.report.service.ManagerReportService;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

/**
 * Controller cung cấp các API báo cáo dành riêng cho Manager (tự động giới hạn theo homestay được giao).
 */
@RestController
@RequestMapping("/api/v1/manager/reports")
@PreAuthorize("hasRole('MANAGER')")
@Tag(name = "Manager Reports")
public class ManagerReportController {

    private final ManagerReportService reportService;

    public ManagerReportController(ManagerReportService reportService) {
        this.reportService = reportService;
    }

    /** API-REPORT-MGR-01: Tổng quan vận hành cơ sở theo khoảng ngày [fromDate, toDate]. */
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

    /**
     * API-REPORT-MGR-02: Báo cáo tài chính cơ sở theo kỳ.
     * Hỗ trợ lọc tùy chọn theo ngày (fromDate, toDate), danh mục chi phí (categoryId)
     * và phương thức thanh toán (paymentMethod: CASH, BANK_TRANSFER, CARD, OTHER).
     */
    @GetMapping("/finance")
    @Operation(summary = "API-REPORT-MGR-02: Báo cáo tài chính cơ sở homestay")
    public ResponseEntity<ApiResponse<ManagerReportFinanceResponse>> getFinance(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) String paymentMethod
    ) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getFinanceReport(
                principal,
                parseDate(fromDate),
                parseDate(toDate),
                parseOptionalId(categoryId),
                paymentMethod
        )));
    }

    /** Chuyển chuỗi YYYY-MM-DD sang LocalDate; trả mã lỗi chuẩn INVALID_DATE_RANGE nếu sai định dạng. */
    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException exception) {
            throw BusinessException.badRequest("INVALID_DATE_RANGE", "Ngày phải theo định dạng YYYY-MM-DD");
        }
    }

    /** Chuyển chuỗi categoryId sang Long; trả mã lỗi INVALID_CATEGORY_ID nếu không phải số nguyên. */
    private Long parseOptionalId(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException exception) {
            throw BusinessException.badRequest("INVALID_CATEGORY_ID", "categoryId phải là số nguyên hợp lệ");
        }
    }
}
