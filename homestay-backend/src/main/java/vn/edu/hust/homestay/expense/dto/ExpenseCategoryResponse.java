package vn.edu.hust.homestay.expense.dto;

import vn.edu.hust.homestay.expense.entity.ExpenseCategory;

public record ExpenseCategoryResponse(Long id, String name) {
    public static ExpenseCategoryResponse from(ExpenseCategory category) {
        return new ExpenseCategoryResponse(category.getId(), category.getName());
    }
}
