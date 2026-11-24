package vn.edu.hust.homestay.booking.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import vn.edu.hust.homestay.payment.entity.Payment.PaymentMethod;

import java.util.List;

import static vn.edu.hust.homestay.common.constant.ValidationConstants.CHECK_OUT_NOTE_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.PAYMENT_AMOUNT_MIN;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.PAYMENT_NOTE_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.PAYMENT_REFERENCE_CODE_MAX_LENGTH;

@Schema(description = "Yêu cầu check-out trả phòng và quyết toán công nợ")
public record CheckOutBookingRequest(
        @Schema(description = "Danh sách ID các dòng dịch vụ thực tế đã sử dụng trong booking_services")
        List<Long> usedBookingServiceIds,

        @Schema(description = "Danh sách ID các dòng dịch vụ đã đăng ký nhưng không sử dụng trong booking_services (sẽ chuyển sang CANCELLED)")
        List<Long> unusedBookingServiceIds,

        @Valid
        @Schema(description = "Thông tin thanh toán khoản tiền còn thiếu lúc check-out (nếu có)")
        PaymentRequest payment,

        @Size(max = CHECK_OUT_NOTE_MAX_LENGTH, message = "Ghi chú check-out tối đa " + CHECK_OUT_NOTE_MAX_LENGTH + " ký tự")
        @Schema(description = "Ghi chú khi trả phòng", example = "Khách đã bàn giao phòng đầy đủ")
        String note
) {
    public record PaymentRequest(
            @Min(value = PAYMENT_AMOUNT_MIN, message = "Số tiền thanh toán phải lớn hơn 0")
            @Schema(description = "Số tiền thanh toán cuối cùng", example = "1460000")
            Long amount,

            @Schema(description = "Phương thức thanh toán", example = "CASH")
            PaymentMethod method,

            @Size(max = PAYMENT_REFERENCE_CODE_MAX_LENGTH, message = "Mã tham chiếu tối đa " + PAYMENT_REFERENCE_CODE_MAX_LENGTH + " ký tự")
            @Schema(description = "Mã tham chiếu/giao dịch", example = "CK-123456")
            String referenceCode,

            @Size(max = PAYMENT_NOTE_MAX_LENGTH, message = "Ghi chú thanh toán tối đa " + PAYMENT_NOTE_MAX_LENGTH + " ký tự")
            @Schema(description = "Ghi chú thanh toán", example = "Thu phần còn lại khi checkout")
            String note
    ) {}
}
