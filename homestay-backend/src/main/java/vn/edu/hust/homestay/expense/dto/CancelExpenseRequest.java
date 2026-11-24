package vn.edu.hust.homestay.expense.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import static vn.edu.hust.homestay.common.constant.ValidationConstants.EXPENSE_CANCEL_REASON_MAX_LENGTH;

public record CancelExpenseRequest(
        @NotBlank(message = "Cần nêu lý do hủy khoản chi")
        @Size(max = EXPENSE_CANCEL_REASON_MAX_LENGTH, message = "Lý do hủy không được vượt quá " + EXPENSE_CANCEL_REASON_MAX_LENGTH + " ký tự")
        String reason
) {}
