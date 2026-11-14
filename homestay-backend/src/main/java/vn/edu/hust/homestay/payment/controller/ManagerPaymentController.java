package vn.edu.hust.homestay.payment.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.response.ApiResponse;
import vn.edu.hust.homestay.payment.dto.ConfirmRefundRequest;
import vn.edu.hust.homestay.payment.dto.ConfirmRefundResponse;
import vn.edu.hust.homestay.payment.service.ManagerPaymentService;

@Tag(name = "Manager — Payments", description = "Xác nhận khoản hoàn tiền của homestay")
@RestController
@RequestMapping("/api/v1/manager/payments")
@PreAuthorize("hasRole('MANAGER')")
public class ManagerPaymentController {

    private final ManagerPaymentService managerPaymentService;

    public ManagerPaymentController(ManagerPaymentService managerPaymentService) {
        this.managerPaymentService = managerPaymentService;
    }

    @Operation(summary = "API-PAY-04: Xác nhận đã hoàn tiền")
    @PostMapping("/{paymentId}/confirm")
    public ResponseEntity<ApiResponse<ConfirmRefundResponse>> confirmRefund(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long paymentId,
            @Valid @RequestBody(required = false) ConfirmRefundRequest request
    ) {
        ConfirmRefundResponse response = managerPaymentService.confirmRefund(principal, paymentId, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
