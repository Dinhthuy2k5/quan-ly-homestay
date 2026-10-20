package vn.edu.hust.homestay.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import vn.edu.hust.homestay.common.response.ApiResponse;

import java.io.IOException;

/**
 * Xử lý trả về mã lỗi 403 FORBIDDEN chuẩn ApiResponse khi tài khoản không đủ quyền thực hiện thao tác.
 * Ngày thực hiện: 18/10/2026
 */
@Component
public class CustomAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void handle(
            HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException accessDeniedException
    ) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        ApiResponse<Void> apiResponse = ApiResponse.error(
                "FORBIDDEN",
                "Bạn không có quyền thực hiện thao tác này.",
                request.getRequestURI()
        );

        response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
    }
}
