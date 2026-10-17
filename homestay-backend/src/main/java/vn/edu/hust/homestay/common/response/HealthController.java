package vn.edu.hust.homestay.common.response;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Controller kiểm tra trạng thái sức khỏe của ứng dụng và cơ sở dữ liệu (Tuần 1).
 * Ngày thực hiện: 17/10/2026
 */
@Tag(name = "Health Check", description = "Kiểm tra sức khỏe hệ thống và kết nối database")
@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    private static final Logger log = LoggerFactory.getLogger(HealthController.class);

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    /**
     * Mã API: API-HEALTH-01
     * Tên API: Kiểm tra sức khỏe hệ thống (Health Check)
     * Phương thức: GET
     * Đường dẫn: /api/v1/health
     * Quyền truy cập: PUBLIC
     * Ngày thực hiện: 17/10/2026
     * Mục đích: Kiểm tra trạng thái ứng dụng backend và ping kết nối cơ sở dữ liệu MySQL (homestayv4).
     */
    @Operation(summary = "API-HEALTH-01: Kiểm tra trạng thái máy chủ và kết nối database MySQL")
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> health() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("timestamp", Instant.now().toString());
        data.put("service", "homestay-backend");

        // Ping kiểm tra kết nối cơ sở dữ liệu
        String dbStatus;
        try (Connection conn = dataSource.getConnection()) {
            dbStatus = conn.isValid(2) ? "UP" : "DOWN";
        } catch (SQLException e) {
            log.warn("Health check could not connect to the database", e);
            dbStatus = "DOWN";
        }
        data.put("status", "UP".equals(dbStatus) ? "UP" : "DOWN");
        data.put("database", dbStatus);

        HttpStatus httpStatus = "UP".equals(dbStatus) ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
        return ResponseEntity.status(httpStatus).body(ApiResponse.ok(data));
    }
}
