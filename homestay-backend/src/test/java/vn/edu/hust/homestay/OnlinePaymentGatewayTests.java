package vn.edu.hust.homestay;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;
import vn.edu.hust.homestay.auth.entity.Role;
import vn.edu.hust.homestay.auth.entity.UserStatus;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.booking.entity.Booking;
import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;
import vn.edu.hust.homestay.booking.repository.BookingRepository;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.payment.dto.ConfirmRefundRequest;
import vn.edu.hust.homestay.payment.dto.ConfirmRefundResponse;
import vn.edu.hust.homestay.payment.dto.OnlineDepositVerifyResponse;
import vn.edu.hust.homestay.payment.entity.Payment;
import vn.edu.hust.homestay.payment.entity.Payment.PaymentMethod;
import vn.edu.hust.homestay.payment.entity.Payment.PaymentStatus;
import vn.edu.hust.homestay.payment.entity.Payment.PaymentType;
import vn.edu.hust.homestay.payment.gateway.OnlinePaymentGateway.GatewayCreateCommand;
import vn.edu.hust.homestay.payment.gateway.OnlinePaymentGateway.GatewayCreateResult;
import vn.edu.hust.homestay.payment.gateway.OnlinePaymentGateway.GatewayQueryResult;
import vn.edu.hust.homestay.payment.gateway.OnlinePaymentGateway.GatewayRefundCommand;
import vn.edu.hust.homestay.payment.gateway.OnlinePaymentGateway.GatewayRefundResult;
import vn.edu.hust.homestay.payment.gateway.OnlinePaymentGateway.GatewayTxState;
import vn.edu.hust.homestay.payment.gateway.PaymentGatewayRegistry;
import vn.edu.hust.homestay.payment.gateway.VnPayPaymentGateway;
import vn.edu.hust.homestay.payment.gateway.VnPayProperties;
import vn.edu.hust.homestay.payment.repository.PaymentRepository;
import vn.edu.hust.homestay.payment.service.ManagerPaymentService;
import vn.edu.hust.homestay.payment.service.OnlineDepositPaymentService;

import java.lang.reflect.Proxy;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Kiểm thử đơn vị cho Strategy Pattern VNPay Sandbox:
 * - Ký và xác thực chữ ký HMAC-SHA512 (URL thanh toán, Return URL, GET IPN)
 * - Luồng đối soát đặt cọc trực tuyến (API-PAY-05/06/07) và tình huống biên đơn hết hạn
 * - Luồng hoàn tiền tự động VNPay (API-PAY-04), nhánh hoàn thủ công dự phòng khi cổng VNPay lỗi, và luồng thủ công cũ.
 */
class OnlinePaymentGatewayTests {

    private static final String TEST_VNPAY_TMN_CODE = "TESTTMN1";
    private static final String TEST_VNPAY_SECRET = "VNPAYSECRETKEY1234567890ABCDEFGH";

    private VnPayProperties vnPayProperties;
    private StubbableVnPayGateway vnPayGateway;

    private Map<Long, Booking> bookingStore;
    private Map<Long, Payment> paymentStore;
    private AtomicLong nextPaymentId;
    private OnlineDepositPaymentService onlineDepositService;
    private ManagerPaymentService managerPaymentService;

    @BeforeEach
    void setUp() {
        vnPayProperties = new VnPayProperties();
        vnPayProperties.setPayUrl("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html");
        vnPayProperties.setApiUrl("https://sandbox.vnpayment.vn/merchant_webapi/api/transaction");
        vnPayProperties.setTmnCode(TEST_VNPAY_TMN_CODE);
        vnPayProperties.setHashSecret(TEST_VNPAY_SECRET);
        vnPayProperties.setIpAddr("127.0.0.1");
        vnPayGateway = new StubbableVnPayGateway(vnPayProperties);

        bookingStore = new LinkedHashMap<>();
        paymentStore = new LinkedHashMap<>();
        nextPaymentId = new AtomicLong(8000L);

        BookingRepository bookingRepository = createBookingRepositoryStub();
        PaymentRepository paymentRepository = createPaymentRepositoryStub();
        PaymentGatewayRegistry gatewayRegistry = new PaymentGatewayRegistry(List.of(vnPayGateway));

        TransactionTemplate immediateTx = new TransactionTemplate() {
            @Override
            public <T> T execute(TransactionCallback<T> action) {
                return action.doInTransaction(new SimpleTransactionStatus());
            }
        };

        onlineDepositService = new OnlineDepositPaymentService(
                bookingRepository,
                paymentRepository,
                gatewayRegistry,
                immediateTx,
                "http://localhost:5173"
        );
        managerPaymentService = new ManagerPaymentService(paymentRepository, gatewayRegistry);
    }

