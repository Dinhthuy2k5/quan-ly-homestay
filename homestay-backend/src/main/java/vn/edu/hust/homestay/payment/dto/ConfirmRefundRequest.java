package vn.edu.hust.homestay.payment.dto;

import jakarta.validation.constraints.Size;

public record ConfirmRefundRequest(
        @Size(max = 100) String referenceCode,
        @Size(max = 255) String note
) {}
