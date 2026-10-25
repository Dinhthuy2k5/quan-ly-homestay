package vn.edu.hust.homestay.pricing.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.response.ApiResponse;
import vn.edu.hust.homestay.common.response.PageMeta;
import vn.edu.hust.homestay.pricing.dto.ManagerPriceRuleResponse;
import vn.edu.hust.homestay.pricing.entity.PriceRule;
import vn.edu.hust.homestay.pricing.service.ManagerPriceRuleService;

import java.time.LocalDate;

/** API-PRICE-02: list approved price rules for a Manager's assigned homestay. */
@RestController
@RequestMapping("/api/v1/manager/price-rules")
@PreAuthorize("hasRole('MANAGER')")
public class ManagerPriceRuleController {

    private final ManagerPriceRuleService managerPriceRuleService;

    public ManagerPriceRuleController(ManagerPriceRuleService managerPriceRuleService) {
        this.managerPriceRuleService = managerPriceRuleService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<java.util.List<ManagerPriceRuleResponse>>> getPriceRules(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Long roomId,
            @RequestParam(required = false) PriceRule.RuleType ruleType,
            @RequestParam(required = false) PriceRule.Status status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        int validPage = Math.max(0, page);
        int boundedSize = Math.min(Math.max(1, size), 100);
        Page<ManagerPriceRuleResponse> result = managerPriceRuleService.getPriceRules(
                principal,
                roomId,
                ruleType,
                status,
                fromDate,
                toDate,
                PageRequest.of(validPage, boundedSize)
        );
        PageMeta meta = PageMeta.builder()
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .first(result.isFirst())
                .last(result.isLast())
                .build();
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), meta));
    }
}