    @Test
    @DisplayName("VNPay API v2.1.0: tạo URL thanh toán có vnp_Amount x100, chữ ký HMAC-SHA512 hợp lệ và tách đúng timestamp GMT+7")
    void vnPayCreatePaymentUrlAndSignatureVerification() {
        String txnRef = "DEP_501_20261125213045_A1B2C3";
        GatewayCreateResult created = vnPayGateway.createDepositPayment(new GatewayCreateCommand(
                txnRef,
                600_000L,
                "Dat coc don HS-261125-0001",
                "http://localhost:5173/customer/bookings/501",
                ""
        ));

        assertEquals(txnRef, created.providerOrderId());
        assertTrue(created.payUrl().startsWith("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?"));

        Map<String, String> queryMap = parseQueryParams(created.payUrl());
        assertEquals(TEST_VNPAY_TMN_CODE, queryMap.get("vnp_TmnCode"));
        assertEquals("60000000", queryMap.get("vnp_Amount")); // 600,000 VND * 100
        assertEquals(txnRef, queryMap.get("vnp_TxnRef"));
        assertEquals("20261125213045", queryMap.get("vnp_CreateDate"));
        assertEquals("20261125213045", VnPayPaymentGateway.extractVietnamTimestamp(txnRef));
        assertTrue(vnPayGateway.verifyVnPayParamsSignature(queryMap));

        // Giả mạo số tiền trên query string -> chữ ký HMAC-SHA512 phải bị từ chối
        Map<String, String> tampered = new LinkedHashMap<>(queryMap);
        tampered.put("vnp_Amount", "100000");
        assertFalse(vnPayGateway.verifyVnPayParamsSignature(tampered));
    }

    @Test
    @DisplayName("VNPay: báo lỗi PAYMENT_GATEWAY_NOT_CONFIGURED khi chưa điền VNPAY_TMN_CODE / VNPAY_HASH_SECRET")
    void vnPayMissingConfigThrowsHelpfulError() {
        VnPayProperties emptyProps = new VnPayProperties();
        VnPayPaymentGateway unconfigured = new VnPayPaymentGateway(emptyProps);

        BusinessException ex = assertThrows(BusinessException.class, () -> unconfigured.createDepositPayment(
                new GatewayCreateCommand("DEP_1_20261125213045_AAAAAA", 500_000L, "Dat coc", "http://localhost:5173/customer/bookings/1", "")
        ));
        assertEquals("PAYMENT_GATEWAY_NOT_CONFIGURED", ex.getCode());
    }

