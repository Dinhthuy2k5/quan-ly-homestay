package vn.edu.hust.homestay.common.exception;

import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import vn.edu.hust.homestay.common.response.ApiResponse;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** Lỗi nghiệp vụ có mã lỗi cụ thể */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException ex,
                                                             HttpServletRequest req) {
        log.warn("Business error [{}]: {}", ex.getCode(), ex.getMessage());
        return ResponseEntity
                .status(ex.getStatus())
                .body(ApiResponse.error(ex.getCode(), ex.getMessage(), req.getRequestURI()));
    }

    /** Bean Validation thất bại (@Valid) */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex,
                                                               HttpServletRequest req) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error("VALIDATION_ERROR", message, req.getRequestURI()));
    }

    /** Lỗi định dạng dữ liệu trong request body (ví dụ truyền chuỗi chữ vào trường số) */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleMessageNotReadable(HttpMessageNotReadableException ex,
                                                                       HttpServletRequest req) {
        log.warn("Malformed JSON or type mismatch at {}: {}", req.getRequestURI(), ex.getMessage());
        String message = "Dữ liệu yêu cầu không hợp lệ hoặc sai định dạng";

        String extractedField = null;
        if (ex.getCause() instanceof com.fasterxml.jackson.databind.JsonMappingException jme) {
            extractedField = jme.getPath().stream()
                    .map(ref -> ref.getFieldName() != null ? ref.getFieldName() : "")
                    .filter(s -> !s.isBlank())
                    .collect(Collectors.joining("."));
        }
        if ((extractedField == null || extractedField.isBlank()) && ex.getMessage() != null) {
            java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("\\[\"([^\"]+)\"\\]").matcher(ex.getMessage());
            if (matcher.find()) {
                extractedField = matcher.group(1);
            }
        }

        if (extractedField != null && !extractedField.isBlank()) {
            message = "Trường '" + extractedField + "' có định dạng không hợp lệ, phải là số";
        } else if (ex.getMessage() != null && (ex.getMessage().contains("java.lang.Long") || ex.getMessage().contains("Long"))) {
            message = "Dữ liệu trường số không hợp lệ (unitPrice hoặc mã ID phải là số nguyên)";
        }

        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error("VALIDATION_ERROR", message, req.getRequestURI()));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleUploadTooLarge(MaxUploadSizeExceededException ex,
                                                                    HttpServletRequest req) {
        return ResponseEntity
                .status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(ApiResponse.error("FILE_TOO_LARGE", "Tệp không được vượt quá 5 MB", req.getRequestURI()));
    }

    /** Mọi lỗi không xử lý được */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneral(Exception ex,
                                                            HttpServletRequest req) {
        log.error("Unhandled exception at {}: {}", req.getRequestURI(), ex.getMessage(), ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("INTERNAL_ERROR", "Đã xảy ra lỗi hệ thống", req.getRequestURI()));
    }
}
