package vn.edu.hust.homestay.pricing.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.edu.hust.homestay.pricing.entity.PriceRule.AdjustType;
import vn.edu.hust.homestay.pricing.entity.PriceRule.RuleType;

import java.time.LocalDate;
import java.util.List;

/**
 * DTO mô tả nội dung quy tắc giá do Manager đề xuất (Tuần 4).
 * Được serialize thành JSON lưu vào cột 'proposed_rule'.
 * Ngày thực hiện: 25/10/2026
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProposedRuleDto {

    private Long roomId;

    private RuleType ruleType;

    @Size(max = 100, message = "Tên quy tắc không được vượt quá 100 ký tự")
    private String name;

    private Long basePrice;

    private AdjustType adjustType;

    private Long adjustValue;

    private List<String> weekdays;

    private LocalDate startDate;

    private LocalDate endDate;

    private Short priority;

    /** Bổ sung hành động nếu là DEACTIVATE */
    private String action;
}