    @Test
    @DisplayName("API-PAY-06: đối soát querydr thành công tự động xác nhận Payment & Booking và xử lý idempotent")
    void verifyOnlineDepositViaQueryDrAutoConfirmsBooking() {
        UserPrincipal customer = customerPrincipal(25L);
        String txnRef = "DEP_501_20261125213045_AA11BB";
        Booking booking = sampleBooking(501L, 1L, 25L, BookingStatus.PENDING_DEPOSIT, 600_000L);
        Payment payment = sampleOnlineDeposit(7020L, 501L, 1L, 25L, 600_000L, PaymentStatus.PENDING, txnRef, null);
        bookingStore.put(501L, booking);
        paymentStore.put(7020L, payment);

        vnPayGateway.nextQueryResult = new GatewayQueryResult(
                txnRef, 0, "14567890", 600_000L, "Thanh toán VNPay thành công.", GatewayTxState.SUCCEEDED
        );

        OnlineDepositVerifyResponse result = onlineDepositService.verifyOnlineDeposit(customer, 501L, 7020L);

        assertEquals(PaymentMethod.VNPAY, result.method());
        assertEquals(PaymentStatus.CONFIRMED, result.paymentStatus());
        assertEquals(BookingStatus.CONFIRMED, result.bookingStatus());
        assertEquals("14567890", result.providerTransId());
        assertFalse(result.latePaymentRefundCreated());
        assertNull(payment.getConfirmedBy());
        assertNotNull(payment.getConfirmedAt());
        assertNull(booking.getApprovedBy());
        assertNotNull(booking.getApprovedAt());

        // Gọi verify lại lần 2 -> idempotent, không gọi lại cổng thanh toán
        int callsBefore = vnPayGateway.queryCallCount;
        OnlineDepositVerifyResponse secondCall = onlineDepositService.verifyOnlineDeposit(customer, 501L, 7020L);
        assertEquals(PaymentStatus.CONFIRMED, secondCall.paymentStatus());
        assertEquals(callsBefore, vnPayGateway.queryCallCount);
    }

    @Test
    @DisplayName("API-PAY-06 (VNPay Return): đối soát theo vnp_TxnRef tự xác nhận Payment & Booking ngay cả khi querydr lỗi nhờ chữ ký HMAC-SHA512")
    void verifyVnPayReturnByOrderConfirmsBookingWithSignedFallback() {
        UserPrincipal customer = customerPrincipal(25L);
        String txnRef = "DEP_510_20261125213045_F1E2D3";
        Booking booking = sampleBooking(510L, 1L, 25L, BookingStatus.PENDING_DEPOSIT, 480_000L);
        Payment payment = sampleOnlineDeposit(7100L, 510L, 1L, 25L, 480_000L, PaymentStatus.PENDING, txnRef, null);
        bookingStore.put(510L, booking);
        paymentStore.put(7100L, payment);

        vnPayGateway.throwOnQuery = true;

        Map<String, String> signedReturnParams = buildSignedVnPayParams(txnRef, 480_000L, "14567890", "00", "00");
        OnlineDepositVerifyResponse result = onlineDepositService.verifyOnlineDepositByOrder(
                customer, 510L, txnRef, signedReturnParams
        );

        assertEquals(PaymentMethod.VNPAY, result.method());
        assertEquals(PaymentStatus.CONFIRMED, result.paymentStatus());
        assertEquals(BookingStatus.CONFIRMED, result.bookingStatus());
        assertEquals("14567890", result.providerTransId());
        assertFalse(result.latePaymentRefundCreated());
        assertNull(payment.getConfirmedBy());
        assertNotNull(payment.getConfirmedAt());
        assertNull(booking.getApprovedBy());
        assertNotNull(booking.getApprovedAt());
    }

    @Test
    @DisplayName("API-PAY-06: nếu đơn đã EXPIRED trước khi VNPay trả tiền thành công thì tự tạo khoản REFUND PENDING và không mở lại phòng")
    void verifyOnlineDepositOnExpiredBookingCreatesRefund() {
        UserPrincipal customer = customerPrincipal(25L);
        String txnRef = "DEP_502_20261125213045_CC22DD";
        Booking booking = sampleBooking(502L, 1L, 25L, BookingStatus.EXPIRED, 600_000L);
        Payment payment = sampleOnlineDeposit(7021L, 502L, 1L, 25L, 600_000L, PaymentStatus.PENDING, txnRef, null);
        bookingStore.put(502L, booking);
        paymentStore.put(7021L, payment);

        vnPayGateway.nextQueryResult = new GatewayQueryResult(
                txnRef, 0, "14999999", 600_000L, "Thanh toán VNPay thành công.", GatewayTxState.SUCCEEDED
        );

        OnlineDepositVerifyResponse result = onlineDepositService.verifyOnlineDeposit(customer, 502L, 7021L);

        assertEquals(PaymentStatus.CONFIRMED, result.paymentStatus());
        assertEquals(BookingStatus.EXPIRED, result.bookingStatus());
        assertTrue(result.latePaymentRefundCreated());
        assertEquals(600_000L, booking.getRefundAmount());

        List<Payment> refunds = paymentStore.values().stream()
                .filter(p -> p.getType() == PaymentType.REFUND)
                .toList();
        assertEquals(1, refunds.size());
        assertEquals(PaymentMethod.VNPAY, refunds.get(0).getMethod());
        assertEquals(PaymentStatus.PENDING, refunds.get(0).getStatus());
        assertEquals(600_000L, refunds.get(0).getAmount());
    }

