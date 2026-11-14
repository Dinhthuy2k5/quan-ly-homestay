package vn.edu.hust.homestay.policy.dto;

import lombok.Builder;
import java.util.List;

/**
 * DTO phản hồi thông tin chính sách & quy định áp dụng cho homestay.
 * Phục vụ cho cả khách hàng (xem thông tin đặt phòng, cọc, hủy, nội quy)
 * và quản lý homestay (nắm rõ các quy định vận hành của cơ sở).
 */
@Builder
public record HomestayPolicyResponse(
        Long homestayId,
        String homestayName,
        BookingPolicyDto bookingPolicy,
        PaymentPolicyDto paymentPolicy,
        StayPolicyDto stayPolicy,
        CancellationPolicyDto cancellationPolicy
) {

    @Builder
    public record BookingPolicyDto(
            int minNights,
            int maxNights,
            int maxAdvanceDays,
            int adjustMinDaysBefore,
            String description
    ) {}

    @Builder
    public record PaymentPolicyDto(
            int depositPercent,
            int holdHours,
            String bankName,
            String bankAccountNumber,
            String bankAccountHolder,
            String description,
            String finalPaymentTiming
    ) {}

    @Builder
    public record StayPolicyDto(
            String checkInTime,
            String checkOutDeadline,
            List<String> houseRules
    ) {}

    @Builder
    public record CancellationPolicyDto(
            List<RefundRuleDto> refundRules,
            String generalPolicyDescription
    ) {}

    @Builder
    public record RefundRuleDto(
            int daysBeforeCheckIn,
            int refundPercent,
            String description
    ) {}
}
