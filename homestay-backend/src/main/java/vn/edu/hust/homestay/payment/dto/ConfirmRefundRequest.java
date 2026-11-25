package vn.edu.hust.homestay.payment.dto;

import jakarta.validation.constraints.Size;
import vn.edu.hust.homestay.payment.entity.Payment;

import static vn.edu.hust.homestay.common.constant.ValidationConstants.PAYMENT_NOTE_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.PAYMENT_REFERENCE_CODE_MAX_LENGTH;

/**
 * Request xác nhận hoàn tiền cho API-PAY-04.
 * - manualFallback = true: dùng khi đơn cọc gốc qua VNPay nhưng cổng VNPay đang gặp sự cố,
 *   cho phép Manager xác nhận hoàn tiền thủ công ngoài hệ thống (BANK_TRANSFER hoặc CASH).
 */
public record ConfirmRefundRequest(
        @Size(max = PAYMENT_REFERENCE_CODE_MAX_LENGTH) String referenceCode,
        @Size(max = PAYMENT_NOTE_MAX_LENGTH) String note,
        Boolean manualFallback,
        Payment.PaymentMethod fallbackMethod
) {
    public ConfirmRefundRequest(String referenceCode, String note) {
        this(referenceCode, note, false, null);
    }
}
