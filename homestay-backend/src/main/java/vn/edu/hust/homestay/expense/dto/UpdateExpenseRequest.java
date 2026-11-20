package vn.edu.hust.homestay.expense.dto;

import org.springframework.web.multipart.MultipartFile;

/** Multipart fields for API-EXP-03. Null means unchanged; blank optional fields clear their values. */
public record UpdateExpenseRequest(
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
) {}
