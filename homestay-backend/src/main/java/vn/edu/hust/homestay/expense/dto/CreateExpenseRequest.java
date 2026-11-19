package vn.edu.hust.homestay.expense.dto;

/** Multipart scalar fields are kept as text so malformed values map to stable API validation errors. */
public record CreateExpenseRequest(
        String categoryId,
        String amount,
        String expenseDate,
        String description,
        String supplierName,
        String documentType,
        String documentNumber,
        String documentDate,
        String transactionReference,
        String paymentMethod
) {}
