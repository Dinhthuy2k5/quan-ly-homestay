package vn.edu.hust.homestay.expense.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import static vn.edu.hust.homestay.common.constant.ValidationConstants.EXPENSE_CATEGORY_NAME_MAX_LENGTH;

public record SaveExpenseCategoryRequest(
        @NotBlank(message = "Tên danh mục không được để trống")
        @Size(max = EXPENSE_CATEGORY_NAME_MAX_LENGTH, message = "Tên danh mục tối đa " + EXPENSE_CATEGORY_NAME_MAX_LENGTH + " ký tự")
        String name
) {}
