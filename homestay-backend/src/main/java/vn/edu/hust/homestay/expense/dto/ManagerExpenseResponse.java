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
        String proofUrl,
        java.time.LocalDateTime cancelledAt,
        Long cancelledBy,
        String cancelledByName,
        String cancellationReason
) {
    public static ManagerExpenseResponse from(Expense expense, String categoryName, String cancelledByName) {
        return new ManagerExpenseResponse(
                expense.getId(), expense.getCategoryId(), categoryName, expense.getAmount(), expense.getExpenseDate(),
                expense.getDescription(), expense.getSupplierName(), expense.getDocumentType(),
                expense.getDocumentNumber(), expense.getDocumentDate(), expense.getTransactionReference(),
                expense.getPaymentMethod(), expense.getProofUrl(), expense.getCancelledAt(),
                expense.getCancelledBy(), cancelledByName, expense.getCancellationReason()
        );
    }

    public static ManagerExpenseResponse from(Expense expense) {
        return from(expense, null, null);
    }
}