    @Test
    @DisplayName("API-PAY-07 (VNPay GET IPN): trả RspCode chuẩn 97 (sai chữ ký), 01 (không thấy đơn), 04 (sai tiền), 00 (thành công), 02 (idempotent)")
    void vnPayIpnReturnsStandardSpecCodes() {
        String txnRef = "DEP_511_20261125213045_B2C3D4";
        Booking booking = sampleBooking(511L, 1L, 25L, BookingStatus.PENDING_DEPOSIT, 600_000L);
        Payment payment = sampleOnlineDeposit(7101L, 511L, 1L, 25L, 600_000L, PaymentStatus.PENDING, txnRef, null);
        bookingStore.put(511L, booking);
        paymentStore.put(7101L, payment);

        // 1. Sai chữ ký -> 97
        Map<String, String> badSig = buildSignedVnPayParams(txnRef, 600_000L, "14990011", "00", "00");
        badSig.put("vnp_SecureHash", "0000deadbeef");
        assertEquals("97", onlineDepositService.handleVnPayIpn(badSig).get("RspCode"));

        // 2. Không tìm thấy đơn -> 01
        Map<String, String> unknownOrder = buildSignedVnPayParams("DEP_999_20261125213045_000000", 600_000L, "14990011", "00", "00");
        assertEquals("01", onlineDepositService.handleVnPayIpn(unknownOrder).get("RspCode"));

        // 3. Sai số tiền -> 04
        Map<String, String> wrongAmount = buildSignedVnPayParams(txnRef, 100_000L, "14990011", "00", "00");
        assertEquals("04", onlineDepositService.handleVnPayIpn(wrongAmount).get("RspCode"));

        // 4. Hợp lệ -> 00 và tự động xác nhận Payment + Booking
        Map<String, String> validIpn = buildSignedVnPayParams(txnRef, 600_000L, "14990011", "00", "00");
        assertEquals("00", onlineDepositService.handleVnPayIpn(validIpn).get("RspCode"));
        assertEquals(PaymentStatus.CONFIRMED, payment.getStatus());
        assertEquals("14990011", payment.getProviderTransId());
        assertEquals(BookingStatus.CONFIRMED, booking.getStatus());

        // 5. VNPay gọi lại lần 2 -> idempotent 02
        assertEquals("02", onlineDepositService.handleVnPayIpn(validIpn).get("RspCode"));
    }

