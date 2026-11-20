package vn.edu.hust.homestay.expense.dto;

public record CancelExpenseResponse(boolean cancelled) {
    public static CancelExpenseResponse success() { return new CancelExpenseResponse(true); }
}
