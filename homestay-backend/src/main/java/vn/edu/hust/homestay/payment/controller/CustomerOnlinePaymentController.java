package vn.edu.hust.homestay.payment.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
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
import vn.edu.hust.homestay.payment.dto.OnlineDepositInitRequest;
import vn.edu.hust.homestay.payment.dto.OnlineDepositInitResponse;
import vn.edu.hust.homestay.payment.dto.OnlineDepositVerifyResponse;
import vn.edu.hust.homestay.payment.dto.VerifyOnlineDepositRequest;
import vn.edu.hust.homestay.payment.service.OnlineDepositPaymentService;

/**
 * Controller đặt cọc trực tuyến dành cho khách hàng (API-PAY-05 & API-PAY-06).
 * Hỗ trợ VNPay Sandbox chạy song song với luồng chuyển khoản thủ công hiện có.
 */
@Tag(name = "Customer — Online Payments", description = "Đặt cọc trực tuyến qua cổng VNPay Sandbox")
@RestController
@RequestMapping("/api/v1/customer/bookings/{bookingId}/payments")
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerOnlinePaymentController {

    private final OnlineDepositPaymentService onlineDepositPaymentService;

    public CustomerOnlinePaymentController(OnlineDepositPaymentService onlineDepositPaymentService) {
        this.onlineDepositPaymentService = onlineDepositPaymentService;
    }

    @Operation(summary = "API-PAY-05: Khởi tạo phiên đặt cọc trực tuyến (VNPay Sandbox) và trả payUrl")
    @PostMapping("/online")
    public ResponseEntity<ApiResponse<OnlineDepositInitResponse>> initiateOnlineDeposit(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long bookingId,
            @Valid @RequestBody(required = false) OnlineDepositInitRequest request
    ) {
        OnlineDepositInitResponse response = onlineDepositPaymentService.initiateOnlineDeposit(principal, bookingId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @Operation(summary = "API-PAY-06: Chủ động đối soát giao dịch đặt cọc theo paymentId với server cổng thanh toán")
    @PostMapping("/{paymentId}/verify")
    public ResponseEntity<ApiResponse<OnlineDepositVerifyResponse>> verifyOnlineDeposit(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long bookingId,
            @PathVariable Long paymentId,
            @RequestBody(required = false) VerifyOnlineDepositRequest request
    ) {
        OnlineDepositVerifyResponse response = onlineDepositPaymentService.verifyOnlineDeposit(
                principal,
                bookingId,
                paymentId,
                request == null ? null : request.gatewayParams()
        );
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @Operation(summary = "API-PAY-06 (VNPay Return): Đối soát giao dịch đặt cọc theo providerOrderId (vnp_TxnRef)")
    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<OnlineDepositVerifyResponse>> verifyOnlineDepositByOrder(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long bookingId,
            @RequestBody VerifyOnlineDepositRequest request
    ) {
        OnlineDepositVerifyResponse response = onlineDepositPaymentService.verifyOnlineDepositByOrder(
                principal,
                bookingId,
                request == null ? null : request.providerOrderId(),
                request == null ? null : request.gatewayParams()
        );
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