    @Test
    @DisplayName("VNPay API v2.1.0 (mục 2.5.5.2): xác thực chữ ký HMAC-SHA512 gói tin phản hồi refund")
    void vnPayRefundResponseSignatureVerification() {
        ObjectMapper mapper = new ObjectMapper();
        String hashData = String.join("|",
                "RESP20261126063500",
                "refund",
                "00",
                "send refund success",
                TEST_VNPAY_TMN_CODE,
                "DEP_512_20261125213045_C3D4E5",
                "30000000",
                "NCB",
                "20261126063505",
                "14998877",
                "03",
                "05",
                "Hoan tien 50 phan tram"
        );
        String validHash = VnPayPaymentGateway.hmacSha512Hex(TEST_VNPAY_SECRET, hashData);

        ObjectNode validResp = mapper.createObjectNode();
        validResp.put("vnp_ResponseId", "RESP20261126063500");
        validResp.put("vnp_Command", "refund");
        validResp.put("vnp_ResponseCode", "00");
        validResp.put("vnp_Message", "send refund success");
        validResp.put("vnp_TmnCode", TEST_VNPAY_TMN_CODE);
        validResp.put("vnp_TxnRef", "DEP_512_20261125213045_C3D4E5");
        validResp.put("vnp_Amount", "30000000");
        validResp.put("vnp_BankCode", "NCB");
        validResp.put("vnp_PayDate", "20261126063505");
        validResp.put("vnp_TransactionNo", "14998877");
        validResp.put("vnp_TransactionType", "03");
        validResp.put("vnp_TransactionStatus", "05");
        validResp.put("vnp_OrderInfo", "Hoan tien 50 phan tram");
        validResp.put("vnp_SecureHash", validHash);
        assertTrue(vnPayGateway.verifyRefundResponseSignature(validResp));

        // Giả mạo số tiền hoàn trả trong response -> từ chối
        ObjectNode tampered = validResp.deepCopy();
        tampered.put("vnp_Amount", "10000000");
        assertFalse(vnPayGateway.verifyRefundResponseSignature(tampered));

        // Không có vnp_SecureHash (trường tùy chọn theo đặc tả) -> cho qua
        ObjectNode withoutHash = validResp.deepCopy();
        withoutHash.remove("vnp_SecureHash");
        assertTrue(vnPayGateway.verifyRefundResponseSignature(withoutHash));
    }

    @Test
    @DisplayName("API-PAY-04 (VNPay): hoàn tiền đồng nhất vnp_RequestId với provider_order_id (Alphanumeric[1,32]) và truyền đủ thông tin gốc")
    void confirmRefundCallsVnPayGatewayForOnlineDeposit() {
        UserPrincipal manager = managerPrincipal(3L, 1L);
        String depositTxnRef = "DEP_512_20261125213045_C3D4E5";
        Payment originalDeposit = sampleOnlineDeposit(
                7102L, 512L, 1L, 25L, 600_000L, PaymentStatus.CONFIRMED, depositTxnRef, "14887766"
        );
        originalDeposit.setConfirmedAt(LocalDateTime.now(ZoneOffset.UTC));

        Payment refund = new Payment();
        refund.setId(7103L);
        refund.setBookingId(512L);
        refund.setHomestayId(1L);
        refund.setType(PaymentType.REFUND);
        refund.setAmount(300_000L); // Hoàn 50% tiền cọc
        refund.setMethod(PaymentMethod.VNPAY);
        refund.setStatus(PaymentStatus.PENDING);
        refund.setCreatedBy(25L);
        paymentStore.put(7102L, originalDeposit);
        paymentStore.put(7103L, refund);

        ConfirmRefundResponse res = managerPaymentService.confirmRefund(
                manager, 7103L, new ConfirmRefundRequest(null, "Hoàn 50% cọc VNPay theo chính sách")
        );

        assertEquals(PaymentStatus.CONFIRMED, res.status());
        assertEquals(PaymentMethod.VNPAY, res.method());
        assertEquals("14998877", res.providerTransId());
        assertEquals(1, vnPayGateway.refundCommands.size());

        GatewayRefundCommand sent = vnPayGateway.refundCommands.get(0);
        assertEquals(sent.requestId(), res.providerOrderId());
        assertTrue(sent.requestId().matches("^[A-Za-z0-9]{1,32}$"), "vnp_RequestId phải là Alphanumeric[1,32]");
        assertEquals(depositTxnRef, sent.originalProviderOrderId());
        assertEquals("14887766", sent.originalProviderTransId());
        assertEquals(600_000L, sent.originalDepositAmount());
        assertEquals(300_000L, sent.amount());
        assertEquals("manager3", sent.createdBy());
    }

