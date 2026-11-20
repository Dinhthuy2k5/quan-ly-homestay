package vn.edu.hust.homestay.expense.dto;

import vn.edu.hust.homestay.expense.entity.Expense;

import java.time.LocalDate;

public record ManagerExpenseResponse(
        Long id,
        Long categoryId,
        String categoryName,
        Long amount,
        LocalDate expenseDate,
        String description,
        String supplierName,
        Expense.DocumentType documentType,
        String documentNumber,
        LocalDate documentDate,
        String transactionReference,
        Expense.PaymentMethod paymentMethod,
        String proofUrl
) {
    public static ManagerExpenseResponse from(Expense expense, String categoryName) {
        return new ManagerExpenseResponse(
                expense.getId(), expense.getCategoryId(), categoryName, expense.getAmount(), expense.getExpenseDate(),
                expense.getDescription(), expense.getSupplierName(), expense.getDocumentType(),
                expense.getDocumentNumber(), expense.getDocumentDate(), expense.getTransactionReference(),
                expense.getPaymentMethod(), expense.getProofUrl()
        );
    }

    public static ManagerExpenseResponse from(Expense expense) {
        return from(expense, null);
    }
}
