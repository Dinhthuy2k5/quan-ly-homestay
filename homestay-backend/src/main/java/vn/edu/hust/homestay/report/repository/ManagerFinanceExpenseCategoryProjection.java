package vn.edu.hust.homestay.report.repository;

public interface ManagerFinanceExpenseCategoryProjection {
    Long getCategoryId();
    String getCategoryName();
    Long getTotalAmount();
    Long getExpenseCount();
}