    @Test
    @DisplayName("API-PAY-04 (Dự phòng): khi cổng VNPay lỗi, Manager chọn manualFallback=true sẽ xác nhận hoàn thủ công (BANK_TRANSFER/CASH) mà không gọi VNPay")
    void confirmRefundSupportsManualFallbackWhenVnPayFails() {
        UserPrincipal manager = managerPrincipal(3L, 1L);
        String depositTxnRef = "DEP_513_20261125213045_D4E5F6";
        Payment originalDeposit = sampleOnlineDeposit(
                7104L, 513L, 1L, 25L, 480_000L, PaymentStatus.CONFIRMED, depositTxnRef, "15749061"
        );
        originalDeposit.setConfirmedAt(LocalDateTime.now(ZoneOffset.UTC));

        Payment refund = new Payment();
        refund.setId(7105L);
        refund.setBookingId(513L);
        refund.setHomestayId(1L);
        refund.setType(PaymentType.REFUND);
        refund.setAmount(240_000L);
        refund.setMethod(PaymentMethod.VNPAY);
        refund.setStatus(PaymentStatus.PENDING);
        refund.setCreatedBy(25L);
        paymentStore.put(7104L, originalDeposit);
        paymentStore.put(7105L, refund);

        // Truyền fallbackMethod = VNPAY -> từ chối
        BusinessException badMethod = assertThrows(BusinessException.class, () -> managerPaymentService.confirmRefund(
                manager, 7105L, new ConfirmRefundRequest("VCB-123", "Dự phòng", true, PaymentMethod.VNPAY)
        ));
        assertEquals("INVALID_PAYMENT_METHOD", badMethod.getCode());

        // Truyền manualFallback = true, fallbackMethod = BANK_TRANSFER -> xác nhận thành công, không gọi cổng VNPay
        ConfirmRefundResponse res = managerPaymentService.confirmRefund(
                manager, 7105L, new ConfirmRefundRequest("VCB-FALLBACK-01", "Hoàn thủ công do VNPay Sandbox lỗi", true, PaymentMethod.BANK_TRANSFER)
        );

        assertEquals(PaymentStatus.CONFIRMED, res.status());
        assertEquals(PaymentMethod.BANK_TRANSFER, res.method());
        assertNull(res.providerOrderId());
        assertNull(res.providerTransId());
        assertEquals("VCB-FALLBACK-01", refund.getReferenceCode());
        assertEquals(3L, refund.getConfirmedBy());
        assertNotNull(refund.getConfirmedAt());
        assertTrue(vnPayGateway.refundCommands.isEmpty());
    }

    @Test
    @DisplayName("API-PAY-04: hoàn tiền đơn cọc thủ công BANK_TRANSFER không gọi cổng VNPay và giữ nguyên luồng cũ")
    void confirmRefundUsesManualFlowForBankTransferDeposit() {
        UserPrincipal manager = managerPrincipal(3L, 1L);
        Payment refund = new Payment();
        refund.setId(7011L);
        refund.setBookingId(503L);
        refund.setHomestayId(1L);
        refund.setType(PaymentType.REFUND);
        refund.setAmount(400_000L);
        refund.setMethod(PaymentMethod.BANK_TRANSFER);
        refund.setStatus(PaymentStatus.PENDING);
        refund.setCreatedBy(25L);
        paymentStore.put(7011L, refund);

        ConfirmRefundResponse res = managerPaymentService.confirmRefund(
                manager, 7011L, new ConfirmRefundRequest("VCB-REF-99", "Đã chuyển khoản hoàn")
        );

        assertEquals(PaymentStatus.CONFIRMED, res.status());
        assertEquals(PaymentMethod.BANK_TRANSFER, res.method());
        assertEquals("VCB-REF-99", refund.getReferenceCode());
        assertNull(refund.getProviderTransId());
        assertTrue(vnPayGateway.refundCommands.isEmpty());
    }

