package vn.edu.hust.homestay;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import vn.edu.hust.homestay.auth.dto.*;
import vn.edu.hust.homestay.auth.entity.PasswordResetToken;
import vn.edu.hust.homestay.auth.entity.Role;
import vn.edu.hust.homestay.auth.entity.User;
import vn.edu.hust.homestay.auth.entity.UserStatus;
import vn.edu.hust.homestay.auth.repository.PasswordResetTokenRepository;
import vn.edu.hust.homestay.auth.repository.RefreshTokenRepository;
import vn.edu.hust.homestay.auth.repository.UserRepository;
import vn.edu.hust.homestay.auth.util.TokenHashUtil;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Kiểm thử tích hợp toàn bộ các API Xác thực và Quản lý tài khoản Tuần 2:
 * API-AUTH-01 đến API-AUTH-06, API-USER-01 đến API-USER-03.
 * Ngày thực hiện: 18/10/2026
 */
@SpringBootTest
@Transactional
class AuthAndUserTests {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("API-AUTH-01: Đăng ký tài khoản Customer thành công (201 Created)")
    void testRegisterSuccess() throws Exception {
        RegisterRequest req = RegisterRequest.builder()
                .email("newcustomer@test.com")
                .password("Password123!")
                .fullName("Nguyễn Khách Mới")
                .phone("0987654321")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.email", is("newcustomer@test.com")))
                .andExpect(jsonPath("$.data.fullName", is("Nguyễn Khách Mới")))
                .andExpect(jsonPath("$.data.role", is("CUSTOMER")));
    }

