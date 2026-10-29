package vn.edu.hust.homestay.pricing.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest;
import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest.RequestType;
import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest.Status;

import java.time.Instant;

/**
 * Response DTO cho API-PRICE-03: Kết quả gửi yêu cầu thay đổi giá.
 * Ngày thực hiện: 25/10/2026
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PriceRuleChangeRequestResponse {

    private Long id;
    private Long homestayId;
    private Long targetRuleId;
    private RequestType requestType;
    private Object proposedRule;
    private Status status;
    private Long requestedBy;
    private Instant requestedAt;
    private Long reviewedBy;
    private Instant reviewedAt;
    private String rejectionReason;

    public static PriceRuleChangeRequestResponse from(PriceRuleChangeRequest entity, Object parsedRule) {
        return PriceRuleChangeRequestResponse.builder()
                .id(entity.getId())
                .homestayId(entity.getHomestayId())
                .targetRuleId(entity.getTargetRuleId())
                .requestType(entity.getRequestType())
                .proposedRule(parsedRule)
                .status(entity.getStatus())
                .requestedBy(entity.getRequestedBy())
                .requestedAt(entity.getRequestedAt())
                .reviewedBy(entity.getReviewedBy())
                .reviewedAt(entity.getReviewedAt())
                .rejectionReason(entity.getRejectionReason())
                .build();
    }
}
