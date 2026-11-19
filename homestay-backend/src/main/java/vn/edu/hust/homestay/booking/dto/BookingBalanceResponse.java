package vn.edu.hust.homestay.booking.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Bảng cân đối tài chính và công nợ của booking")
public record BookingBalanceResponse(
        @Schema(description = "Tổng tiền phòng", example = "1800000")
        Long roomTotalPrice,

        @Schema(description = "Tổng tiền dịch vụ đã sử dụng (USED)", example = "200000")
        Long serviceTotalPrice,

        @Schema(description = "Tổng giá trị booking (phòng + dịch vụ USED)", example = "2000000")
        Long grandTotalPrice,

        @Schema(description = "Tổng tiền đã thu được xác nhận (DEPOSIT + PAYMENT)", example = "540000")
        Long paidAmount,

        @Schema(description = "Tổng tiền đã hoàn lại được xác nhận (REFUND)", example = "0")
        Long refundedAmount,

        @Schema(description = "Số tiền còn phải thanh toán", example = "1460000")
        Long outstandingAmount,

        @Schema(description = "Số tiền hoàn đang chờ xử lý", example = "0")
        Long refundPendingAmount
) {}
