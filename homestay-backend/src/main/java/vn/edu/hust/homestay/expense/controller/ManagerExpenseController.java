package vn.edu.hust.homestay.expense.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.response.ApiResponse;
import vn.edu.hust.homestay.common.response.PageMeta;
import vn.edu.hust.homestay.expense.dto.CreateExpenseRequest;
import vn.edu.hust.homestay.expense.dto.CancelExpenseRequest;
import vn.edu.hust.homestay.expense.dto.CancelExpenseResponse;
import vn.edu.hust.homestay.expense.dto.ExpenseCategoryResponse;
import vn.edu.hust.homestay.expense.dto.ManagerExpenseListResponse;
import vn.edu.hust.homestay.expense.dto.ManagerExpenseResponse;
import vn.edu.hust.homestay.expense.dto.UpdateExpenseRequest;
import vn.edu.hust.homestay.expense.dto.SaveExpenseCategoryRequest;
import vn.edu.hust.homestay.expense.entity.Expense;
import vn.edu.hust.homestay.expense.service.ManagerExpenseService;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/manager")
@PreAuthorize("hasRole('MANAGER')")
@Tag(name = "Manager Expenses")
public class ManagerExpenseController {

    private final ManagerExpenseService expenseService;

    public ManagerExpenseController(ManagerExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    /** Supporting read endpoint from API-EXP-05 so the API-EXP-02 form can select a scoped category. */
    @GetMapping("/expense-categories")
    @Operation(summary = "API-EXP-05: Danh sách danh mục chi phí thuộc homestay quản lý")
    public ResponseEntity<ApiResponse<List<ExpenseCategoryResponse>>> getExpenseCategories(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(expenseService.getCategories(principal)));
    }

    @PostMapping("/expense-categories")
    @Operation(summary = "API-EXP-05: Tạo danh mục chi phí")
    public ResponseEntity<ApiResponse<ExpenseCategoryResponse>> createExpenseCategory(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody SaveExpenseCategoryRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(expenseService.createCategory(principal, request)));
    }

    @PatchMapping("/expense-categories/{categoryId}")
    @Operation(summary = "API-EXP-05: Đổi tên danh mục chi phí")
    public ResponseEntity<ApiResponse<ExpenseCategoryResponse>> updateExpenseCategory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long categoryId,
            @Valid @RequestBody SaveExpenseCategoryRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(expenseService.updateCategory(principal, categoryId, request)));
    }

    @DeleteMapping("/expense-categories/{categoryId}")
    @Operation(summary = "API-EXP-05: Xóa danh mục chưa được khoản chi sử dụng")
    public ResponseEntity<Void> deleteExpenseCategory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long categoryId
    ) {
        expenseService.deleteCategory(principal, categoryId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/expenses")
    @Operation(summary = "API-EXP-01: Danh sách chi phí của homestay đang quản lý")
    public ResponseEntity<ApiResponse<List<ManagerExpenseListResponse>>> getExpenses(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Expense.PaymentMethod paymentMethod,
            @RequestParam(required = false) String supplierName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        int validPage = Math.max(0, page);
        int boundedSize = Math.min(Math.max(1, size), 100);
        Page<ManagerExpenseListResponse> result = expenseService.listExpenses(
                principal, fromDate, toDate, categoryId, paymentMethod, supplierName,
                PageRequest.of(validPage, boundedSize, Sort.by(
                        Sort.Order.desc("expenseDate"), Sort.Order.desc("id")))
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

    @PostMapping(value = "/expenses", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "API-EXP-02: Ghi nhận khoản chi vận hành")
    public ResponseEntity<ApiResponse<ManagerExpenseResponse>> createExpense(
            @AuthenticationPrincipal UserPrincipal principal,
            @ModelAttribute CreateExpenseRequest request
    ) {
        ManagerExpenseResponse response = expenseService.createExpense(principal, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @PatchMapping(value = "/expenses/{expenseId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "API-EXP-03: Sửa khoản chi vận hành")
    public ResponseEntity<ApiResponse<ManagerExpenseResponse>> updateExpense(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long expenseId,
            @ModelAttribute UpdateExpenseRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(expenseService.updateExpense(principal, expenseId, request)));
    }

    @PostMapping("/expenses/{expenseId}/cancel")
    @Operation(summary = "API-EXP-04: Hủy khoản chi có lưu lý do và lịch sử")
    public ResponseEntity<ApiResponse<CancelExpenseResponse>> cancelExpense(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long expenseId,
            @Valid @RequestBody CancelExpenseRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(expenseService.cancelExpense(principal, expenseId, request)));
    }
}
