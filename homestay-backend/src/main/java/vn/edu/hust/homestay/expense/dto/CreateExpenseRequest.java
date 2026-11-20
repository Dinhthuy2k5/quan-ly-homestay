package vn.edu.hust.homestay.expense.dto;

import org.springframework.web.multipart.MultipartFile;

/** Multipart scalar and file fields for API-EXP-02. */
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
        String paymentMethod,
        MultipartFile proofFile
) {
    public CreateExpenseRequest(
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
    ) {
        this(categoryId, amount, expenseDate, description, supplierName,
                documentType, documentNumber, documentDate, transactionReference, paymentMethod, null);
    }
}
