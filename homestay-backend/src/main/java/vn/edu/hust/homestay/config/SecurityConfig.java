package vn.edu.hust.homestay.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;
import vn.edu.hust.homestay.auth.security.CustomAccessDeniedHandler;
import vn.edu.hust.homestay.auth.security.CustomAuthenticationEntryPoint;
import vn.edu.hust.homestay.auth.security.JwtAuthenticationFilter;

/**
 * Cấu hình bảo mật Spring Security cho Tuần 2:
 * - Stateless session với JWT Bearer Token
 * - CORS & CSRF disable
 * - Đăng ký JwtAuthenticationFilter kiểm tra token
 * - Custom AuthenticationEntryPoint & AccessDeniedHandler trả JSON chuẩn ApiResponse
 * - Phân quyền RBAC cho các vai trò CUSTOMER, MANAGER, ADMIN, DIRECTOR
 * Ngày thực hiện: 18/10/2026
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final CorsConfigurationSource corsConfigurationSource;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CustomAuthenticationEntryPoint authenticationEntryPoint;
    private final CustomAccessDeniedHandler accessDeniedHandler;

    public SecurityConfig(
            CorsConfigurationSource corsConfigurationSource,
            JwtAuthenticationFilter jwtAuthenticationFilter,
            CustomAuthenticationEntryPoint authenticationEntryPoint,
            CustomAccessDeniedHandler accessDeniedHandler
    ) {
        this.corsConfigurationSource = corsConfigurationSource;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.authenticationEntryPoint = authenticationEntryPoint;
        this.accessDeniedHandler = accessDeniedHandler;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(authenticationEntryPoint)
                .accessDeniedHandler(accessDeniedHandler)
            )
            .authorizeHttpRequests(auth -> auth
                // Health check & OpenAPI
                .requestMatchers("/api/v1/health").permitAll()
                .requestMatchers(
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/v3/api-docs/**"
                ).permitAll()

                // Static file uploads (ảnh homestay, phòng)
                .requestMatchers("/files/**").permitAll()

                // Public API tra cứu thông tin (Tuần 1)
                .requestMatchers("/api/v1/public/**").permitAll()

                // Auth API (Tuần 2)
                .requestMatchers("/api/v1/auth/logout").authenticated()
                .requestMatchers("/api/v1/auth/**").permitAll()

                // User / Me API (Tuần 2)
                .requestMatchers("/api/v1/me/**").authenticated()

                // Manager API (Tuần 3)
                .requestMatchers("/api/v1/manager/**").hasRole("MANAGER")

                // Mọi request còn lại yêu cầu đăng nhập
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
