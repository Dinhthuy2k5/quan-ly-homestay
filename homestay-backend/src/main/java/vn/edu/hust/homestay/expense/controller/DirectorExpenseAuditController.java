package vn.edu.hust.homestay.expense.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.common.response.ApiResponse;
import vn.edu.hust.homestay.expense.dto.ExpenseAuditLogResponse;
import vn.edu.hust.homestay.expense.repository.ExpenseAuditLogRepository;
import vn.edu.hust.homestay.expense.repository.ExpenseRepository;

import java.util.List;

/** Company-wide, read-only access to an expense audit history. */
@RestController
@RequestMapping("/api/v1/director/expenses")
@PreAuthorize("hasRole('DIRECTOR')")
@Tag(name = "Director Expense Audit")
public class DirectorExpenseAuditController {
    private final ExpenseRepository expenseRepository;
    private final ExpenseAuditLogRepository auditLogRepository;

    public DirectorExpenseAuditController(
            ExpenseRepository expenseRepository,
            ExpenseAuditLogRepository auditLogRepository
    ) {
        this.expenseRepository = expenseRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping("/{expenseId}/history")
    @Operation(summary = "API-DIR-EXP-AUDIT-01: Xem lịch sử khoản chi (chỉ đọc)")
    public ResponseEntity<ApiResponse<List<ExpenseAuditLogResponse>>> getExpenseHistory(
            @PathVariable Long expenseId
    ) {
        if (expenseId == null || expenseId <= 0) {
            throw BusinessException.badRequest("VALIDATION_ERROR", "expenseId không hợp lệ");
        }
        if (!expenseRepository.existsById(expenseId)) {
            throw BusinessException.notFound("EXPENSE_NOT_FOUND", "Không tìm thấy khoản chi");
        }
        List<ExpenseAuditLogResponse> history = auditLogRepository.findByExpenseIdOrderByCreatedAtAsc(expenseId)
                .stream().map(ExpenseAuditLogResponse::from).toList();
        return ResponseEntity.ok(ApiResponse.ok(history));
    }
}
