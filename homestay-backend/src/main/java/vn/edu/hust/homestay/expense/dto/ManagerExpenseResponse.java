package vn.edu.hust.homestay.expense.dto;

import vn.edu.hust.homestay.expense.entity.Expense;

import java.time.LocalDate;

public record ManagerExpenseResponse(
        Long id,
        Long categoryId,
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
    public static ManagerExpenseResponse from(Expense expense) {
        return new ManagerExpenseResponse(
                expense.getId(), expense.getCategoryId(), expense.getAmount(), expense.getExpenseDate(),
                expense.getDescription(), expense.getSupplierName(), expense.getDocumentType(),
                expense.getDocumentNumber(), expense.getDocumentDate(), expense.getTransactionReference(),
                expense.getPaymentMethod(), expense.getProofUrl()
        );
    }
}
