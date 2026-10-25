package vn.edu.hust.homestay.pricing.dto;

import lombok.Builder;
import lombok.Getter;
import vn.edu.hust.homestay.pricing.entity.PriceRule;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

/** API-PRICE-02 response DTO. Only approved rule rows are stored in price_rules. */
@Getter
@Builder
public class ManagerPriceRuleResponse {
    private Long id;
    private PriceRule.RuleType ruleType;
    private String name;
    private Long roomId;
    private Long basePrice;
    private List<String> weekdays;
    private PriceRule.AdjustType adjustType;
    private Long adjustValue;
    private LocalDate startDate;
    private LocalDate endDate;
    private Short priority;
    private PriceRule.Status status;

    public static ManagerPriceRuleResponse from(PriceRule rule) {
        List<String> weekdays = rule.getWeekdays() == null || rule.getWeekdays().isBlank()
                ? List.of()
                : Arrays.stream(rule.getWeekdays().split(","))
                        .map(String::trim)
                        .filter(day -> !day.isEmpty())
                        .toList();

        return ManagerPriceRuleResponse.builder()
                .id(rule.getId())
                .ruleType(rule.getRuleType())
                .name(rule.getName())
                .roomId(rule.getRoomId())
                .basePrice(rule.getBasePrice())
                .weekdays(weekdays)
                .adjustType(rule.getAdjustType())
                .adjustValue(rule.getAdjustValue())
                .startDate(rule.getStartDate())
                .endDate(rule.getEndDate())
                .priority(rule.getPriority())
                .status(rule.getStatus())
                .build();
    }
}
