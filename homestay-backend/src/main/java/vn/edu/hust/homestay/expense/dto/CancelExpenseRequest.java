package vn.edu.hust.homestay.expense.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CancelExpenseRequest(
        @NotBlank(message = "Cần nêu lý do hủy khoản chi")
        @Size(max = 500, message = "Lý do hủy không được vượt quá 500 ký tự")
        String reason
) {}
