package vn.edu.hust.homestay.auth.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Tiện ích băm và tạo token ngẫu nhiên bảo mật.
 * Quy định CSDL v6: Lưu SHA-256 hash của token, không lưu token gốc.
 * Ngày thực hiện: 18/10/2026
 */
public final class TokenHashUtil {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private TokenHashUtil() {
    }

    /**
     * Tạo một chuỗi ngẫu nhiên bảo mật độ dài cao cho refresh token hoặc reset token.
     */
    public static String generateSecureToken() {
        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    /**
     * Băm chuỗi token thành mã SHA-256 gồm đúng 64 ký tự hex viết thường.
     */
    public static String hashToken(String rawToken) {
        if (rawToken == null) {
            return null;
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Thuật toán SHA-256 không khả dụng trên JVM", e);
        }
    }
}
