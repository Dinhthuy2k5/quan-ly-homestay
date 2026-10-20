package vn.edu.hust.homestay.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

/**
 * Cấu hình Static File Serving cho URL dạng /files/** (Tuần 1).
 * Ánh xạ tới thư mục lưu trữ uploads (mặc định storage/uploads trong workspace).
 * Hỗ trợ tự động nhận diện cả khi chạy từ thư mục gốc hoặc từ homestay-backend/.
 * Ngày thực hiện: 17/10/2026
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${app.storage.upload-dir:storage/uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        List<String> locations = new ArrayList<>();

        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        locations.add(formatUri(uploadPath));

        Path parentPath = Paths.get("..", uploadDir).toAbsolutePath().normalize();
        if (Files.exists(parentPath)) {
            locations.add(formatUri(parentPath));
        }

        locations.add("file:storage/uploads/");
        locations.add("file:../storage/uploads/");

        registry.addResourceHandler("/files/**")
                .addResourceLocations(locations.toArray(new String[0]));
    }

    private String formatUri(Path path) {
        String uri = path.toUri().toString();
        return uri.endsWith("/") ? uri : uri + "/";
    }
}
