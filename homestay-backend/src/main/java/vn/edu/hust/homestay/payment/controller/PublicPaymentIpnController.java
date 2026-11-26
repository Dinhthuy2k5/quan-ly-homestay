package vn.edu.hust.homestay.payment.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hust.homestay.payment.service.OnlineDepositPaymentService;

import java.util.Map;

/**
 * Webhook công khai tiếp nhận thông báo IPN bất đồng bộ từ cổng thanh toán VNPay (API-PAY-07).
 * - VNPay: GET /api/v1/public/payments/vnpay/ipn (xác thực HMAC-SHA512, trả {"RspCode","Message"})
 */
@Tag(name = "Public — Payment IPN", description = "Webhook IPN từ cổng thanh toán trực tuyến VNPay")
@RestController
@RequestMapping("/api/v1/public/payments")
public class PublicPaymentIpnController {

    private final OnlineDepositPaymentService onlineDepositPaymentService;

    public PublicPaymentIpnController(OnlineDepositPaymentService onlineDepositPaymentService) {
        this.onlineDepositPaymentService = onlineDepositPaymentService;
    }

    @Operation(summary = "API-PAY-07 (VNPay): Webhook IPN nhận kết quả thanh toán từ VNPay (GET)")
    @GetMapping("/vnpay/ipn")
    public ResponseEntity<Map<String, String>> handleVnPayIpn(
            @RequestParam Map<String, String> queryParams
    ) {
        return ResponseEntity.ok(onlineDepositPaymentService.handleVnPayIpn(queryParams));
    }
}
