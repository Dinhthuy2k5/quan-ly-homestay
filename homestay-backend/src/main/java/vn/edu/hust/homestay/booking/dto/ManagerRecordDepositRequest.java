package vn.edu.hust.homestay.booking.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import vn.edu.hust.homestay.payment.entity.Payment.PaymentMethod;
import vn.edu.hust.homestay.payment.entity.Payment.PaymentType;

/** Request cho API-PAY-02: Ghi nhận đặt cọc cho đơn do quản lý đặt hộ. */
public record ManagerRecordDepositRequest(
        @NotNull PaymentType type,
        @Positive Long amount,
        @NotNull PaymentMethod method,
        @Size(max = 100) String referenceCode,
        @Size(max = 255) String note
) {
    public ManagerRecordDepositRequest(PaymentType type, Long amount, PaymentMethod method, String note) {
        this(type, amount, method, null, note);
    }
}
