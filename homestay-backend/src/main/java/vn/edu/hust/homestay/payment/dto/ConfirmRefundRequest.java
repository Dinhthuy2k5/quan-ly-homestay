package vn.edu.hust.homestay.payment.dto;

import jakarta.validation.constraints.Size;

import static vn.edu.hust.homestay.common.constant.ValidationConstants.PAYMENT_NOTE_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.PAYMENT_REFERENCE_CODE_MAX_LENGTH;

public record ConfirmRefundRequest(
        @Size(max = PAYMENT_REFERENCE_CODE_MAX_LENGTH) String referenceCode,
        @Size(max = PAYMENT_NOTE_MAX_LENGTH) String note
) {}