    private Map<String, String> buildSignedVnPayParams(
            String txnRef, long vndAmount, String transNo, String responseCode, String txStatus
    ) {
        TreeMap<String, String> params = new TreeMap<>();
        params.put("vnp_Amount", String.valueOf(vndAmount * 100L));
        params.put("vnp_BankCode", "NCB");
        params.put("vnp_CardType", "ATM");
        params.put("vnp_OrderInfo", "Dat coc booking");
        params.put("vnp_PayDate", "20261125213100");
        params.put("vnp_ResponseCode", responseCode);
        params.put("vnp_TmnCode", TEST_VNPAY_TMN_CODE);
        params.put("vnp_TransactionNo", transNo);
        params.put("vnp_TransactionStatus", txStatus);
        params.put("vnp_TxnRef", txnRef);

        String hashData = VnPayPaymentGateway.buildSignedQueryString(params);
        String secureHash = VnPayPaymentGateway.hmacSha512Hex(TEST_VNPAY_SECRET, hashData);

        Map<String, String> signed = new LinkedHashMap<>(params);
        signed.put("vnp_SecureHash", secureHash);
        return signed;
    }

    private Map<String, String> parseQueryParams(String url) {
        String rawQuery = URI.create(url).getRawQuery();
        Map<String, String> map = new LinkedHashMap<>();
        if (rawQuery == null || rawQuery.isBlank()) {
            return map;
        }
        for (String pair : rawQuery.split("&")) {
            int idx = pair.indexOf('=');
            if (idx > 0) {
                String k = URLDecoder.decode(pair.substring(0, idx), StandardCharsets.US_ASCII);
                String v = URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.US_ASCII);
                map.put(k, v);
            }
        }
        return map;
    }

    private BookingRepository createBookingRepositoryStub() {
        return (BookingRepository) Proxy.newProxyInstance(
                BookingRepository.class.getClassLoader(),
                new Class<?>[]{BookingRepository.class},
                (proxy, method, args) -> switch (method.getName()) {
                    case "existsById" -> bookingStore.containsKey((Long) args[0]);
                    case "findById", "findByIdForUpdate" -> Optional.ofNullable(bookingStore.get((Long) args[0]));
                    case "findByIdAndCustomerIdForUpdate" -> Optional.ofNullable(bookingStore.get((Long) args[0]))
                            .filter(b -> args[1].equals(b.getCustomerId()));
                    case "save", "saveAndFlush" -> {
                        Booking b = (Booking) args[0];
                        bookingStore.put(b.getId(), b);
                        yield b;
                    }
                    default -> throw new UnsupportedOperationException("Unexpected call: " + method.getName());
                }
        );
    }

    @SuppressWarnings("unchecked")
    private PaymentRepository createPaymentRepositoryStub() {
        return (PaymentRepository) Proxy.newProxyInstance(
                PaymentRepository.class.getClassLoader(),
                new Class<?>[]{PaymentRepository.class},
                (proxy, method, args) -> switch (method.getName()) {
                    case "findById", "findByIdForUpdate" -> Optional.ofNullable(paymentStore.get((Long) args[0]));
                    case "findByProviderOrderId", "findByProviderOrderIdForUpdate" -> paymentStore.values().stream()
                            .filter(p -> args[0].equals(p.getProviderOrderId()))
                            .findFirst();
                    case "findByBookingIdAndTypeAndStatus" -> paymentStore.values().stream()
                            .filter(p -> args[0].equals(p.getBookingId()) && args[1] == p.getType() && args[2] == p.getStatus())
                            .toList();
                    case "findTopByBookingIdAndTypeAndStatusAndMethodOrderByConfirmedAtDesc" -> paymentStore.values().stream()
                            .filter(p -> args[0].equals(p.getBookingId())
                                    && args[1] == p.getType()
                                    && args[2] == p.getStatus()
                                    && args[3] == p.getMethod())
                            .max(Comparator.comparing(Payment::getConfirmedAt, Comparator.nullsFirst(Comparator.naturalOrder())));
                    case "findTopByBookingIdAndTypeAndStatusAndMethodInAndProviderTransIdIsNotNullOrderByConfirmedAtDesc" -> {
                        Collection<PaymentMethod> methods = (Collection<PaymentMethod>) args[3];
                        yield paymentStore.values().stream()
                                .filter(p -> args[0].equals(p.getBookingId())
                                        && args[1] == p.getType()
                                        && args[2] == p.getStatus()
                                        && methods.contains(p.getMethod())
                                        && p.getProviderTransId() != null)
                                .max(Comparator.comparing(Payment::getConfirmedAt, Comparator.nullsFirst(Comparator.naturalOrder())));
                    }
                    case "save", "saveAndFlush" -> {
                        Payment p = (Payment) args[0];
                        if (p.getId() == null) {
                            p.setId(nextPaymentId.incrementAndGet());
                        }
                        paymentStore.put(p.getId(), p);
                        yield p;
                    }
                    case "saveAllAndFlush" -> {
                        List<Payment> list = new ArrayList<>((List<Payment>) args[0]);
                        for (Payment p : list) {
                            if (p.getId() == null) {
                                p.setId(nextPaymentId.incrementAndGet());
                            }
                            paymentStore.put(p.getId(), p);
                        }
                        yield list;
                    }
                    default -> throw new UnsupportedOperationException("Unexpected call: " + method.getName());
                }
        );
    }

    /** Subclass VnPayPaymentGateway dùng thuật toán ký thật nhưng giả lập lời gọi HTTP querydr/refund cho unit test offline. */
    private static class StubbableVnPayGateway extends VnPayPaymentGateway {
        boolean throwOnQuery = false;
        int queryCallCount = 0;
        GatewayQueryResult nextQueryResult;
        final List<GatewayRefundCommand> refundCommands = new ArrayList<>();

        StubbableVnPayGateway(VnPayProperties properties) {
            super(properties);
        }

        @Override
        public GatewayQueryResult queryPayment(String providerOrderId) {
            queryCallCount++;
            if (throwOnQuery) {
                throw new BusinessException("PAYMENT_GATEWAY_ERROR", "Sandbox querydr timeout", HttpStatus.BAD_GATEWAY);
            }
            return nextQueryResult;
        }

        @Override
        public GatewayRefundResult refundPayment(GatewayRefundCommand command) {
            refundCommands.add(command);
            return new GatewayRefundResult(command.requestId(), "14998877", 0, "Success");
        }
    }

    private UserPrincipal customerPrincipal(Long id) {
        return UserPrincipal.builder()
                .id(id)
                .email("khach@example.com")
                .passwordHash("x")
                .fullName("Khách Test")
                .phone("0901234567")
                .role(Role.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build();
    }

    private UserPrincipal managerPrincipal(Long id, Long homestayId) {
        return UserPrincipal.builder()
                .id(id)
                .email("manager@example.com")
                .passwordHash("x")
                .fullName("Quản Lý Test")
                .phone("0907654321")
                .role(Role.MANAGER)
                .status(UserStatus.ACTIVE)
                .homestayId(homestayId)
                .build();
    }

    private Booking sampleBooking(Long id, Long homestayId, Long customerId, BookingStatus status, long depositAmount) {
        Booking booking = new Booking();
        booking.setId(id);
        booking.setCode("HS-261125-0001");
        booking.setHomestayId(homestayId);
        booking.setCustomerId(customerId);
        booking.setStatus(status);
        booking.setDepositAmount(depositAmount);
        booking.setRoomTotalPrice(depositAmount * 3);
        booking.setHoldExpiresAt(LocalDateTime.now(ZoneOffset.UTC).plusHours(24));
        return booking;
    }

    private Payment sampleOnlineDeposit(
            Long id, Long bookingId, Long homestayId, Long createdBy, long amount,
            PaymentStatus status, String providerOrderId, String providerTransId
    ) {
        Payment payment = new Payment();
        payment.setId(id);
        payment.setBookingId(bookingId);
        payment.setHomestayId(homestayId);
        payment.setType(PaymentType.DEPOSIT);
        payment.setMethod(PaymentMethod.VNPAY);
        payment.setStatus(status);
        payment.setAmount(amount);
        payment.setProviderOrderId(providerOrderId);
        payment.setProviderTransId(providerTransId);
        payment.setCreatedBy(createdBy);
        return payment;
    }
}
