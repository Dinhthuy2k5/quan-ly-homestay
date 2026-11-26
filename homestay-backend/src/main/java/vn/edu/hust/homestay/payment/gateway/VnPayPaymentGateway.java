package vn.edu.hust.homestay.payment.gateway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.payment.entity.Payment;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Triển khai cổng thanh toán VNPay API v2.1.0 (Sandbox / Production) theo Strategy Pattern.
 * Hỗ trợ đầy đủ 3 luồng chuẩn VNPay:
 * - Tạo URL thanh toán redirect (vnp_Command=pay, ký HMAC-SHA512)
 * - Truy vấn kết quả giao dịch server-to-server (vnp_Command=querydr, chuỗi pipe-delimited)
 * - Hoàn tiền tự động toàn phần "02" / một phần "03" (vnp_Command=refund, chuỗi pipe-delimited)
 * - Xác thực chữ ký HMAC-SHA512 cho Return URL và IPN Webhook (GET /api/v1/public/payments/vnpay/ipn)
 */
@Component
public class VnPayPaymentGateway implements OnlinePaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(VnPayPaymentGateway.class);

    public static final String PROVIDER_CODE = "VNPAY";
    private static final String VNP_VERSION = "2.1.0";
    private static final String HMAC_SHA512 = "HmacSHA512";
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter VNP_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final Pattern ORDER_TIMESTAMP_PATTERN = Pattern.compile("_(\\d{14})_");

    private final VnPayProperties properties;
    private final ObjectMapper objectMapper;
    private volatile HttpClient httpClient;

    public VnPayPaymentGateway(VnPayProperties properties) {
        this.properties = properties;
        this.objectMapper = new ObjectMapper();
    }

    /** Khởi tạo lười HttpClient kết hợp kho chứng chỉ JDK + Windows-ROOT để xác thực TLS ổn định với VNPay Sandbox. */
    private HttpClient getHttpClient() {
        HttpClient current = this.httpClient;
        if (current == null) {
            synchronized (this) {
                current = this.httpClient;
                if (current == null) {
                    current = HttpClient.newBuilder()
                            .sslContext(GatewaySslSupport.createSslContext())
                            .connectTimeout(Duration.ofMillis(Math.max(1000, properties.getConnectTimeoutMs())))
                            .build();
                    this.httpClient = current;
                }
            }
        }
        return current;
    }

    @Override
    public String getProviderCode() {
        return PROVIDER_CODE;
    }

    @Override
    public Payment.PaymentMethod getSupportedMethod() {
        return Payment.PaymentMethod.VNPAY;
    }

    @Override
    public GatewayCreateResult createDepositPayment(GatewayCreateCommand command) {
        ensureConfigured();

        // Tách bỏ query string khỏi ReturnUrl để tránh lỗi trùng dấu "?" khi VNPay tự gắn ?vnp_Amount=...
        String cleanReturnUrl = stripQueryString(command.redirectUrl());
        String createDate = extractVietnamTimestamp(command.providerOrderId());
        LocalDateTime createLdt = LocalDateTime.parse(createDate, VNP_DATE_FORMAT);
        String expireDate = createLdt.plusMinutes(15).format(VNP_DATE_FORMAT);

        // VNPay yêu cầu số tiền nhân 100 (không có phần thập phân)
        long vnpAmount = Math.multiplyExact(command.amount(), 100L);
        String orderInfo = sanitizeAscii(command.orderInfo(), "Dat coc homestay");

        TreeMap<String, String> params = new TreeMap<>();
        params.put("vnp_Version", VNP_VERSION);
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", properties.getTmnCode().trim());
        params.put("vnp_Amount", String.valueOf(vnpAmount));
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", command.providerOrderId());
        params.put("vnp_OrderInfo", orderInfo);
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", cleanReturnUrl);
        params.put("vnp_IpAddr", resolveIpAddr());
        params.put("vnp_CreateDate", createDate);
        params.put("vnp_ExpireDate", expireDate);

        String hashData = buildSignedQueryString(params);
        String secureHash = hmacSha512Hex(properties.getHashSecret().trim(), hashData);
        String fullPayUrl = properties.getPayUrl().trim() + "?" + hashData + "&vnp_SecureHash=" + secureHash;

        return new GatewayCreateResult(command.providerOrderId(), fullPayUrl, 0, "Khởi tạo liên kết VNPay thành công");
    }

    @Override
    public GatewayQueryResult queryPayment(String providerOrderId) {
        ensureConfigured();

        String requestId = generateRequestId();
        String tmnCode = properties.getTmnCode().trim();
        String transactionDate = extractVietnamTimestamp(providerOrderId);
        String createDate = LocalDateTime.now(VN_ZONE).format(VNP_DATE_FORMAT);
        String ipAddr = resolveIpAddr();
        String orderInfo = sanitizeAscii("Kiem tra giao dich " + providerOrderId, "Kiem tra giao dich");

        // Thứ tự nối dấu ống (|) bắt buộc của VNPay API v2.1.0 querydr
        String hashData = String.join("|",
                requestId,
                VNP_VERSION,
                "querydr",
                tmnCode,
                providerOrderId,
                transactionDate,
                createDate,
                ipAddr,
                orderInfo
        );
        String secureHash = hmacSha512Hex(properties.getHashSecret().trim(), hashData);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("vnp_RequestId", requestId);
        body.put("vnp_Version", VNP_VERSION);
        body.put("vnp_Command", "querydr");
        body.put("vnp_TmnCode", tmnCode);
        body.put("vnp_TxnRef", providerOrderId);
        body.put("vnp_TransactionDate", transactionDate);
        body.put("vnp_CreateDate", createDate);
        body.put("vnp_IpAddr", ipAddr);
        body.put("vnp_OrderInfo", orderInfo);
        body.put("vnp_SecureHash", secureHash);

        JsonNode response = postJson(body);
        String responseCode = response.path("vnp_ResponseCode").asText("");
        String transactionStatus = response.path("vnp_TransactionStatus").asText("");
        String message = response.path("vnp_Message").asText("");
        String transactionNo = normalizeTransNo(response.path("vnp_TransactionNo").asText(""));
        Long vndAmount = parseVndAmount(response.path("vnp_Amount").asText(""));

        if (!"00".equals(responseCode)) {
            log.warn("VNPay querydr trả mã lỗi cho txnRef={}: responseCode={}, message={}",
                    providerOrderId, responseCode, message);
            // Mã 08 (bảo trì) hoặc 99 (lỗi hệ thống VNPay) -> không đánh dấu REJECTED oan cho giao dịch của khách
            if ("08".equals(responseCode) || "99".equals(responseCode)) {
                String detail = message.isBlank() ? mapVnPayRefundCodeMessage(responseCode) : message;
                throw new BusinessException(
                        "PAYMENT_GATEWAY_ERROR",
                        "Hệ thống tra cứu VNPay đang gặp sự cố (mã " + responseCode + "): " + detail,
                        HttpStatus.BAD_GATEWAY
                );
            }
            // Mã 91 = không tìm thấy giao dịch (thường gặp khi khách vừa mở link nhưng chưa bấm thanh toán)
            GatewayTxState state = "91".equals(responseCode) ? GatewayTxState.PENDING : GatewayTxState.FAILED;
            return new GatewayQueryResult(
                    providerOrderId,
                    parseCodeInt(responseCode),
                    transactionNo,
                    vndAmount,
                    message.isBlank() ? mapVnPayRefundCodeMessage(responseCode) : message,
                    state
            );
        }

        GatewayTxState state = mapVnPayTransactionStatus(transactionStatus);
        String displayMessage = message.isBlank() ? mapVnPayStatusMessage(transactionStatus) : message;
        return new GatewayQueryResult(
                providerOrderId,
                parseCodeInt(transactionStatus),
                transactionNo,
                vndAmount,
                displayMessage,
                state
        );
    }

    @Override
    public Optional<GatewayQueryResult> verifySignedReturnParams(String providerOrderId, Map<String, String> params) {
        if (params == null || params.isEmpty()) {
            return Optional.empty();
        }
        if (!verifyVnPayParamsSignature(params)) {
            return Optional.empty();
        }
        String tmnCode = safe(params.get("vnp_TmnCode")).trim();
        if (!properties.getTmnCode().trim().equals(tmnCode)) {
            return Optional.empty();
        }
        String txnRef = safe(params.get("vnp_TxnRef")).trim();
        if (!providerOrderId.equals(txnRef)) {
            return Optional.empty();
        }

        String responseCode = safe(params.get("vnp_ResponseCode")).trim();
        String txStatus = safe(params.get("vnp_TransactionStatus")).trim();
        String transNo = normalizeTransNo(params.get("vnp_TransactionNo"));
        Long vndAmount = parseVndAmount(params.get("vnp_Amount"));

        GatewayTxState state;
        if ("00".equals(responseCode) && (txStatus.isEmpty() || "00".equals(txStatus))) {
            state = GatewayTxState.SUCCEEDED;
        } else if ("01".equals(txStatus)) {
            state = GatewayTxState.PENDING;
        } else {
            state = GatewayTxState.FAILED;
        }

        return Optional.of(new GatewayQueryResult(
                providerOrderId,
                parseCodeInt(responseCode),
                transNo,
                vndAmount,
                mapVnPayCodeMessage(responseCode),
                state
        ));
    }

    @Override
    public GatewayRefundResult refundPayment(GatewayRefundCommand command) {
        ensureConfigured();

        // Dùng chính requestId truyền từ Service (Alphanumeric[1,32]) làm vnp_RequestId để đối soát 1-1 với payments.provider_order_id
        String requestId = sanitizeAlphanumeric(command.requestId(), generateRequestId(), 32);
        String tmnCode = properties.getTmnCode().trim();
        // "02" = hoàn tiền toàn phần (100%), "03" = hoàn tiền một phần (ví dụ 50%)
        String transactionType = (command.originalDepositAmount() > 0 && command.amount() < command.originalDepositAmount())
                ? "03"
                : "02";
        String originalTxnRef = safe(command.originalProviderOrderId()).trim();
        if (originalTxnRef.isEmpty()) {
            throw BusinessException.badRequest(
                    "ORIGINAL_DEPOSIT_TRANSACTION_MISSING",
                    "Thiếu mã đơn đặt cọc VNPay gốc (provider_order_id) để thực hiện hoàn tiền tự động");
        }

        long vnpAmount = Math.multiplyExact(command.amount(), 100L);
        String transactionNo = normalizeTransNo(command.originalProviderTransId());
        if (transactionNo == null) {
            transactionNo = "0";
        }
        String transactionDate = extractVietnamTimestamp(originalTxnRef);
        String createBy = sanitizeAlphanumeric(command.createdBy(), "manager", 245);
        String createDate = LocalDateTime.now(VN_ZONE).format(VNP_DATE_FORMAT);
        String ipAddr = resolveIpAddr();
        String orderInfo = sanitizeAscii(command.description(), "Hoan tien dat coc " + originalTxnRef);

        // Thứ tự nối dấu ống (|) bắt buộc theo tài liệu đặc tả VNPay API v2.1.0 mục 2.5.5.1
        String hashData = String.join("|",
                requestId,
                VNP_VERSION,
                "refund",
                tmnCode,
                transactionType,
                originalTxnRef,
                String.valueOf(vnpAmount),
                transactionNo,
                transactionDate,
                createBy,
                createDate,
                ipAddr,
                orderInfo
        );
        String secureHash = hmacSha512Hex(properties.getHashSecret().trim(), hashData);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("vnp_RequestId", requestId);
        body.put("vnp_Version", VNP_VERSION);
        body.put("vnp_Command", "refund");
        body.put("vnp_TmnCode", tmnCode);
        body.put("vnp_TransactionType", transactionType);
        body.put("vnp_TxnRef", originalTxnRef);
        body.put("vnp_Amount", String.valueOf(vnpAmount));
        body.put("vnp_TransactionNo", transactionNo);
        body.put("vnp_TransactionDate", transactionDate);
        body.put("vnp_CreateBy", createBy);
        body.put("vnp_CreateDate", createDate);
        body.put("vnp_IpAddr", ipAddr);
        body.put("vnp_OrderInfo", orderInfo);
        body.put("vnp_SecureHash", secureHash);

        JsonNode response = postJson(body);
        String responseCode = response.path("vnp_ResponseCode").asText("").trim();
        String message = response.path("vnp_Message").asText("").trim();
        String refundTransNo = normalizeTransNo(response.path("vnp_TransactionNo").asText(""));
        String transactionStatus = response.path("vnp_TransactionStatus").asText("").trim();

        if (!"00".equals(responseCode)) {
            String detail = message.isBlank() ? mapVnPayRefundCodeMessage(responseCode) : message;
            log.warn("VNPay refund thất bại cho requestId={}, txnRef={}, amount={}: responseCode={}, message={}",
                    requestId, originalTxnRef, command.amount(), responseCode, detail);
            throw new BusinessException(
                    "PAYMENT_GATEWAY_ERROR",
                    "Hoàn tiền qua cổng VNPay không thành công (mã lỗi " + responseCode + "): " + detail,
                    HttpStatus.BAD_GATEWAY
            );
        }

        // Xác thực chữ ký response nếu VNPay trả về vnp_SecureHash (mục 2.5.5.2 tài liệu v2.1.0)
        if (!verifyRefundResponseSignature(response)) {
            log.warn("VNPay refund trả về chữ ký vnp_SecureHash không khớp cho requestId={}, txnRef={}", requestId, originalTxnRef);
            throw new BusinessException(
                    "INVALID_PAYMENT_SIGNATURE",
                    "Chữ ký phản hồi hoàn tiền từ cổng VNPay không hợp lệ",
                    HttpStatus.BAD_GATEWAY
            );
        }

        // Theo mục 2.5.7.2: vnp_TransactionStatus = "09" (từ chối hoàn) hoặc "02" (lỗi) thì không xác nhận hoàn thành công
        if ("09".equals(transactionStatus) || "02".equals(transactionStatus)) {
            log.warn("VNPay refund từ chối ở trạng thái giao dịch cho requestId={}, txnRef={}: transactionStatus={}",
                    requestId, originalTxnRef, transactionStatus);
            throw new BusinessException(
                    "PAYMENT_GATEWAY_ERROR",
                    "Yêu cầu hoàn tiền bị VNPay từ chối xử lý (trạng thái " + transactionStatus + ")",
                    HttpStatus.BAD_GATEWAY
            );
        }

        String finalRefundTransId = refundTransNo != null ? refundTransNo : requestId;
        String okMessage = message.isBlank() ? "Yêu cầu hoàn tiền VNPay đã được tiếp nhận thành công" : message;
        return new GatewayRefundResult(requestId, finalRefundTransId, 0, okMessage);
    }

    /**
     * Xác thực chữ ký HMAC-SHA512 của gói tin phản hồi refund từ VNPay (mục 2.5.5.2 tài liệu đặc tả v2.1.0).
     * Nếu trường vnp_SecureHash không có trong phản hồi (trường tùy chọn theo đặc tả), mặc định cho qua.
     */
    public boolean verifyRefundResponseSignature(JsonNode response) {
        if (response == null) {
            return false;
        }
        String receivedHash = response.path("vnp_SecureHash").asText("").trim();
        if (receivedHash.isEmpty()) {
            return true;
        }
        if (safe(properties.getHashSecret()).isBlank()) {
            return false;
        }
        String hashData = String.join("|",
                response.path("vnp_ResponseId").asText(""),
                response.path("vnp_Command").asText(""),
                response.path("vnp_ResponseCode").asText(""),
                response.path("vnp_Message").asText(""),
                response.path("vnp_TmnCode").asText(""),
                response.path("vnp_TxnRef").asText(""),
                response.path("vnp_Amount").asText(""),
                response.path("vnp_BankCode").asText(""),
                response.path("vnp_PayDate").asText(""),
                response.path("vnp_TransactionNo").asText(""),
                response.path("vnp_TransactionType").asText(""),
                response.path("vnp_TransactionStatus").asText(""),
                response.path("vnp_OrderInfo").asText("")
        );
        String computedHash = hmacSha512Hex(properties.getHashSecret().trim(), hashData);
        return MessageDigest.isEqual(
                computedHash.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8),
                receivedHash.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8)
        );
    }

    /** Xác thực chữ ký HMAC-SHA512 của bộ query params vnp_* (dùng chung cho cả GET IPN và Return URL). */
    public boolean verifyVnPayParamsSignature(Map<String, String> rawParams) {
        if (rawParams == null || rawParams.isEmpty()) {
            return false;
        }
        String receivedHash = safe(rawParams.get("vnp_SecureHash")).trim();
        if (receivedHash.isEmpty() || safe(properties.getHashSecret()).isBlank()) {
            return false;
        }

        TreeMap<String, String> sorted = new TreeMap<>();
        for (Map.Entry<String, String> entry : rawParams.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();
            if (key == null || !key.startsWith("vnp_")) {
                continue;
            }
            if ("vnp_SecureHash".equals(key) || "vnp_SecureHashType".equals(key)) {
                continue;
            }
            if (value != null && !value.isEmpty()) {
                sorted.put(key, value);
            }
        }
        if (sorted.isEmpty()) {
            return false;
        }

        String hashData = buildSignedQueryString(sorted);
        String computedHash = hmacSha512Hex(properties.getHashSecret().trim(), hashData);
        return MessageDigest.isEqual(
                computedHash.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8),
                receivedHash.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8)
        );
    }

    /** Trích xuất mốc thời gian yyyyMMddHHmmss (GMT+7) đã nhúng trong provider_order_id để dùng chính xác cho vnp_CreateDate / vnp_TransactionDate. */
    public static String extractVietnamTimestamp(String providerOrderId) {
        if (providerOrderId != null) {
            Matcher matcher = ORDER_TIMESTAMP_PATTERN.matcher(providerOrderId);
            if (matcher.find()) {
                return matcher.group(1);
            }
        }
        return LocalDateTime.now(VN_ZONE).format(VNP_DATE_FORMAT);
    }

    /** Ghép tham số đã sắp xếp alphabet và URL-encode theo chuẩn Java VNPay 2.1.0. */
    public static String buildSignedQueryString(TreeMap<String, String> sortedParams) {
        StringBuilder sb = new StringBuilder();
        boolean first = true;
        for (Map.Entry<String, String> entry : sortedParams.entrySet()) {
            if (entry.getValue() == null || entry.getValue().isEmpty()) {
                continue;
            }
            if (!first) {
                sb.append('&');
            }
            first = false;
            sb.append(URLEncoder.encode(entry.getKey(), StandardCharsets.US_ASCII))
                    .append('=')
                    .append(URLEncoder.encode(entry.getValue(), StandardCharsets.US_ASCII));
        }
        return sb.toString();
    }

    /** Tính mã băm HMAC-SHA512 hex chữ thường theo chuẩn VNPay 2.1.0. */
    public static String hmacSha512Hex(String secretKey, String data) {
        try {
            Mac hmac512 = Mac.getInstance(HMAC_SHA512);
            SecretKeySpec keySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), HMAC_SHA512);
            hmac512.init(keySpec);
            byte[] digest = hmac512.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(String.format("%02x", b & 0xff));
            }
            return hex.toString();
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Không thể ký chữ ký HMAC-SHA512 cho VNPay", exception);
        }
    }

    private void ensureConfigured() {
        if (safe(properties.getTmnCode()).isBlank() || safe(properties.getHashSecret()).isBlank()) {
            throw BusinessException.badRequest(
                    "PAYMENT_GATEWAY_NOT_CONFIGURED",
                    "Chưa cấu hình VNPAY_TMN_CODE và VNPAY_HASH_SECRET trong file .env. "
                            + "Vui lòng đăng ký miễn phí tại https://sandbox.vnpayment.vn/devreg/ rồi điền vào .env và khởi động lại backend."
            );
        }
    }

    private JsonNode postJson(Map<String, Object> body) {
        String url = safe(properties.getApiUrl()).trim();
        try {
            String requestJson = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofMillis(Math.max(1000, properties.getReadTimeoutMs())))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = getHttpClient().send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            int statusCode = response.statusCode();
            String responseBody = response.body();
            if (statusCode >= 400) {
                log.warn("VNPay API ({}) trả mã HTTP {}: {}", url, statusCode,
                        responseBody == null ? "" : responseBody.substring(0, Math.min(200, responseBody.length())).replace('\n', ' '));
                throw new BusinessException(
                        "PAYMENT_GATEWAY_ERROR",
                        "Cổng thanh toán VNPay đang báo lỗi hệ thống (HTTP " + statusCode + "). "
                                + "Trên môi trường Sandbox, API hoàn tiền/truy vấn có thể đang bị khóa quyền mặc định hoặc bảo trì phía VNPay.",
                        HttpStatus.BAD_GATEWAY
                );
            }
            if (responseBody == null || responseBody.isBlank()) {
                throw new BusinessException(
                        "PAYMENT_GATEWAY_ERROR",
                        "Cổng thanh toán VNPay không trả về dữ liệu (HTTP " + statusCode + ")",
                        HttpStatus.BAD_GATEWAY
                );
            }
            if (!responseBody.trim().startsWith("{")) {
                log.warn("VNPay API ({}) trả phản hồi không phải JSON (HTTP {}): {}", url, statusCode,
                        responseBody.substring(0, Math.min(200, responseBody.length())).replace('\n', ' '));
                throw new BusinessException(
                        "PAYMENT_GATEWAY_ERROR",
                        "Cổng thanh toán VNPay trả về định dạng không hợp lệ (HTTP " + statusCode + ")",
                        HttpStatus.BAD_GATEWAY
                );
            }
            return objectMapper.readTree(responseBody);
        } catch (BusinessException exception) {
            throw exception;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new BusinessException(
                    "PAYMENT_GATEWAY_ERROR",
                    "Kết nối tới cổng thanh toán VNPay bị gián đoạn",
                    HttpStatus.BAD_GATEWAY
            );
        } catch (IOException exception) {
            log.error("Lỗi kết nối HTTP tới VNPay ({}): {} - {}", url, exception.getClass().getSimpleName(), exception.getMessage());
            throw new BusinessException(
                    "PAYMENT_GATEWAY_ERROR",
                    "Không thể kết nối tới cổng thanh toán VNPay. Vui lòng thử lại sau.",
                    HttpStatus.BAD_GATEWAY
            );
        }
    }

    private static GatewayTxState mapVnPayTransactionStatus(String txStatus) {
        if ("00".equals(txStatus)) {
            return GatewayTxState.SUCCEEDED;
        }
        if ("01".equals(txStatus)) {
            return GatewayTxState.PENDING;
        }
        return GatewayTxState.FAILED;
    }

    public static String mapVnPayCodeMessage(String code) {
        return switch (safe(code)) {
            case "00" -> "Thanh toán VNPay thành công.";
            case "07" -> "Giao dịch bị nghi ngờ gian lận trên VNPay.";
            case "09" -> "Thẻ/tài khoản chưa đăng ký dịch vụ Internet Banking.";
            case "10" -> "Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.";
            case "11" -> "Đã hết hạn chờ thanh toán trên cổng VNPay.";
            case "12" -> "Thẻ/tài khoản đang bị khóa.";
            case "13" -> "Mã xác thực OTP không chính xác.";
            case "24" -> "Khách hàng đã hủy giao dịch thanh toán trên VNPay.";
            case "51" -> "Tài khoản không đủ số dư để thực hiện giao dịch.";
            case "65" -> "Tài khoản đã vượt quá hạn mức giao dịch trong ngày.";
            case "75" -> "Ngân hàng thanh toán đang bảo trì.";
            case "79" -> "Nhập sai mật khẩu thanh toán quá số lần quy định.";
            case "91" -> "Giao dịch chưa được hoàn tất trên cổng VNPay.";
            default -> "Giao dịch VNPay không thành công (mã " + safe(code) + ").";
        };
    }

    /** Bảng mã lỗi chuẩn theo mục 2.5.7.1 tài liệu đặc tả VNPay v2.1.0 cho API refund / querydr. */
    public static String mapVnPayRefundCodeMessage(String code) {
        return switch (safe(code)) {
            case "00" -> "Yêu cầu hoàn tiền thành công.";
            case "02" -> "Mã định danh kết nối (vnp_TmnCode) không hợp lệ.";
            case "03" -> "Dữ liệu gửi sang VNPay không đúng định dạng.";
            case "08" -> "Hệ thống VNPay đang bảo trì.";
            case "16" -> "Không thực hiện được hoàn tiền trong thời gian này.";
            case "91" -> "Không tìm thấy giao dịch gốc yêu cầu hoàn trả trên VNPay.";
            case "93" -> "Số tiền hoàn trả không hợp lệ (phải nhỏ hơn hoặc bằng số tiền đã thanh toán).";
            case "94" -> "Giao dịch đã được gửi yêu cầu hoàn tiền trước đó và đang được VNPay xử lý.";
            case "95" -> "Giao dịch gốc không thành công bên VNPay nên bị từ chối hoàn trả.";
            case "97" -> "Chữ ký kiểm tra (vnp_SecureHash) không hợp lệ.";
            case "99" -> "Lỗi hệ thống từ phía VNPay (mã 99).";
            default -> "Yêu cầu hoàn tiền VNPay không thành công (mã " + safe(code) + ").";
        };
    }

    private static String mapVnPayStatusMessage(String txStatus) {
        return switch (safe(txStatus)) {
            case "00" -> "Giao dịch VNPay đã thanh toán thành công.";
            case "01" -> "Giao dịch chưa hoàn tất trên cổng VNPay.";
            default -> "Giao dịch VNPay thất bại hoặc đã bị hủy (trạng thái " + safe(txStatus) + ").";
        };
    }

    private static Long parseVndAmount(String rawAmount) {
        if (rawAmount == null || rawAmount.isBlank()) {
            return null;
        }
        try {
            long scaled = Long.parseLong(rawAmount.trim());
            return scaled / 100L;
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private static int parseCodeInt(String code) {
        try {
            return Integer.parseInt(safe(code).trim());
        } catch (NumberFormatException exception) {
            return -1;
        }
    }

    private static String normalizeTransNo(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty() || "0".equals(trimmed)) {
            return null;
        }
        return trimmed;
    }

    private static String stripQueryString(String url) {
        if (url == null) {
            return "";
        }
        int idx = url.indexOf('?');
        return idx >= 0 ? url.substring(0, idx) : url;
    }

    private static String sanitizeAlphanumeric(String raw, String fallback, int maxLength) {
        if (raw == null || raw.isBlank()) {
            return fallback;
        }
        String normalized = Normalizer.normalize(raw, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .replaceAll("[^A-Za-z0-9]", "");
        if (normalized.isEmpty()) {
            return fallback;
        }
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength);
    }

    private static String sanitizeAscii(String raw, String fallback) {
        if (raw == null || raw.isBlank()) {
            return fallback;
        }
        String normalized = Normalizer.normalize(raw, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .replaceAll("[^A-Za-z0-9 _.-]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return normalized.isEmpty() ? fallback : normalized;
    }

    private String resolveIpAddr() {
        String ip = safe(properties.getIpAddr()).trim();
        return ip.isEmpty() ? "127.0.0.1" : ip;
    }

    private static String generateRequestId() {
        String rand = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
        return LocalDateTime.now(VN_ZONE).format(VNP_DATE_FORMAT) + rand;
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }
}
