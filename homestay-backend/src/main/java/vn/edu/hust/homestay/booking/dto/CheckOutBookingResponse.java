package vn.edu.hust.homestay.booking.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;

@Schema(description = "Kết quả check-out trả phòng và quyết toán")
public record CheckOutBookingResponse(
        @Schema(description = "Mã định danh đơn đặt phòng", example = "501")
        Long bookingId,

        @Schema(description = "Trạng thái mới của đơn", example = "CHECKED_OUT")
        BookingStatus status,

        @Schema(description = "Tổng tiền phòng", example = "1800000")
        Long roomTotalPrice,

        @Schema(description = "Tổng tiền các dịch vụ thực tế đã sử dụng", example = "200000")
        Long serviceTotalPrice,

        @Schema(description = "Tổng tiền toàn bộ đơn (phòng + dịch vụ USED)", example = "2000000")
        Long grandTotalPrice,

        @Schema(description = "Tổng tiền đã thu trước thời điểm checkout (DEPOSIT và PAYMENT đã CONFIRMED)", example = "540000")
        Long paidBeforeCheckout,

        @Schema(description = "Khoản tiền thực thu tại thời điểm checkout", example = "1460000")
        Long collectedAtCheckout,

        @Schema(description = "Tổng số tiền đã thu (paidBeforeCheckout + collectedAtCheckout)", example = "2000000")
        Long totalCollected,

        @Schema(description = "Số tiền còn nợ (sau checkout thành công là 0)", example = "0")
        Long outstandingAmount
) {}
