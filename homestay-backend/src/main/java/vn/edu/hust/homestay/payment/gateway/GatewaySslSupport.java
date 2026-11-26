package vn.edu.hust.homestay.payment.gateway;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.TrustManagerFactory;
import javax.net.ssl.X509TrustManager;
import java.security.KeyStore;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Tiện ích khởi tạo SSLContext kết hợp kho chứng chỉ mặc định của JDK (cacerts)
 * với kho chứng chỉ tin cậy của hệ điều hành Windows (Windows-ROOT / SunMSCAPI).
 *
 * Mục đích: giữ nguyên kiểm tra chứng chỉ TLS chặt chẽ (tuyệt đối không tắt xác thực SSL),
 * đồng thời xử lý trường hợp cổng thanh toán (ví dụ sandbox.vnpayment.vn dùng ZeroSSL / Sectigo Root R46)
 * đã được Windows tin cậy nhưng chưa có sẵn trong file cacerts của JDK cũ hơn.
 */
final class GatewaySslSupport {

    private static final Logger log = LoggerFactory.getLogger(GatewaySslSupport.class);

    private GatewaySslSupport() {}

    static SSLContext createSslContext() {
        try {
            List<X509TrustManager> trustManagers = new ArrayList<>();

            // 1. Kho chứng chỉ mặc định của JVM (cacerts)
            X509TrustManager jvmTrustManager = loadTrustManager(null);
            if (jvmTrustManager != null) {
                trustManagers.add(jvmTrustManager);
            }

            // 2. Kho chứng chỉ Root của Windows (chỉ nạp khi chạy trên Windows có SunMSCAPI)
            X509TrustManager windowsTrustManager = loadWindowsRootTrustManager();
            if (windowsTrustManager != null) {
                trustManagers.add(windowsTrustManager);
            }

            if (trustManagers.isEmpty()) {
                return SSLContext.getDefault();
            }

            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, new TrustManager[]{new CompositeX509TrustManager(trustManagers)}, null);
            return sslContext;
        } catch (Exception exception) {
            log.warn("Không thể khởi tạo Composite SSLContext, quay về SSLContext mặc định của JVM: {}", exception.getMessage());
            try {
                return SSLContext.getDefault();
            } catch (Exception fallbackException) {
                throw new IllegalStateException("Không thể khởi tạo SSLContext mặc định", fallbackException);
            }
        }
    }

    private static X509TrustManager loadWindowsRootTrustManager() {
        try {
            KeyStore windowsRoot = KeyStore.getInstance("Windows-ROOT");
            windowsRoot.load(null, null);
            return loadTrustManager(windowsRoot);
        } catch (Exception ignored) {
            // Không chạy trên Windows hoặc môi trường không hỗ trợ SunMSCAPI -> bỏ qua an toàn
            return null;
        }
    }

    private static X509TrustManager loadTrustManager(KeyStore keyStore) throws Exception {
        TrustManagerFactory factory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        factory.init(keyStore);
        for (TrustManager tm : factory.getTrustManagers()) {
            if (tm instanceof X509TrustManager x509) {
                return x509;
            }
        }
        return null;
    }

    /** Duyệt lần lượt các TrustManager hợp lệ; chỉ chấp nhận nếu ít nhất một kho tin cậy xác thực thành công chuỗi X.509. */
    private static final class CompositeX509TrustManager implements X509TrustManager {
        private final List<X509TrustManager> delegates;

        private CompositeX509TrustManager(List<X509TrustManager> delegates) {
            this.delegates = delegates;
        }

        @Override
        public void checkClientTrusted(X509Certificate[] chain, String authType) throws CertificateException {
            CertificateException lastError = null;
            for (X509TrustManager delegate : delegates) {
                try {
                    delegate.checkClientTrusted(chain, authType);
                    return;
                } catch (CertificateException exception) {
                    lastError = exception;
                }
            }
            if (lastError != null) {
                throw lastError;
            }
        }

        @Override
        public void checkServerTrusted(X509Certificate[] chain, String authType) throws CertificateException {
            CertificateException lastError = null;
            for (X509TrustManager delegate : delegates) {
                try {
                    delegate.checkServerTrusted(chain, authType);
                    return;
                } catch (CertificateException exception) {
                    lastError = exception;
                }
            }
            if (lastError != null) {
                throw lastError;
            }
        }

        @Override
        public X509Certificate[] getAcceptedIssuers() {
            List<X509Certificate> issuers = new ArrayList<>();
            for (X509TrustManager delegate : delegates) {
                X509Certificate[] certs = delegate.getAcceptedIssuers();
                if (certs != null) {
                    issuers.addAll(Arrays.asList(certs));
                }
            }
            return issuers.toArray(new X509Certificate[0]);
        }
    }
}
