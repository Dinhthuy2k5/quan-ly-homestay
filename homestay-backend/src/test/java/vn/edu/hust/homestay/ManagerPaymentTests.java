package vn.edu.hust.homestay;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import vn.edu.hust.homestay.auth.entity.User;
import vn.edu.hust.homestay.auth.repository.UserRepository;
import vn.edu.hust.homestay.auth.security.JwtService;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
class ManagerPaymentTests {

    @Autowired private WebApplicationContext context;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private MockMvc mockMvc;
    private User manager1;
    private User manager2;
    private String tokenMgr1;
    private String tokenMgr2;
    private Long homestay1Id;
    private Long homestay2Id;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        manager1 = userRepository.findByEmail("manager.maichau@homestay.vn").orElseThrow();
        manager2 = userRepository.findByEmail("manager.mocchau@homestay.vn").orElseThrow();
        homestay1Id = manager1.getHomestayId();
        homestay2Id = manager2.getHomestayId();
        tokenMgr1 = jwtService.generateAccessToken(manager1);
        tokenMgr2 = jwtService.generateAccessToken(manager2);
    }

    @Test
    @DisplayName("API-PAY-04 xác nhận refund đã chuyển và lưu dấu vết giao dịch trong MySQL")
    void confirmRefundPersistsConfirmationAndAuditFields() throws Exception {
        Long bookingId = createBooking(homestay1Id, manager1.getId(), "CANCELLED");
        Long paymentId = createRefund(bookingId, homestay1Id, manager1.getId());
        String body = objectMapper.writeValueAsString(Map.of(
                "referenceCode", "REFUND-" + UUID.randomUUID().toString().substring(0, 8),
                "note", "Đã chuyển khoản hoàn cho khách"));

        mockMvc.perform(post("/api/v1/manager/payments/" + paymentId + "/confirm")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.paymentId", is(paymentId.intValue())))
                .andExpect(jsonPath("$.data.status", is("CONFIRMED")))
                .andExpect(jsonPath("$.data.confirmedAt").isNotEmpty());

        assertEquals("CONFIRMED", jdbcTemplate.queryForObject("SELECT status FROM payments WHERE id = ?", String.class, paymentId));
        assertEquals("REFUND", jdbcTemplate.queryForObject("SELECT type FROM payments WHERE id = ?", String.class, paymentId));
        assertEquals(120_000L, jdbcTemplate.queryForObject("SELECT amount FROM payments WHERE id = ?", Long.class, paymentId));
        assertEquals(manager1.getId(), jdbcTemplate.queryForObject("SELECT confirmed_by FROM payments WHERE id = ?", Long.class, paymentId));
        assertNotNull(jdbcTemplate.queryForObject("SELECT confirmed_at FROM payments WHERE id = ?", java.sql.Timestamp.class, paymentId));
        assertEquals("Đã chuyển khoản hoàn cho khách", jdbcTemplate.queryForObject("SELECT note FROM payments WHERE id = ?", String.class, paymentId));
        assertNotNull(jdbcTemplate.queryForObject("SELECT reference_code FROM payments WHERE id = ?", String.class, paymentId));
        assertEquals("CANCELLED", jdbcTemplate.queryForObject("SELECT status FROM bookings WHERE id = ?", String.class, bookingId));
        assertEquals(120_000L, jdbcTemplate.queryForObject("SELECT refund_amount FROM bookings WHERE id = ?", Long.class, bookingId));

        mockMvc.perform(post("/api/v1/manager/payments/" + paymentId + "/confirm")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code", is("PAYMENT_ALREADY_REVIEWED")));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM payments WHERE id = ? AND status = 'CONFIRMED'", Integer.class, paymentId));
    }

    @Test
    @DisplayName("API-PAY-04 không cho Manager xác nhận refund thuộc homestay khác")
    void managerCannotConfirmRefundFromAnotherHomestay() throws Exception {
        Long bookingId = createBooking(homestay2Id, manager2.getId(), "CANCELLED");
        Long paymentId = createRefund(bookingId, homestay2Id, manager2.getId());

        mockMvc.perform(post("/api/v1/manager/payments/" + paymentId + "/confirm")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_SCOPE_VIOLATION")));

        assertEquals("PENDING", jdbcTemplate.queryForObject("SELECT status FROM payments WHERE id = ?", String.class, paymentId));
        assertEquals(0, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM payments WHERE id = ? AND confirmed_by IS NOT NULL", Integer.class, paymentId));
    }

    @Test
    @DisplayName("API-PAY-04 từ chối payment không phải REFUND và không đổi dữ liệu")
    void cannotConfirmNonRefundPayment() throws Exception {
        Long bookingId = createBooking(homestay1Id, manager1.getId(), "PENDING_DEPOSIT");
        jdbcTemplate.update("""
                INSERT INTO payments (booking_id, homestay_id, type, amount, method, status, created_by)
                VALUES (?, ?, 'DEPOSIT', 120000, 'BANK_TRANSFER', 'PENDING', ?)
                """, bookingId, homestay1Id, manager1.getId());
        Long paymentId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);

        mockMvc.perform(post("/api/v1/manager/payments/" + paymentId + "/confirm")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("PAYMENT_NOT_REFUND")));
        assertEquals("PENDING", jdbcTemplate.queryForObject("SELECT status FROM payments WHERE id = ?", String.class, paymentId));
    }

    @Test
    @DisplayName("API-PAY-04 trả PAYMENT_NOT_FOUND khi mã payment không tồn tại")
    void confirmMissingPaymentReturnsNotFound() throws Exception {
        mockMvc.perform(post("/api/v1/manager/payments/999999/confirm")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code", is("PAYMENT_NOT_FOUND")));
    }

    @Test
    @DisplayName("API-PAY-04 từ chối mã tham chiếu quá dài và giữ refund ở PENDING")
    void invalidReferenceCodeDoesNotConfirmRefund() throws Exception {
        Long bookingId = createBooking(homestay1Id, manager1.getId(), "CANCELLED");
        Long paymentId = createRefund(bookingId, homestay1Id, manager1.getId());
        String body = objectMapper.writeValueAsString(Map.of("referenceCode", "R".repeat(101)));

        mockMvc.perform(post("/api/v1/manager/payments/" + paymentId + "/confirm")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
        assertEquals("PENDING", jdbcTemplate.queryForObject("SELECT status FROM payments WHERE id = ?", String.class, paymentId));
        assertEquals(0, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM payments WHERE id = ? AND confirmed_at IS NOT NULL", Integer.class, paymentId));
    }

    private Long createBooking(Long homestayId, Long createdBy, String status) {
        String code = "HS-PAY04-" + UUID.randomUUID().toString().substring(0, 8);
        jdbcTemplate.update("""
                INSERT INTO bookings (
                    code, homestay_id, contact_name, contact_phone, check_in_date, check_out_date,
                    guest_count, status, room_total_price, deposit_amount, hold_expires_at,
                    policy_snapshot, cancelled_at, cancelled_by, cancel_reason, refund_amount, created_by
                ) VALUES (?, ?, 'Khách hoàn tiền', '0988004404', ?, ?, 1, ?, 200000, 60000,
                          DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY), JSON_OBJECT(),
                          IF(? = 'CANCELLED', UTC_TIMESTAMP(), NULL), IF(? = 'CANCELLED', ?, NULL),
                          IF(? = 'CANCELLED', 'Khách yêu cầu hủy', NULL),
                          IF(? = 'CANCELLED', 120000, NULL), ?)
                """, code, homestayId, LocalDate.now().plusDays(20), LocalDate.now().plusDays(22), status,
                status, status, createdBy, status, status, createdBy);
        return jdbcTemplate.queryForObject("SELECT id FROM bookings WHERE code = ?", Long.class, code);
    }

    private Long createRefund(Long bookingId, Long homestayId, Long createdBy) {
        jdbcTemplate.update("""
                INSERT INTO payments (booking_id, homestay_id, type, amount, method, status, note, created_by)
                VALUES (?, ?, 'REFUND', 120000, 'BANK_TRANSFER', 'PENDING', 'Hoàn tiền theo chính sách hủy booking', ?)
                """, bookingId, homestayId, createdBy);
        return jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
    }
}
