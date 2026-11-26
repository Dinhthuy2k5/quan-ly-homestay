package vn.edu.hust.homestay.payment.gateway;

import org.springframework.stereotype.Component;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.payment.entity.Payment;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Bộ định tuyến Strategy Pattern: ánh xạ mã provider ("VNPAY") hoặc PaymentMethod sang cổng thanh toán tương ứng.
 * Khi cần bổ sung cổng thanh toán mới, chỉ cần tạo @Component implement OnlinePaymentGateway.
 */
@Component
public class PaymentGatewayRegistry {

    private final Map<String, OnlinePaymentGateway> byProviderCode = new HashMap<>();
    private final Map<Payment.PaymentMethod, OnlinePaymentGateway> byMethod = new EnumMap<>(Payment.PaymentMethod.class);

    public PaymentGatewayRegistry(List<OnlinePaymentGateway> gateways) {
        for (OnlinePaymentGateway gateway : gateways) {
            byProviderCode.put(gateway.getProviderCode().toUpperCase(Locale.ROOT), gateway);
            byMethod.put(gateway.getSupportedMethod(), gateway);
        }
    }

    public OnlinePaymentGateway resolveByProvider(String provider) {
        String normalized = provider == null ? "" : provider.trim().toUpperCase(Locale.ROOT);
        OnlinePaymentGateway gateway = byProviderCode.get(normalized);
        if (gateway == null) {
            throw BusinessException.badRequest(
                    "UNSUPPORTED_PAYMENT_PROVIDER",
                    "Cổng thanh toán không được hỗ trợ: " + (normalized.isEmpty() ? "(trống)" : normalized)
            );
        }
        return gateway;
    }

    public Optional<OnlinePaymentGateway> resolveByMethod(Payment.PaymentMethod method) {
        if (method == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(byMethod.get(method));
    }
}
