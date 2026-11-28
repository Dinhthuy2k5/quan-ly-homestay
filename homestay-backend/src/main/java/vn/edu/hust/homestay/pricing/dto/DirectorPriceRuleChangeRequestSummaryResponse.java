package vn.edu.hust.homestay.pricing.dto;

import vn.edu.hust.homestay.pricing.entity.PriceRule;
import vn.edu.hust.homestay.pricing.entity.PriceRule.AdjustType;
import vn.edu.hust.homestay.pricing.entity.PriceRule.RuleType;
import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest.RequestType;
import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest.Status;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Dữ liệu từng yêu cầu thay đổi quy tắc giá trả về trong danh sách cho Giám đốc (API-DIR-PRICE-01).
 * Giữ đủ các trường hợp đồng cốt lõi (id, homestayId, requestType, status, requestedBy, requestedAt)
 * và bổ sung thông tin đối chiếu giá hiện tại → đề xuất cùng tóm tắt phòng/phạm vi cơ sở.
 */
public record DirectorPriceRuleChangeRequestSummaryResponse(
        Long id,
        Long homestayId,
        String homestayName,
        Long targetRuleId,
        RequestType requestType,
        Status status,
        Long requestedBy,
        String requestedByName,
        String requestedByEmail,
        Instant requestedAt,
        Long reviewedBy,
        String reviewedByName,
        Instant reviewedAt,
        String rejectionReason,
        Long roomId,
        String roomName,
        Object proposedRule,
        RoomSummary roomSummary,
        HomestayScopeSummary homestayScopeSummary,
        CurrentRuleSummary currentRule,
        PriceComparisonSummary priceComparison
) {
    /** Tóm tắt phòng bị tác động khi quy tắc gắn với một phòng cụ thể. */
    public record RoomSummary(
            Long id,
            String name,
            String roomTypeName,
            Integer maxGuests,
            RoomStatus status,
            String statusReason,
            Long currentBasePrice
    ) {}

    /** Tóm tắt phạm vi cơ sở khi quy tắc điều chỉnh áp dụng toàn homestay (roomId = null). */
    public record HomestayScopeSummary(
            long activeRoomCount,
            long totalRoomCount,
            Long minBasePrice,
            Long maxBasePrice
    ) {}

    /** Ảnh chụp quy tắc hiện hành (quy tắc mục tiêu của UPDATE/DEACTIVATE hoặc giá BASE đang chạy sẽ bị thay thế bởi CREATE BASE). */
    public record CurrentRuleSummary(
            Long id,
            Long roomId,
            RuleType ruleType,
            String name,
            Long basePrice,
            AdjustType adjustType,
            Long adjustValue,
            List<String> weekdays,
            LocalDate startDate,
            LocalDate endDate,
            Short priority,
            PriceRule.Status status
    ) {}

    /** Đối chiếu giá hiện tại → đề xuất và chênh lệch (tính cho các yêu cầu đang PENDING_APPROVAL). */
    public record PriceComparisonSummary(
            Long currentAmount,
            Long proposedAmount,
            Long deltaAmount,
            Double deltaPercent,
            Long projectedMinPrice,
            Long projectedMaxPrice,
            boolean replacesActiveBaseRule,
            List<String> changedFields
    ) {}
}
