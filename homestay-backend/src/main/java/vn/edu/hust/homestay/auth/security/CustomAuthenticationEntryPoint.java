package vn.edu.hust.homestay.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import vn.edu.hust.homestay.common.response.ApiResponse;

import java.io.IOException;

/**
 * Xử lý trả về mã lỗi 401 UNAUTHORIZED chuẩn ApiResponse khi request chưa được xác thực.
 * Ngày thực hiện: 18/10/2026
 */
@Component
public class CustomAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException
    ) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        ApiResponse<Void> apiResponse = ApiResponse.error(
                "UNAUTHORIZED",
                "Phiên đăng nhập đã hết hạn hoặc chưa được xác thực.",
                request.getRequestURI()
        );

        response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
    }
}
