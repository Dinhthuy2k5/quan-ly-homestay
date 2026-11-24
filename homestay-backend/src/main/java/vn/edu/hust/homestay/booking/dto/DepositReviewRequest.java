package vn.edu.hust.homestay.booking.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import static vn.edu.hust.homestay.common.constant.ValidationConstants.DEPOSIT_REVIEW_REASON_MAX_LENGTH;

/**
 * Request DTO cho API-MGR-BOOK-05: Duyệt hoặc từ chối đặt cọc từ khách hàng.
 */
public record DepositReviewRequest(
        @NotNull(message = "Mã thanh toán không được để trống")
        Long paymentId,

        @NotNull(message = "Quyết định phê duyệt không được để trống")
        DepositReviewDecision decision,

        @Size(max = DEPOSIT_REVIEW_REASON_MAX_LENGTH, message = "Lý do không được vượt quá " + DEPOSIT_REVIEW_REASON_MAX_LENGTH + " ký tự")
        String reason
) {
    public enum DepositReviewDecision {
        APPROVE,
        REJECT
    }
}
