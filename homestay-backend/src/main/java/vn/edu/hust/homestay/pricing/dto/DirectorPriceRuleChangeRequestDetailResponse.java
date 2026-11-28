package vn.edu.hust.homestay.pricing.dto;

import vn.edu.hust.homestay.pricing.dto.DirectorPriceRuleChangeRequestSummaryResponse.CurrentRuleSummary;
import vn.edu.hust.homestay.pricing.dto.DirectorPriceRuleChangeRequestSummaryResponse.PriceComparisonSummary;
import vn.edu.hust.homestay.pricing.entity.PriceRule.AdjustType;
import vn.edu.hust.homestay.pricing.entity.PriceRule.RuleType;
import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest.RequestType;
import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest.Status;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * DTO chi tiết yêu cầu phê duyệt thay đổi quy tắc giá cho Giám đốc (API-DIR-PRICE-02).
 * Giữ đủ các trường hợp đồng cốt lõi (id, homestayId, targetRuleId, requestType, proposedRule,
 * status, requestedBy, requestedAt) và bổ sung đầy đủ ngữ cảnh thẩm định:
 * - Quy tắc hiện hành (currentRule) & đối chiếu Trước → Sau (priceComparison)
 * - Hồ sơ chi tiết phòng kèm ảnh, tiện nghi, mô tả và mặt bằng giá cùng hạng/cơ sở (roomDetail)
 * - Hoặc danh sách phòng bị tác động khi áp dụng toàn cơ sở (homestayScopeDetail)
 * - Danh sách quy tắc đang hiệu lực (activeRules).
 */
public record DirectorPriceRuleChangeRequestDetailResponse(
        Long id,
        Long homestayId,
        String homestayName,
        String homestayProvince,
        String homestayAddress,
        Long targetRuleId,
        RequestType requestType,
        Status status,
        Long requestedBy,
        String requestedByName,
        String requestedByEmail,
        String requestedByPhone,
        Instant requestedAt,
        Long reviewedBy,
        String reviewedByName,
        String reviewedByEmail,
        Instant reviewedAt,
        String rejectionReason,
        Long roomId,
        String roomName,
        Object proposedRule,
        CurrentRuleSummary currentRule,
        PriceComparisonSummary priceComparison,
        RoomDetailContext roomDetail,
        HomestayScopeDetail homestayScopeDetail,
        List<ActiveRuleItem> activeRules
) {
    /** Hồ sơ chi tiết phòng bị tác động (khi quy tắc gắn với 1 phòng cụ thể). */
    public record RoomDetailContext(
            Long id,
            String name,
            Long roomTypeId,
            String roomTypeName,
            Integer maxGuests,
            RoomStatus status,
            String statusReason,
            String description,
            List<String> amenities,
            String coverImageUrl,
            Long currentBasePrice,
            PeerPriceBenchmark sameTypeBenchmark,
            PeerPriceBenchmark homestayBenchmark
    ) {}

    /** Mặt bằng giá cơ bản tham chiếu của các phòng ACTIVE khác cùng hạng phòng hoặc cùng cơ sở. */
    public record PeerPriceBenchmark(
            int roomCount,
            Long minBasePrice,
            Long maxBasePrice,
            Long avgBasePrice
    ) {}

    /** Chi tiết phạm vi khi quy tắc giá điều chỉnh áp dụng toàn cơ sở (roomId = null). */
    public record HomestayScopeDetail(
            long activeRoomCount,
            long totalRoomCount,
            Long minBasePrice,
            Long maxBasePrice,
            List<AffectedRoomPreview> affectedRooms
    ) {}

    /** Mức giá dự kiến sau khi áp dụng quy tắc toàn cơ sở cho từng phòng đang nhận đặt. */
    public record AffectedRoomPreview(
            Long roomId,
            String roomName,
            String roomTypeName,
            Integer maxGuests,
            Long currentBasePrice,
            Long projectedPrice
    ) {}

    /** Quy tắc giá đang ở trạng thái ACTIVE tác động lên phòng hoặc cơ sở hiện tại. */
    public record ActiveRuleItem(
            Long id,
            Long roomId,
            String roomName,
            RuleType ruleType,
            String name,
            Long basePrice,
            AdjustType adjustType,
            Long adjustValue,
            List<String> weekdays,
            LocalDate startDate,
            LocalDate endDate,
            Short priority,
            boolean isTargetRule
    ) {}
}
