package vn.edu.hust.homestay.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

import java.time.Instant;

/**
 * Envelope chuẩn cho mọi API response.
 * Thành công: { "success": true, "data": {...}, "meta": null }
 * Lỗi:       { "success": false, "error": {...}, "timestamp": "...", "path": "..." }
 */
@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final boolean success;
    private final T data;
    private final Object meta;
    private final ErrorPayload error;
    private final String timestamp;
    private final String path;

    // ── success ─────────────────────────────────────────────────
    private ApiResponse(T data, Object meta) {
        this.success   = true;
        this.data      = data;
        this.meta      = meta;
        this.error     = null;
        this.timestamp = null;
        this.path      = null;
    }

    // ── error ────────────────────────────────────────────────────
    private ApiResponse(ErrorPayload error, String path) {
        this.success   = false;
        this.data      = null;
        this.meta      = null;
        this.error     = error;
        this.timestamp = Instant.now().toString();
        this.path      = path;
    }

    // ── factory methods ──────────────────────────────────────────
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(data, null);
    }

    public static <T> ApiResponse<T> ok(T data, Object meta) {
        return new ApiResponse<>(data, meta);
    }

    public static <T> ApiResponse<T> error(String code, String message, String path) {
        return new ApiResponse<>(new ErrorPayload(code, message), path);
    }

    // ── inner: error payload ─────────────────────────────────────
    @Getter
    public static class ErrorPayload {
        private final String code;
        private final String message;

        public ErrorPayload(String code, String message) {
            this.code    = code;
            this.message = message;
        }
    }
}
