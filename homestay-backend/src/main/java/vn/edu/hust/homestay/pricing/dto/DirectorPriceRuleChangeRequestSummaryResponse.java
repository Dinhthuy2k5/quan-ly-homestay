package vn.edu.hust.homestay.pricing.dto;

import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest.RequestType;
import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest.Status;

import java.time.Instant;

/**
 * Dữ liệu từng yêu cầu thay đổi quy tắc giá trả về trong danh sách cho Giám đốc (API-DIR-PRICE-01).
 * Giữ đủ các trường hợp đồng cốt lõi (id, homestayId, requestType, status, requestedBy, requestedAt)
 * và bổ sung thông tin hiển thị (tên cơ sở, người gửi, người duyệt, phòng, nội dung đề xuất).
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
        Object proposedRule
) {}