    @Test
    @DisplayName("API-AUTH-01: Đăng ký với mật khẩu chỉ chứa số hoặc chữ (chỉ cần >= 8 ký tự)")
    void testRegisterSimplePasswordMin8Chars() throws Exception {
        RegisterRequest req = RegisterRequest.builder()
                .email("digits_only@test.com")
                .password("12345678")
                .fullName("Chỉ Chứa Số")
                .phone("0912345678")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("digits_only@test.com", "12345678"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken", notNullValue()));
    }

    @Test
    @DisplayName("API-AUTH-01: Đăng ký trùng email trả lỗi 400 EMAIL_ALREADY_EXISTS")
    void testRegisterDuplicateEmail() throws Exception {
        RegisterRequest req = RegisterRequest.builder()
                .email("dup@test.com")
                .password("Password123!")
                .fullName("Trùng Email")
                .phone("0987654321")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("EMAIL_ALREADY_EXISTS")));
    }

    @Test
    @DisplayName("API-AUTH-02: Đăng nhập thành công trả accessToken và refreshToken")
    void testLoginSuccess() throws Exception {
        RegisterRequest regReq = RegisterRequest.builder()
                .email("login_test@test.com")
                .password("Password123!")
                .fullName("Người Đăng Nhập")
                .phone("0912345678")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(regReq)))
                .andExpect(status().isCreated());

        LoginRequest loginReq = LoginRequest.builder()
                .email("login_test@test.com")
                .password("Password123!")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.accessToken", notNullValue()))
                .andExpect(jsonPath("$.data.refreshToken", notNullValue()))
                .andExpect(jsonPath("$.data.tokenType", is("Bearer")))
                .andExpect(jsonPath("$.data.user.email").doesNotExist()) // user summary không lộ email
                .andExpect(jsonPath("$.data.user.fullName", is("Người Đăng Nhập")))
                .andExpect(jsonPath("$.data.user.role", is("CUSTOMER")));
    }

    @Test
    @DisplayName("API-AUTH-02: Đăng nhập sai mật khẩu trả 401 INVALID_CREDENTIALS")
    void testLoginWrongPassword() throws Exception {
        LoginRequest loginReq = LoginRequest.builder()
                .email("nonexistent@test.com")
                .password("WrongPassword123!")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("INVALID_CREDENTIALS")));
    }

    @Test
    @DisplayName("API-AUTH-03 & 04: Refresh token xoay vòng và Đăng xuất thu hồi token")
    void testRefreshTokenAndLogoutFlow() throws Exception {
        RegisterRequest regReq = RegisterRequest.builder()
                .email("token_flow@test.com")
                .password("Password123!")
                .fullName("Token Flow")
                .phone("0934567890")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(regReq)));

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("token_flow@test.com", "Password123!"))))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode loginData = objectMapper.readTree(loginResult.getResponse().getContentAsString()).get("data");
        String accessToken = loginData.get("accessToken").asText();
        String refreshToken = loginData.get("refreshToken").asText();

        // 1. Refresh token
        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RefreshTokenRequest(refreshToken))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken", notNullValue()))
                .andExpect(jsonPath("$.data.refreshToken", notNullValue()))
                .andReturn();

        JsonNode refreshData = objectMapper.readTree(refreshResult.getResponse().getContentAsString()).get("data");
        String rotatedRefreshToken = refreshData.get("refreshToken").asText();

        // 2. Thử dùng lại refresh token cũ đã bị xoay vòng -> phải báo TOKEN_REVOKED
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RefreshTokenRequest(refreshToken))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("TOKEN_REVOKED")));

        // 3. Đăng xuất với rotatedRefreshToken
        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LogoutRequest(rotatedRefreshToken))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.loggedOut", is(true)));

        // 4. Thử refresh lại token vừa đăng xuất -> phải báo TOKEN_REVOKED
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RefreshTokenRequest(rotatedRefreshToken))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("TOKEN_REVOKED")));
    }

    @Test
    @DisplayName("API-AUTH-05 & 06: Quên mật khẩu và đặt lại mật khẩu thành công")
    void testForgotPasswordAndResetPassword() throws Exception {
        RegisterRequest regReq = RegisterRequest.builder()
                .email("forgot_pwd@test.com")
                .password("Password123!")
                .fullName("Quên Mật Khẩu")
                .phone("0945678901")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(regReq)));

        // 1. Forgot password request (202 Accepted)
        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ForgotPasswordRequest("forgot_pwd@test.com"))))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.data.message", containsString("Nếu tài khoản tồn tại")));

        // Tạo reset token thủ công để test API-AUTH-06
        User user = userRepository.findByEmail("forgot_pwd@test.com").orElseThrow();
        String rawResetToken = "test-reset-token-12345678";
        PasswordResetToken prt = PasswordResetToken.builder()
                .userId(user.getId())
                .tokenHash(TokenHashUtil.hashToken(rawResetToken))
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .build();
        passwordResetTokenRepository.save(prt);

        // 2. Reset password
        ResetPasswordRequest resetReq = ResetPasswordRequest.builder()
                .token(rawResetToken)
                .newPassword("NewStrongPass999!")
                .build();

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resetReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.passwordReset", is(true)));

        // 3. Đăng nhập với mật khẩu mới thành công
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("forgot_pwd@test.com", "NewStrongPass999!"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken", notNullValue()));
    }

    @Test
    @DisplayName("API-USER-01, 02, 03: Xem hồ sơ, Cập nhật hồ sơ và Đổi mật khẩu")
    void testUserProfileAndChangePasswordFlow() throws Exception {
        RegisterRequest regReq = RegisterRequest.builder()
                .email("profile_user@test.com")
                .password("Password123!")
                .fullName("Hồ Sơ Cũ")
                .phone("0956789012")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(regReq)));

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("profile_user@test.com", "Password123!"))))
                .andExpect(status().isOk())
                .andReturn();

        String token = objectMapper.readTree(loginResult.getResponse().getContentAsString()).get("data").get("accessToken").asText();

        // 1. GET /api/v1/me (API-USER-01)
        mockMvc.perform(get("/api/v1/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email", is("profile_user@test.com")))
                .andExpect(jsonPath("$.data.fullName", is("Hồ Sơ Cũ")))
                .andExpect(jsonPath("$.data.phone", is("0956789012")))
                .andExpect(jsonPath("$.data.role", is("CUSTOMER")));

        // 2. PATCH /api/v1/me (API-USER-02)
        UpdateProfileRequest updateReq = UpdateProfileRequest.builder()
                .fullName("Hồ Sơ Mới")
                .phone("0988888888")
                .build();

        mockMvc.perform(patch("/api/v1/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fullName", is("Hồ Sơ Mới")))
                .andExpect(jsonPath("$.data.phone", is("0988888888")));

        // 3. PATCH /api/v1/me/password (API-USER-03)
        ChangePasswordRequest changeReq = ChangePasswordRequest.builder()
                .currentPassword("Password123!")
                .newPassword("BrandNewPass456!")
                .build();

        mockMvc.perform(patch("/api/v1/me/password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(changeReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.passwordChanged", is(true)));

        // 4. Đăng nhập lại với mật khẩu mới
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("profile_user@test.com", "BrandNewPass456!"))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Security: Request không có token truy cập /api/v1/me trả 401 UNAUTHORIZED chuẩn JSON")
    void testUnauthorizedAccess() throws Exception {
        mockMvc.perform(get("/api/v1/me")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("UNAUTHORIZED")));
    }
}
