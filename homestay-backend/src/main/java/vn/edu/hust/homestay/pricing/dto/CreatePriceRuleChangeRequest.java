package vn.edu.hust.homestay.pricing.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest.RequestType;

/**
 * Request DTO cho API-PRICE-03: Gửi yêu cầu thay đổi quy tắc giá.
 * Ngày thực hiện: 25/10/2026
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePriceRuleChangeRequest {

    @NotNull(message = "requestType không được để trống (CREATE, UPDATE, DEACTIVATE)")
    private RequestType requestType;

    /** Bắt buộc với UPDATE/DEACTIVATE; phải là null với CREATE */
    private Long targetRuleId;

    /** Nội dung quy tắc đề xuất (bắt buộc với CREATE/UPDATE) */
    @Valid
    private ProposedRuleDto proposedRule;
}
