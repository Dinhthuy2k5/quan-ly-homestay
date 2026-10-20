package vn.edu.hust.homestay.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Ngoại lệ nghiệp vụ có mã lỗi cố định và HTTP status phù hợp.
 * Dùng các factory method hoặc subclass cụ thể để tạo.
 */
public class BusinessException extends RuntimeException {

    private final String code;
    private final HttpStatus status;

    public BusinessException(String code, String message, HttpStatus status) {
        super(message);
        this.code   = code;
        this.status = status;
    }

    public String getCode()       { return code; }
    public HttpStatus getStatus() { return status; }

    // ── factory methods thông dụng ───────────────────────────────
    public static BusinessException notFound(String code, String message) {
        return new BusinessException(code, message, HttpStatus.NOT_FOUND);
    }

    public static BusinessException conflict(String code, String message) {
        return new BusinessException(code, message, HttpStatus.CONFLICT);
    }

    public static BusinessException forbidden(String code, String message) {
        return new BusinessException(code, message, HttpStatus.FORBIDDEN);
    }

    public static BusinessException badRequest(String code, String message) {
        return new BusinessException(code, message, HttpStatus.BAD_REQUEST);
    }

    public static BusinessException unauthorized(String code, String message) {
        return new BusinessException(code, message, HttpStatus.UNAUTHORIZED);
    }
}
