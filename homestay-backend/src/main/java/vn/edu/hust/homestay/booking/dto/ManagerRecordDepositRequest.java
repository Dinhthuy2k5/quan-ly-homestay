package vn.edu.hust.homestay.booking.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import vn.edu.hust.homestay.payment.entity.Payment.PaymentMethod;
import vn.edu.hust.homestay.payment.entity.Payment.PaymentType;

/** Request for API-PAY-02. Confirmation metadata is always assigned by the server. */
public record ManagerRecordDepositRequest(
        @NotNull PaymentType type,
        @Positive Long amount,
        @NotNull PaymentMethod method,
        @Size(max = 255) String note
) {}
