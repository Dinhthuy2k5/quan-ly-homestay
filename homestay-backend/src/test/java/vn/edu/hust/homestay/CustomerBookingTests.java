package vn.edu.hust.homestay;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
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
import org.springframework.transaction.annotation.Propagation;
import org.springframework.web.context.WebApplicationContext;
import vn.edu.hust.homestay.auth.entity.Role;
import vn.edu.hust.homestay.auth.entity.User;
import vn.edu.hust.homestay.auth.entity.UserStatus;
import vn.edu.hust.homestay.auth.repository.UserRepository;
import vn.edu.hust.homestay.auth.security.JwtService;
import vn.edu.hust.homestay.booking.dto.CreateBookingRequest;
import vn.edu.hust.homestay.booking.dto.CustomerAdjustBookingRequest;
import vn.edu.hust.homestay.booking.entity.Booking;
import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;
import vn.edu.hust.homestay.booking.entity.BookingRoomNight;
import vn.edu.hust.homestay.booking.repository.BookingRepository;
import vn.edu.hust.homestay.booking.repository.BookingRoomNightRepository;
import vn.edu.hust.homestay.payment.entity.Payment;
import vn.edu.hust.homestay.payment.repository.PaymentRepository;
import vn.edu.hust.homestay.homestay.entity.Homestay;
import vn.edu.hust.homestay.homestay.repository.HomestayRepository;
import vn.edu.hust.homestay.pricing.entity.PriceRule;
import vn.edu.hust.homestay.pricing.repository.PriceRuleRepository;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;
import vn.edu.hust.homestay.room.repository.RoomRepository;
import vn.edu.hust.homestay.service.dto.CustomerBookingServiceSelectionRequest;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
class CustomerBookingTests {

    private static final ZoneId BUSINESS_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private HomestayRepository homestayRepository;
    @Autowired private PriceRuleRepository priceRuleRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private BookingRoomNightRepository bookingRoomNightRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private vn.edu.hust.homestay.booking.repository.BookingRoomRepository bookingRoomRepository;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private JwtService jwtService;
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    private MockMvc mockMvc;
    private User customer;
    private String customerToken;
    private Room room;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();
        assertEquals(1, jdbcTemplate.update("""
                UPDATE policy_settings
                SET policy_value = ?
                WHERE policy_group = 'CANCELLATION' AND policy_key = 'refund_rules'
                """, "[{\"days_before_checkin\":7,\"refund_percent\":100},"
                + "{\"days_before_checkin\":3,\"refund_percent\":50},"
                + "{\"days_before_checkin\":0,\"refund_percent\":0}]"));
        customer = userRepository.saveAndFlush(User.builder()
                .email("customer-booking-" + UUID.randomUUID() + "@example.com")
                .passwordHash("test-hash")
                .fullName("Khách kiểm thử")
                .phone("0901234567")
                .role(Role.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build());
        customerToken = jwtService.generateAccessToken(customer);
        room = roomRepository.findByHomestayIdAndStatus(1L, RoomStatus.ACTIVE).stream()
                .filter(candidate -> priceRuleRepository.findByRoomIdAndRuleTypeAndStatus(
                        candidate.getId(), PriceRule.RuleType.BASE, PriceRule.Status.ACTIVE).isPresent())
                .findFirst().orElseThrow();
    }

    @Test
    @DisplayName("API-CUS-04 hủy booking đã xác nhận: lưu trạng thái, lý do, tiền hoàn và giải phóng đêm trong database")
    void cancelConfirmedBookingPersistsRefundAndReleasesNights() throws Exception {
        LocalDate checkInDate = LocalDate.now(BUSINESS_TIME_ZONE).plusDays(5);
        Booking booking = createConfirmedBookingWithDeposit(checkInDate);
        Long roomId = bookingRoomRepository.findByBookingId(booking.getId()).getFirst().getRoomId();
        long serviceId = createActiveService(booking.getHomestayId(), 75_000L);
        mockMvc.perform(post("/api/v1/customer/bookings/" + booking.getId() + "/rooms/" + roomId + "/services")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("serviceId", serviceId, "quantity", 1))))
                .andExpect(status().isCreated());
        long expectedRefund = (booking.getDepositAmount() + 1) / 2;
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM booking_room_nights WHERE booking_id = ?", Integer.class, booking.getId()));

        // 1. Khi đơn phát sinh hoàn tiền cọc mà thiếu thông tin ngân hàng -> 400 REFUND_BANK_INFO_REQUIRED
        mockMvc.perform(post("/api/v1/customer/bookings/" + booking.getId() + "/cancel")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("reason", "  Đổi kế hoạch  "))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("REFUND_BANK_INFO_REQUIRED")));

        // 1b. Khi số tài khoản không hợp lệ (chứa chữ cái hoặc ngắn hơn 6 số) -> 400
        mockMvc.perform(post("/api/v1/customer/bookings/" + booking.getId() + "/cancel")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "reason", "Đổi kế hoạch",
                                "bankName", "MB Bank",
                                "bankAccountNumber", "1234a",
                                "bankAccountHolder", "NGUYEN VAN A"
                        ))))
                .andExpect(status().isBadRequest());

        // 1c. Khi tên chủ tài khoản chứa số hoặc ký tự đặc biệt -> 400
        mockMvc.perform(post("/api/v1/customer/bookings/" + booking.getId() + "/cancel")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "reason", "Đổi kế hoạch",
                                "bankName", "MB Bank",
                                "bankAccountNumber", "0987654321",
                                "bankAccountHolder", "NGUYEN VAN 123"
                        ))))
                .andExpect(status().isBadRequest());

        // 2. Khi cung cấp đầy đủ thông tin ngân hàng nhận hoàn tiền (có dấu tiếng Việt) -> Hủy thành công, tên chuẩn hóa in hoa không dấu
        mockMvc.perform(post("/api/v1/customer/bookings/" + booking.getId() + "/cancel")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "reason", "  Đổi kế hoạch  ",
                                "bankName", "MB Bank",
                                "bankAccountNumber", "0987654321",
                                "bankAccountHolder", "Nguyễn Văn Đạt"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.bookingId", is(booking.getId().intValue())))
                .andExpect(jsonPath("$.data.status", is("CANCELLED")))
                .andExpect(jsonPath("$.data.refundAmount", is((int) expectedRefund)));

        Map<String, Object> persistedBooking = jdbcTemplate.queryForMap(
                "SELECT status, refund_amount, cancel_reason, cancelled_by FROM bookings WHERE id = ?", booking.getId());
        assertEquals("CANCELLED", persistedBooking.get("status"));
        assertEquals(expectedRefund, ((Number) persistedBooking.get("refund_amount")).longValue());
        assertEquals("Đổi kế hoạch", persistedBooking.get("cancel_reason"));
        assertEquals(customer.getId(), ((Number) persistedBooking.get("cancelled_by")).longValue());
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM booking_room_nights WHERE booking_id = ?", Integer.class, booking.getId()));
        assertEquals("CANCELLED", jdbcTemplate.queryForObject(
                "SELECT status FROM booking_services WHERE booking_id = ? AND service_id = ?", String.class, booking.getId(), serviceId));

        Map<String, Object> refundPayment = jdbcTemplate.queryForMap("""
                SELECT type, amount, method, status, created_by, bank_name, bank_account_number, bank_account_holder
                FROM payments
                WHERE booking_id = ? AND type = 'REFUND'
                """, booking.getId());
        assertEquals("REFUND", refundPayment.get("type"));
        assertEquals(expectedRefund, ((Number) refundPayment.get("amount")).longValue());
        assertEquals("PENDING", refundPayment.get("status"));
        assertEquals("BANK_TRANSFER", refundPayment.get("method"));
        assertEquals(customer.getId(), ((Number) refundPayment.get("created_by")).longValue());
        assertEquals("MB Bank", refundPayment.get("bank_name"));
        assertEquals("0987654321", refundPayment.get("bank_account_number"));
        assertEquals("NGUYEN VAN DAT", refundPayment.get("bank_account_holder"));

        mockMvc.perform(get("/api/v1/customer/bookings/" + booking.getId())
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.payments[?(@.paymentType == 'REFUND')].bankName").value(hasItem("MB Bank")))
                .andExpect(jsonPath("$.data.payments[?(@.paymentType == 'REFUND')].bankAccountNumber").value(hasItem("0987654321")))
                .andExpect(jsonPath("$.data.payments[?(@.paymentType == 'REFUND')].bankAccountHolder").value(hasItem("NGUYEN VAN DAT")));
    }

    @Test
    @DisplayName("API-CUS-07 đăng ký dịch vụ: lưu đúng phòng, số lượng, giá chốt, ngày và người yêu cầu trong database")
    void customerRegistersServiceAndPersistsSnapshotForOwnBookingRoom() throws Exception {
        Booking booking = createConfirmedBookingWithDeposit(LocalDate.now(BUSINESS_TIME_ZONE).plusDays(3));
        Long roomId = bookingRoomRepository.findByBookingId(booking.getId()).getFirst().getRoomId();
        long serviceId = createActiveService(booking.getHomestayId(), 125_000L);
        LocalDate serviceDate = booking.getCheckInDate();

        mockMvc.perform(post("/api/v1/customer/bookings/" + booking.getId() + "/rooms/" + roomId + "/services")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "serviceId", serviceId,
                                "quantity", 2,
                                "serviceDate", serviceDate.toString(),
                                "note", "  Không đường  "))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.bookingId", is(booking.getId().intValue())))
                .andExpect(jsonPath("$.data.roomId", is(roomId.intValue())))
                .andExpect(jsonPath("$.data.serviceId", is((int) serviceId)))
                .andExpect(jsonPath("$.data.quantity", is(2)))
                .andExpect(jsonPath("$.data.unitPrice", is(125000)))
                .andExpect(jsonPath("$.data.totalPrice", is(250000)))
                .andExpect(jsonPath("$.data.status", is("REGISTERED")));

        Map<String, Object> persisted = jdbcTemplate.queryForMap("""
                SELECT booking_id, homestay_id, room_id, service_id, quantity, unit_price, total_price,
                       status, service_date, note, requested_by, recorded_by
                FROM booking_services WHERE booking_id = ? AND service_id = ?
                """, booking.getId(), serviceId);
        assertEquals(booking.getId(), ((Number) persisted.get("booking_id")).longValue());
        assertEquals(booking.getHomestayId(), ((Number) persisted.get("homestay_id")).longValue());
        assertEquals(roomId, ((Number) persisted.get("room_id")).longValue());
        assertEquals(2, ((Number) persisted.get("quantity")).intValue());
        assertEquals(125_000L, ((Number) persisted.get("unit_price")).longValue());
        assertEquals(250_000L, ((Number) persisted.get("total_price")).longValue());
        assertEquals("REGISTERED", persisted.get("status"));
        assertEquals(serviceDate, ((java.sql.Date) persisted.get("service_date")).toLocalDate());
        assertEquals("Không đường", persisted.get("note"));
        assertEquals(customer.getId(), ((Number) persisted.get("requested_by")).longValue());
        assertNull(persisted.get("recorded_by"));

        mockMvc.perform(get("/api/v1/customer/bookings/" + booking.getId() + "/services")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].serviceName", startsWith("Dịch vụ kiểm thử ")))
                .andExpect(jsonPath("$.data[0].totalPrice", is(250000)));
    }

    @Test
    @DisplayName("API-CUS-07 từ chối đăng ký dịch vụ cho booking của khách khác hoặc phòng không thuộc booking")
    void customerCannotRegisterServiceOutsideOwnedBookingAndRoom() throws Exception {
        Booking booking = createConfirmedBookingWithDeposit(LocalDate.now(BUSINESS_TIME_ZONE).plusDays(4));
        long serviceId = createActiveService(booking.getHomestayId(), 80_000L);
        Long roomId = bookingRoomRepository.findByBookingId(booking.getId()).getFirst().getRoomId();
        User otherCustomer = userRepository.saveAndFlush(User.builder()
                .email("service-other-" + UUID.randomUUID() + "@example.com")
                .passwordHash("test-hash")
                .fullName("Khách khác")
                .phone("0912888777")
                .role(Role.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build());
        String otherToken = jwtService.generateAccessToken(otherCustomer);
        String requestBody = objectMapper.writeValueAsString(Map.of("serviceId", serviceId, "quantity", 1));

        mockMvc.perform(post("/api/v1/customer/bookings/" + booking.getId() + "/rooms/" + roomId + "/services")
                        .header("Authorization", "Bearer " + otherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code", is("BOOKING_NOT_OWNED")));

        mockMvc.perform(post("/api/v1/customer/bookings/" + booking.getId() + "/rooms/999999/services")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("ROOM_NOT_IN_BOOKING")));
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM booking_services WHERE booking_id = ?", Integer.class, booking.getId()));
    }

    @Test
    @DisplayName("API-CUS-07 nhận booking còn giữ chỗ hoặc đang hoạt động và ngày dịch vụ nằm trong kỳ lưu trú")
    void customerServiceRegistrationRequiresOpenBookingAndDateInsideStay() throws Exception {
        Booking booking = createConfirmedBookingWithDeposit(LocalDate.now(BUSINESS_TIME_ZONE).plusDays(5));
        Long roomId = bookingRoomRepository.findByBookingId(booking.getId()).getFirst().getRoomId();
        long serviceId = createActiveService(booking.getHomestayId(), 90_000L);
        String endpoint = "/api/v1/customer/bookings/" + booking.getId() + "/rooms/" + roomId + "/services";
        String invalidDate = objectMapper.writeValueAsString(Map.of(
                "serviceId", serviceId,
                "quantity", 1,
                "serviceDate", booking.getCheckOutDate().toString()));

        mockMvc.perform(post(endpoint)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidDate))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("SERVICE_DATE_OUTSIDE_BOOKING")));

        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.saveAndFlush(booking);
        mockMvc.perform(post(endpoint)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("serviceId", serviceId, "quantity", 1))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code", is("SERVICE_BOOKING_CLOSED")));
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM booking_services WHERE booking_id = ?", Integer.class, booking.getId()));
    }

    @Test
    @DisplayName("API-CUS-07 cho phép khách đăng ký dịch vụ khi booking PENDING_DEPOSIT còn hạn giữ chỗ")
    void customerCanRegisterServiceBeforeDepositApprovalWhileHoldIsActive() throws Exception {
        Booking booking = createPendingBooking(LocalDate.now(BUSINESS_TIME_ZONE).plusDays(6));
        Long roomId = bookingRoomRepository.findByBookingId(booking.getId()).getFirst().getRoomId();
        long serviceId = createActiveService(booking.getHomestayId(), 65_000L);

        mockMvc.perform(post("/api/v1/customer/bookings/" + booking.getId() + "/rooms/" + roomId + "/services")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("serviceId", serviceId, "quantity", 1))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status", is("REGISTERED")));
        assertEquals("REGISTERED", jdbcTemplate.queryForObject(
                "SELECT status FROM booking_services WHERE booking_id = ?", String.class, booking.getId()));
    }

    private long createActiveService(Long homestayId, long unitPrice) {
        String suffix = UUID.randomUUID().toString();
        String categoryName = "Danh mục kiểm thử " + suffix;
        jdbcTemplate.update("INSERT INTO service_categories (homestay_id, name) VALUES (?, ?)", homestayId, categoryName);
        long categoryId = jdbcTemplate.queryForObject(
                "SELECT id FROM service_categories WHERE homestay_id = ? AND name = ?", Long.class, homestayId, categoryName);
        jdbcTemplate.update("""
                INSERT INTO services (homestay_id, category_id, name, unit, unit_price, description, status)
                VALUES (?, ?, ?, 'suất', ?, 'Dịch vụ tạo bởi kiểm thử API-CUS-07', 'ACTIVE')
                """, homestayId, categoryId, "Dịch vụ kiểm thử " + suffix, unitPrice);
        return jdbcTemplate.queryForObject("SELECT id FROM services WHERE category_id = ?", Long.class, categoryId);
    }

    @Test
    @DisplayName("API-CUS-04 mốc hủy trong 3 ngày: không tạo payment REFUND khi chính sách cho hoàn 0%")
    void cancelBookingWithoutRefundDoesNotCreateRefundPayment() throws Exception {
        Booking booking = createConfirmedBookingWithDeposit(LocalDate.now(BUSINESS_TIME_ZONE).plusDays(2));

        mockMvc.perform(post("/api/v1/customer/bookings/" + booking.getId() + "/cancel")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("reason", "Thay đổi lịch"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("CANCELLED")))
                .andExpect(jsonPath("$.data.refundAmount", is(0)));

        Map<String, Object> persistedBooking = jdbcTemplate.queryForMap(
                "SELECT status, refund_amount FROM bookings WHERE id = ?", booking.getId());
        assertEquals("CANCELLED", persistedBooking.get("status"));
        assertEquals(0L, ((Number) persistedBooking.get("refund_amount")).longValue());
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM payments WHERE booking_id = ? AND type = 'REFUND'", Integer.class, booking.getId()));
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM booking_room_nights WHERE booking_id = ?", Integer.class, booking.getId()));
    }

    @Test
    @DisplayName("API-CUS-04 chỉ chủ booking được hủy; hủy lần hai bị từ chối và không nhân đôi khoản hoàn")
    void cancelBookingEnforcesOwnershipAndPreventsDuplicateRefund() throws Exception {
        Booking booking = createConfirmedBookingWithDeposit(LocalDate.now(BUSINESS_TIME_ZONE).plusDays(8));
        User otherCustomer = userRepository.saveAndFlush(User.builder()
                .email("cancel-other-" + UUID.randomUUID() + "@example.com")
                .passwordHash("test-hash")
                .fullName("Khách khác")
                .phone("0912999888")
                .role(Role.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build());
        String otherToken = jwtService.generateAccessToken(otherCustomer);
        String path = "/api/v1/customer/bookings/" + booking.getId() + "/cancel";
        String body = objectMapper.writeValueAsString(Map.of("reason", "Không phải chủ đơn"));

        mockMvc.perform(post(path)
                        .header("Authorization", "Bearer " + otherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code", is("BOOKING_NOT_OWNED")));
        assertEquals("CONFIRMED", jdbcTemplate.queryForObject(
                "SELECT status FROM bookings WHERE id = ?", String.class, booking.getId()));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM booking_room_nights WHERE booking_id = ?", Integer.class, booking.getId()));

        String validCancelBody = objectMapper.writeValueAsString(Map.of(
                "reason", "Chủ đơn hủy",
                "bankName", "Techcombank",
                "bankAccountNumber", "1903000111",
                "bankAccountHolder", "NGUYEN VAN A"
        ));
        mockMvc.perform(post(path)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validCancelBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.refundAmount", is(booking.getDepositAmount().intValue())));
        mockMvc.perform(post(path)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validCancelBody))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code", is("CANCELLATION_NOT_ALLOWED")));

        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM payments WHERE booking_id = ? AND type = 'REFUND'", Integer.class, booking.getId()));
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM booking_room_nights WHERE booking_id = ?", Integer.class, booking.getId()));
    }

    @Test
    @DisplayName("API-CUS-04 cho phép hủy PENDING_DEPOSIT nhưng chặn PENDING_APPROVAL để bảo vệ khoản cọc chưa xác minh")
    void cancelPendingDepositButRejectPendingApprovalCancellation() throws Exception {
        LocalDate today = LocalDate.now(BUSINESS_TIME_ZONE);
        Booking pendingDeposit = createPendingBooking(today.plusDays(2));
        Booking pendingApproval = createPendingBooking(today.plusDays(2));
        pendingApproval.setStatus(BookingStatus.PENDING_APPROVAL);
        bookingRepository.saveAndFlush(pendingApproval);
        createPayment(pendingApproval, Payment.PaymentStatus.PENDING, null);

        mockMvc.perform(post("/api/v1/customer/bookings/" + pendingDeposit.getId() + "/cancel")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("reason", "Khách đổi kế hoạch"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("CANCELLED")))
                .andExpect(jsonPath("$.data.refundAmount", is(0)));

        assertEquals("CANCELLED", jdbcTemplate.queryForObject(
                "SELECT status FROM bookings WHERE id = ?", String.class, pendingDeposit.getId()));
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM booking_room_nights WHERE booking_id = ?", Integer.class, pendingDeposit.getId()));

        mockMvc.perform(post("/api/v1/customer/bookings/" + pendingApproval.getId() + "/cancel")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("reason", "Khách đổi kế hoạch"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code", is("CANCELLATION_NOT_ALLOWED")));

        assertEquals("PENDING_APPROVAL", jdbcTemplate.queryForObject(
                "SELECT status FROM bookings WHERE id = ?", String.class, pendingApproval.getId()));
        assertTrue(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM booking_room_nights WHERE booking_id = ?", Integer.class, pendingApproval.getId()) > 0);
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM payments WHERE booking_id = ? AND type = 'REFUND'", Integer.class, pendingApproval.getId()));

        assertEquals("PENDING", jdbcTemplate.queryForObject(
                "SELECT status FROM payments WHERE booking_id = ? AND type = 'DEPOSIT'", String.class, pendingApproval.getId()));
    }

    @Test
    @DisplayName("API-CUS-01 tạo booking, chốt giá mỗi đêm và giữ phòng theo đêm")
    void createBookingSuccess() throws Exception {
        LocalDate checkInDate = findFreeCheckInDate();
        CreateBookingRequest request = bookingRequest(checkInDate, 1);

        mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.bookingId", notNullValue()))
                .andExpect(jsonPath("$.data.code", startsWith("HS-")))
                .andExpect(jsonPath("$.data.status", is("PENDING_DEPOSIT")))
                .andExpect(jsonPath("$.data.roomTotalPrice", greaterThan(0)))
                .andExpect(jsonPath("$.data.depositAmount", greaterThan(0)))
                .andExpect(jsonPath("$.data.paymentInstruction.transferContent", containsString("DAT COC")));

        mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code", is("ROOM_NOT_AVAILABLE")));
    }

    @Test
    @DisplayName("API-CUS-01 tạo booking và dịch vụ đã chọn nguyên tử, chốt giá dịch vụ và vẫn tính cọc từ tiền phòng")
    void createBookingWithServicesPersistsServicesInSameTransaction() throws Exception {
        LocalDate checkInDate = findFreeCheckInDate();
        long serviceId = createActiveService(room.getHomestayId(), 125_000L);
        CreateBookingRequest request = bookingRequest(checkInDate, 1);
        request.setServices(List.of(new CustomerBookingServiceSelectionRequest(
                room.getId(), serviceId, 2, checkInDate, "Không đường")));

        String response = mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status", is("PENDING_DEPOSIT")))
                .andReturn().getResponse().getContentAsString();

        long bookingId = objectMapper.readTree(response).path("data").path("id").asLong();
        long roomTotal = objectMapper.readTree(response).path("data").path("roomTotalPrice").asLong();
        long deposit = objectMapper.readTree(response).path("data").path("depositAmount").asLong();
        Map<String, Object> persisted = jdbcTemplate.queryForMap("""
                SELECT booking_id, room_id, service_id, quantity, unit_price, total_price,
                       status, service_date, note, requested_by
                FROM booking_services WHERE booking_id = ?
                """, bookingId);
        assertEquals(bookingId, ((Number) persisted.get("booking_id")).longValue());
        assertEquals(room.getId(), ((Number) persisted.get("room_id")).longValue());
        assertEquals(serviceId, ((Number) persisted.get("service_id")).longValue());
        assertEquals(2, ((Number) persisted.get("quantity")).intValue());
        assertEquals(125_000L, ((Number) persisted.get("unit_price")).longValue());
        assertEquals(250_000L, ((Number) persisted.get("total_price")).longValue());
        assertEquals("REGISTERED", persisted.get("status"));
        assertEquals(checkInDate, ((java.sql.Date) persisted.get("service_date")).toLocalDate());
        assertEquals("Không đường", persisted.get("note"));
        assertEquals(customer.getId(), ((Number) persisted.get("requested_by")).longValue());
        assertEquals(roomTotal, jdbcTemplate.queryForObject(
                "SELECT room_total_price FROM bookings WHERE id = ?", Long.class, bookingId));
        assertTrue(deposit <= roomTotal, "Tiền cọc phải được tính từ tiền phòng, không cộng dịch vụ REGISTERED");
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    @DisplayName("API-CUS-01 từ chối dịch vụ không thuộc danh mục ACTIVE của homestay")
    void createBookingRejectsInactiveOrMissingSelectedService() throws Exception {
        LocalDate checkInDate = findFreeCheckInDate();
        CreateBookingRequest request = bookingRequest(checkInDate, 1);
        request.setServices(List.of(new CustomerBookingServiceSelectionRequest(
                room.getId(), Long.MAX_VALUE, 1, checkInDate, null)));
        int bookingsBefore = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM bookings WHERE created_by = ?", Integer.class, customer.getId());
        int nightsBefore = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM booking_room_nights WHERE room_id = ?", Integer.class, room.getId());
        mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("SERVICE_NOT_ACTIVE")));

        assertEquals(bookingsBefore, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM bookings WHERE created_by = ?", Integer.class, customer.getId()));
        assertEquals(nightsBefore, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM booking_room_nights WHERE room_id = ?", Integer.class, room.getId()));
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM booking_services WHERE service_id = ?", Integer.class, Long.MAX_VALUE));
        userRepository.delete(customer);
        userRepository.flush();
    }

    @Test
    @DisplayName("API-CUS-01 yêu cầu đăng nhập và chỉ cho phép Customer")
    void createBookingRequiresCustomerRole() throws Exception {
        CreateBookingRequest request = bookingRequest(LocalDate.now().plusDays(5), 1);
        String body = objectMapper.writeValueAsString(request);

        mockMvc.perform(post("/api/v1/customer/bookings")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());

        User manager = userRepository.findByEmail("manager.maichau@homestay.vn").orElseThrow();
        mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + jwtService.generateAccessToken(manager))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("API-CUS-01 từ chối số khách vượt sức chứa phòng")
    void createBookingRejectsGuestCountAboveCapacity() throws Exception {
        CreateBookingRequest request = bookingRequest(LocalDate.now().plusDays(5), Byte.toUnsignedInt(room.getMaxGuests()) + 1);
        mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("ROOM_CAPACITY_EXCEEDED")));
    }

    @Test
    @DisplayName("API-CUS-02 lấy danh sách booking của khách hàng thành công và cách ly theo tài khoản")
    void getCustomerBookingsSuccessAndIsolated() throws Exception {
        LocalDate checkInDate = findFreeCheckInDate();
        CreateBookingRequest request = bookingRequest(checkInDate, 1);

        String createRes = mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String bookingCode = objectMapper.readTree(createRes).path("data").path("code").asText();

        // 1. Khách hàng xem danh sách của chính mình
        mockMvc.perform(get("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data[0].code", notNullValue()))
                .andExpect(jsonPath("$.data[0].homestayName", notNullValue()))
                .andExpect(jsonPath("$.data[0].status", is("PENDING_DEPOSIT")))
                .andExpect(jsonPath("$.data[0].roomTotalPrice", greaterThan(0)))
                .andExpect(jsonPath("$.data[0].depositAmount", greaterThan(0)))
                .andExpect(jsonPath("$.data[0].checkInDate", notNullValue()))
                .andExpect(jsonPath("$.data[0].checkOutDate", notNullValue()))
                .andExpect(jsonPath("$.data[0].holdExpiresAt", notNullValue()))
                .andExpect(jsonPath("$.data[0].rooms", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data[0].rooms[0].roomId", notNullValue()))
                .andExpect(jsonPath("$.data[0].rooms[0].roomName", notNullValue()))
                .andExpect(jsonPath("$.data[0].paymentInstruction.bankAccountNumber", notNullValue()))
                .andExpect(jsonPath("$.meta.totalElements", greaterThanOrEqualTo(1)));

        // 2. Lọc theo status PENDING_DEPOSIT -> có dữ liệu
        mockMvc.perform(get("/api/v1/customer/bookings")
                        .param("status", "PENDING_DEPOSIT")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));

        // 3. Lọc theo status CONFIRMED -> rỗng
        mockMvc.perform(get("/api/v1/customer/bookings")
                        .param("status", "CONFIRMED")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));

        // 4. Khách hàng B khác đăng nhập thì không thấy booking của khách hàng A
        User otherCustomer = userRepository.saveAndFlush(User.builder()
                .email("other-customer-" + UUID.randomUUID() + "@example.com")
                .passwordHash("test-hash")
                .fullName("Khách hàng khác")
                .phone("0987654321")
                .role(Role.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build());
        String otherToken = jwtService.generateAccessToken(otherCustomer);

        mockMvc.perform(get("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + otherToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(0)))
                .andExpect(jsonPath("$.meta.totalElements", is(0)));
    }

    @Test
    @DisplayName("API-CUS-03 lấy chi tiết booking thành công và cách ly theo tài khoản")
    void getBookingDetailSuccessAndIsolated() throws Exception {
        LocalDate checkInDate = findFreeCheckInDate();
        CreateBookingRequest request = bookingRequest(checkInDate, 1);

        // Tạo booking trước
        String createRes = mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long bookingId = objectMapper.readTree(createRes).path("data").path("id").asLong();

        // 1. Khách hàng xem chi tiết booking của chính mình thành công
        mockMvc.perform(get("/api/v1/customer/bookings/" + bookingId)
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(bookingId.intValue())))
                .andExpect(jsonPath("$.data.code", startsWith("HS-")))
                .andExpect(jsonPath("$.data.status", is("PENDING_DEPOSIT")))
                .andExpect(jsonPath("$.data.homestayName", notNullValue()))
                .andExpect(jsonPath("$.data.checkInDate", notNullValue()))
                .andExpect(jsonPath("$.data.checkOutDate", notNullValue()))
                .andExpect(jsonPath("$.data.rooms", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data.rooms[0].roomId", notNullValue()))
                .andExpect(jsonPath("$.data.rooms[0].roomName", notNullValue()))
                .andExpect(jsonPath("$.data.rooms[0].nights", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data.rooms[0].nights[0].stayDate", notNullValue()))
                .andExpect(jsonPath("$.data.rooms[0].nights[0].nightlyPrice", greaterThan(0)))
                .andExpect(jsonPath("$.data.roomTotalPrice", greaterThan(0)))
                .andExpect(jsonPath("$.data.depositAmount", greaterThan(0)))
                .andExpect(jsonPath("$.data.paidAmount", is(0)))
                .andExpect(jsonPath("$.data.outstandingAmount", greaterThan(0)))
                .andExpect(jsonPath("$.data.paymentInstruction.bankAccountNumber", notNullValue()))
                .andExpect(jsonPath("$.data.paymentInstruction.transferContent", containsString("DAT COC")));

        // 2. Khách hàng khác không được xem booking này
        User otherCustomer = userRepository.saveAndFlush(User.builder()
                .email("cus03-other-" + UUID.randomUUID() + "@example.com")
                .passwordHash("test-hash").fullName("Khách khác").phone("0999999999")
                .role(Role.CUSTOMER).status(UserStatus.ACTIVE).build());
        mockMvc.perform(get("/api/v1/customer/bookings/" + bookingId)
                        .header("Authorization", "Bearer " + jwtService.generateAccessToken(otherCustomer)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code", is("BOOKING_NOT_OWNED")));

        // 3. Booking không tồn tại -> 404
        mockMvc.perform(get("/api/v1/customer/bookings/999999999")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code", is("BOOKING_NOT_FOUND")));

        // 4. Chưa đăng nhập -> 401
        mockMvc.perform(get("/api/v1/customer/bookings/" + bookingId))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("API-CUS-02 yêu cầu đăng nhập và chỉ cho phép Customer truy cập")
    void getCustomerBookingsRequiresCustomerRole() throws Exception {
        // Chưa đăng nhập -> 401
        mockMvc.perform(get("/api/v1/customer/bookings"))
                .andExpect(status().isUnauthorized());

        // Manager -> 403
        User manager = userRepository.findByEmail("manager.maichau@homestay.vn").orElseThrow();
        mockMvc.perform(get("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + jwtService.generateAccessToken(manager)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("API-CUS-01 nghiệp vụ: Từ chối đặt phòng nếu tài khoản khách chưa có số điện thoại")
    void createBookingRejectsCustomerWithoutPhone() throws Exception {
        User noPhoneCustomer = userRepository.saveAndFlush(User.builder()
                .email("nophone-" + UUID.randomUUID() + "@example.com")
                .passwordHash("test-hash")
                .fullName("Khách chưa có SĐT")
                .phone("")
                .role(Role.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build());
        String noPhoneToken = jwtService.generateAccessToken(noPhoneCustomer);

        LocalDate checkInDate = findFreeCheckInDate();
        CreateBookingRequest request = bookingRequest(checkInDate, 1);

        mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + noPhoneToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("CUSTOMER_PHONE_REQUIRED")));
    }

    @Test
    @DisplayName("API-CUS-01 nghiệp vụ: Từ chối danh sách phòng chứa ID phòng trùng lặp")
    void createBookingRejectsDuplicateRoomIds() throws Exception {
        LocalDate checkInDate = findFreeCheckInDate();
        CreateBookingRequest request = bookingRequest(checkInDate, 1);
        request.setRoomIds(List.of(room.getId(), room.getId()));

        mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("DUPLICATE_ROOM_ID")));
    }

    @Test
    @DisplayName("API-CUS-01 nghiệp vụ: Từ chối homestay không tồn tại hoặc đã ngừng hoạt động")
    void createBookingRejectsInactiveHomestay() throws Exception {
        LocalDate checkInDate = findFreeCheckInDate();
        CreateBookingRequest request = bookingRequest(checkInDate, 1);
        request.setHomestayId(99999999L);

        mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_INACTIVE")));
    }

    @Test
    @DisplayName("API-CUS-01 nghiệp vụ: Từ chối phòng không thuộc homestay đã chọn")
    void createBookingRejectsRoomFromDifferentHomestay() throws Exception {
        Homestay otherHomestay = new Homestay();
        otherHomestay.setName("Homestay Khác " + UUID.randomUUID());
        otherHomestay.setProvince("Sơn La");
        otherHomestay.setAddress("Mộc Châu");
        otherHomestay.setStatus(Homestay.HomestayStatus.ACTIVE);
        Homestay savedOtherHomestay = homestayRepository.saveAndFlush(otherHomestay);

        LocalDate checkInDate = findFreeCheckInDate();
        CreateBookingRequest request = bookingRequest(checkInDate, 1);
        // Chọn homestay khác nhưng lại truyền room thuộc homestay 1
        request.setHomestayId(savedOtherHomestay.getId());
        request.setRoomIds(List.of(room.getId()));

        mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ROOM_NOT_AVAILABLE")));
    }

    @Test
    @DisplayName("API-CUS-01 nghiệp vụ: Từ chối phòng đang bị khóa hoặc ngừng hoạt động")
    void createBookingRejectsLockedRoom() throws Exception {
        // Tạm thời khóa phòng
        room.setStatus(RoomStatus.LOCKED);
        roomRepository.saveAndFlush(room);

        LocalDate checkInDate = findFreeCheckInDate();
        CreateBookingRequest request = bookingRequest(checkInDate, 1);

        mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ROOM_LOCKED")));
    }

    @Test
    @DisplayName("API-CUS-01 nghiệp vụ: Từ chối ngày nhận/trả phòng không hợp lệ")
    void createBookingRejectsInvalidDateRanges() throws Exception {
        LocalDate checkInDate = findFreeCheckInDate();

        // 1. checkOutDate trùng ngày checkInDate (0 đêm)
        CreateBookingRequest zeroNight = bookingRequest(checkInDate, 0, 1);
        mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(zeroNight)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_DATE_RANGE")));

        // 2. checkOutDate trước ngày checkInDate
        CreateBookingRequest negativeNight = bookingRequest(checkInDate, -1, 1);
        mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(negativeNight)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_DATE_RANGE")));

        // 3. checkInDate ở quá khứ
        CreateBookingRequest pastDate = bookingRequest(LocalDate.now().minusDays(1), 1, 1);
        mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(pastDate)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_DATE_RANGE")));
    }

    @Test
    @DisplayName("API-CUS-01 nghiệp vụ: Từ chối vi phạm chính sách đặt trước và số đêm tối đa")
    void createBookingRejectsPolicyViolations() throws Exception {
        LocalDate checkInDate = findFreeCheckInDate();

        // 1. Vượt quá max_advance_days (365 ngày)
        CreateBookingRequest tooFar = bookingRequest(LocalDate.now().plusDays(400), 1, 1);
        mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(tooFar)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("BOOKING_POLICY_VIOLATION")));

        // 2. Vượt quá max_nights (30 đêm)
        CreateBookingRequest tooManyNights = bookingRequest(checkInDate, 35, 1);
        mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(tooManyNights)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("BOOKING_POLICY_VIOLATION")));
    }

    @Test
    @DisplayName("API-CUS-01 nghiệp vụ: Khóa giữ phòng theo từng đêm và cho phép nhận phòng cùng ngày khách trước trả")
    void createBookingPreventsOverlappingStayNights() throws Exception {
        LocalDate d = findFreeCheckInDate(4);

        // Đơn 1: Đặt 2 đêm từ D đến D+2 (giữ đêm D và đêm D+1)
        CreateBookingRequest b1 = bookingRequest(d, 2, 1);
        mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(b1)))
                .andExpect(status().isCreated());

        // Đơn 2: Cố đặt từ D+1 đến D+3 (bị trùng đêm D+1) -> Bị từ chối Conflict
        CreateBookingRequest b2 = bookingRequest(d.plusDays(1), 2, 1);
        mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(b2)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code", is("ROOM_NOT_AVAILABLE")));

        // Đơn 3: Đặt từ D+2 đến D+3 (nhận phòng vào đúng ngày Đơn 1 trả phòng) -> Thành công!
        CreateBookingRequest b3 = bookingRequest(d.plusDays(2), 1, 1);
        mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(b3)))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("API-CUS-02 nghiệp vụ: Validate tham số sort và phân trang")
    void getCustomerBookingsPaginationAndSortingValidation() throws Exception {
        // 1. Sort không hợp lệ -> 400 BAD_REQUEST
        mockMvc.perform(get("/api/v1/customer/bookings")
                        .param("sort", "passwordHash,asc")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_SORT")));

        // 2. Chiều sort không hợp lệ -> 400 BAD_REQUEST
        mockMvc.perform(get("/api/v1/customer/bookings")
                        .param("sort", "createdAt,invalid_direction")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_SORT")));
    }

    @Test
    @DisplayName("API-CUS-03 nghiệp vụ: Kiểm tra tính toán tài chính và chi tiết từng đêm lưu trú")
    void getBookingDetailVerifiesNightsBreakdownAndFinancialCalculation() throws Exception {
        LocalDate checkInDate = findFreeCheckInDate(2);
        CreateBookingRequest request = bookingRequest(checkInDate, 2, 1);

        String createRes = mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long bookingId = objectMapper.readTree(createRes).path("data").path("id").asLong();

        Booking booking = bookingRepository.findById(bookingId).orElseThrow();
        Long managerId = userRepository.findByEmail("manager.maichau@homestay.vn").orElseThrow().getId();
        Payment confirmedDeposit = createPayment(booking, Payment.PaymentStatus.CONFIRMED, managerId);
        confirmedDeposit.setAmount(125_000L);
        paymentRepository.saveAndFlush(confirmedDeposit);
        Payment pendingDeposit = createPayment(booking, Payment.PaymentStatus.PENDING, null);
        pendingDeposit.setAmount(200_000L);
        paymentRepository.saveAndFlush(pendingDeposit);

        // Đọc chi tiết booking
        String detailRes = mockMvc.perform(get("/api/v1/customer/bookings/" + bookingId)
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rooms", hasSize(1)))
                .andExpect(jsonPath("$.data.rooms[0].nights", hasSize(2)))
                .andExpect(jsonPath("$.data.payments", hasSize(2)))
                .andExpect(jsonPath("$.data.payments[0].amount", notNullValue()))
                .andExpect(jsonPath("$.data.payments[0].status", notNullValue()))
                .andReturn().getResponse().getContentAsString();

        long night1Price = objectMapper.readTree(detailRes).path("data").path("rooms").get(0)
                .path("nights").get(0).path("nightlyPrice").asLong();
        long night2Price = objectMapper.readTree(detailRes).path("data").path("rooms").get(0)
                .path("nights").get(1).path("nightlyPrice").asLong();
        long roomTotalPrice = objectMapper.readTree(detailRes).path("data").path("roomTotalPrice").asLong();
        long depositAmount = objectMapper.readTree(detailRes).path("data").path("depositAmount").asLong();
        long paidAmount = objectMapper.readTree(detailRes).path("data").path("paidAmount").asLong();
        long outstandingAmount = objectMapper.readTree(detailRes).path("data").path("outstandingAmount").asLong();

        org.junit.jupiter.api.Assertions.assertEquals(roomTotalPrice, night1Price + night2Price,
                "Tổng giá từng đêm phải bằng đúng tổng tiền phòng của đơn");
        org.junit.jupiter.api.Assertions.assertTrue(depositAmount > 0 && depositAmount <= roomTotalPrice,
                "Tiền cọc phải lớn hơn 0 và nhỏ hơn hoặc bằng tổng tiền phòng");
        org.junit.jupiter.api.Assertions.assertEquals(125_000L, paidAmount,
                "Chỉ khoản cọc đã được xác nhận mới tính là tiền đã nhận");
        org.junit.jupiter.api.Assertions.assertEquals(roomTotalPrice - 125_000L, outstandingAmount);
        assertEquals(125_000L, jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE booking_id = ? AND type = 'DEPOSIT' AND status = 'CONFIRMED'",
                Long.class, bookingId));
    }

    @Test
    @DisplayName("API-CUS-01 nghiệp vụ: Cho phép đặt nhiều phòng cùng lúc, kiểm tra tổng sức chứa các phòng")
    void createBookingMultipleRoomsSuccessAndValidateCombinedCapacity() throws Exception {
        Room room2 = new Room();
        room2.setHomestayId(room.getHomestayId());
        room2.setRoomTypeId(room.getRoomTypeId());
        room2.setName("Phòng thứ 2 " + UUID.randomUUID());
        room2.setMaxGuests((byte) 3);
        room2.setStatus(RoomStatus.ACTIVE);
        Room savedRoom2 = roomRepository.saveAndFlush(room2);

        PriceRule baseRule2 = new PriceRule();
        baseRule2.setHomestayId(room.getHomestayId());
        baseRule2.setRoomId(savedRoom2.getId());
        baseRule2.setName("Giá cơ bản phòng 2");
        baseRule2.setRuleType(PriceRule.RuleType.BASE);
        baseRule2.setBasePrice(600000L);
        baseRule2.setPriority((short) 1);
        baseRule2.setStatus(PriceRule.Status.ACTIVE);
        baseRule2.setCreatedAt(java.time.Instant.now());
        baseRule2.setUpdatedAt(java.time.Instant.now());
        priceRuleRepository.saveAndFlush(baseRule2);

        LocalDate checkInDate = findFreeCheckInDate(1);
        int room1Capacity = Byte.toUnsignedInt(room.getMaxGuests());
        int room2Capacity = Byte.toUnsignedInt(savedRoom2.getMaxGuests());
        int totalCapacity = room1Capacity + room2Capacity;

        // 1. Thử đặt với số khách vượt quá tổng sức chứa (totalCapacity + 1) -> Bị từ chối
        CreateBookingRequest overRequest = new CreateBookingRequest();
        overRequest.setHomestayId(room.getHomestayId());
        overRequest.setRoomIds(List.of(room.getId(), savedRoom2.getId()));
        overRequest.setCheckInDate(checkInDate);
        overRequest.setCheckOutDate(checkInDate.plusDays(1));
        overRequest.setGuestCount(totalCapacity + 1);
        overRequest.setNote("Đoàn đi đông quá sức chứa");

        mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(overRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("ROOM_CAPACITY_EXCEEDED")));

        // 2. Đặt với số khách hợp lệ (lớn hơn sức chứa từng phòng đơn lẻ nhưng <= tổng sức chứa)
        int multiGuestCount = Math.min(totalCapacity, Math.max(room1Capacity, room2Capacity) + 1);
        CreateBookingRequest validRequest = new CreateBookingRequest();
        validRequest.setHomestayId(room.getHomestayId());
        validRequest.setRoomIds(List.of(room.getId(), savedRoom2.getId()));
        validRequest.setCheckInDate(checkInDate);
        validRequest.setCheckOutDate(checkInDate.plusDays(1));
        validRequest.setGuestCount(multiGuestCount);
        validRequest.setNote("Gia đình đặt 2 phòng cùng lúc");

        mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.roomTotalPrice", greaterThan(0)));
    }

    @Test
    @DisplayName("API-CUS-09: Khách hàng điều chỉnh booking PENDING_DEPOSIT thành công")
    void adjustBookingPendingDepositSuccess() throws Exception {
        LocalDate checkIn = findFreeCheckInDate(5);
        CreateBookingRequest req = bookingRequest(checkIn, 2, 2);
        String responseJson = mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long bookingId = objectMapper.readTree(responseJson).path("data").path("id").asLong();

        // Điều chỉnh sang 3 đêm và ngày mới
        LocalDate newCheckIn = checkIn.plusDays(1);
        LocalDate newCheckOut = checkIn.plusDays(4);
        CustomerAdjustBookingRequest adjustReq = new CustomerAdjustBookingRequest(
                newCheckIn, newCheckOut, 2, null);

        mockMvc.perform(patch("/api/v1/customer/bookings/" + bookingId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adjustReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.bookingId", is(bookingId.intValue())))
                .andExpect(jsonPath("$.data.status", is("PENDING_DEPOSIT")))
                .andExpect(jsonPath("$.data.checkInDate", is(newCheckIn.toString())))
                .andExpect(jsonPath("$.data.checkOutDate", is(newCheckOut.toString())))
                .andExpect(jsonPath("$.data.guestCount", is(2)))
                .andExpect(jsonPath("$.data.roomTotalPrice", greaterThan(0)))
                .andExpect(jsonPath("$.data.depositAmount", greaterThan(0)));

        List<BookingRoomNight> nights = bookingRoomNightRepository.findByBookingId(bookingId);
        assertEquals(3, nights.size());
        assertTrue(nights.stream().allMatch(n -> !n.getId().getStayDate().isBefore(newCheckIn) && n.getId().getStayDate().isBefore(newCheckOut)));
    }

    @Test
    @DisplayName("API-CUS-09: Khách hàng điều chỉnh booking CONFIRMED trước hạn quy định thành công")
    void adjustBookingConfirmedSuccess() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(10);
        while (!roomRepository.findUnavailableStayDates(room.getId(), checkIn, checkIn.plusDays(5)).isEmpty()) {
            checkIn = checkIn.plusDays(5);
        }
        CreateBookingRequest req = bookingRequest(checkIn, 2, 2);
        String responseJson = mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long bookingId = objectMapper.readTree(responseJson).path("data").path("id").asLong();

        // Chuyển trạng thái sang CONFIRMED
        Booking booking = bookingRepository.findById(bookingId).orElseThrow();
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setApprovedBy(customer.getId());
        booking.setApprovedAt(Instant.now());
        bookingRepository.saveAndFlush(booking);

        LocalDate newCheckIn = checkIn.plusDays(1);
        LocalDate newCheckOut = checkIn.plusDays(3);
        CustomerAdjustBookingRequest adjustReq = new CustomerAdjustBookingRequest(
                newCheckIn, newCheckOut, 2, null);

        mockMvc.perform(patch("/api/v1/customer/bookings/" + bookingId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adjustReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.status", is("CONFIRMED")))
                .andExpect(jsonPath("$.data.checkInDate", is(newCheckIn.toString())))
                .andExpect(jsonPath("$.data.checkOutDate", is(newCheckOut.toString())));
    }

    @Test
    @DisplayName("API-CUS-09: Khách hàng điều chỉnh danh sách phòng (roomIds) thành công")
    void adjustBookingChangeRoomsSuccess() throws Exception {
        LocalDate checkIn = findFreeCheckInDate(3);
        CreateBookingRequest req = bookingRequest(checkIn, 1, 2);
        String responseJson = mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long bookingId = objectMapper.readTree(responseJson).path("data").path("id").asLong();

        Room room2 = new Room();
        room2.setHomestayId(room.getHomestayId());
        room2.setRoomTypeId(room.getRoomTypeId());
        room2.setName("Phòng test đổi phòng " + UUID.randomUUID().toString().substring(0, 5));
        room2.setMaxGuests((byte) 3);
        room2.setStatus(RoomStatus.ACTIVE);
        Room savedRoom2 = roomRepository.saveAndFlush(room2);

        PriceRule baseRule2 = new PriceRule();
        baseRule2.setHomestayId(room.getHomestayId());
        baseRule2.setRoomId(savedRoom2.getId());
        baseRule2.setName("Giá cơ bản phòng 2");
        baseRule2.setRuleType(PriceRule.RuleType.BASE);
        baseRule2.setBasePrice(400_000L);
        baseRule2.setPriority((short) 1);
        baseRule2.setStatus(PriceRule.Status.ACTIVE);
        baseRule2.setCreatedAt(Instant.now());
        baseRule2.setUpdatedAt(Instant.now());
        priceRuleRepository.saveAndFlush(baseRule2);

        CustomerAdjustBookingRequest adjustReq = new CustomerAdjustBookingRequest(
                checkIn, checkIn.plusDays(1), 5, List.of(room.getId(), savedRoom2.getId()));

        mockMvc.perform(patch("/api/v1/customer/bookings/" + bookingId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adjustReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.roomIds", hasSize(2)))
                .andExpect(jsonPath("$.data.guestCount", is(5)));
    }

    @Test
    @DisplayName("API-CUS-09: Từ chối điều chỉnh booking của người khác (BOOKING_NOT_OWNED)")
    void adjustBookingRejectsNotOwned() throws Exception {
        LocalDate checkIn = findFreeCheckInDate(2);
        CreateBookingRequest req = bookingRequest(checkIn, 1, 2);
        String responseJson = mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long bookingId = objectMapper.readTree(responseJson).path("data").path("id").asLong();

        User otherCustomer = userRepository.saveAndFlush(User.builder()
                .email("other-" + UUID.randomUUID() + "@example.com")
                .passwordHash("test-hash")
                .fullName("Khách hàng khác")
                .phone("0912999888")
                .role(Role.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build());
        String otherToken = jwtService.generateAccessToken(otherCustomer);

        CustomerAdjustBookingRequest adjustReq = new CustomerAdjustBookingRequest(
                checkIn.plusDays(1), checkIn.plusDays(2), 2, null);

        mockMvc.perform(patch("/api/v1/customer/bookings/" + bookingId)
                        .header("Authorization", "Bearer " + otherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adjustReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code", is("BOOKING_NOT_OWNED")));
    }

    @Test
    @DisplayName("API-CUS-09: Từ chối điều chỉnh đơn đang chờ duyệt cọc PENDING_APPROVAL (BOOKING_STATE_CONFLICT)")
    void adjustBookingRejectsPendingApproval() throws Exception {
        LocalDate checkIn = findFreeCheckInDate(2);
        CreateBookingRequest req = bookingRequest(checkIn, 1, 2);
        String responseJson = mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long bookingId = objectMapper.readTree(responseJson).path("data").path("id").asLong();

        Booking booking = bookingRepository.findById(bookingId).orElseThrow();
        booking.setStatus(BookingStatus.PENDING_APPROVAL);
        bookingRepository.saveAndFlush(booking);

        CustomerAdjustBookingRequest adjustReq = new CustomerAdjustBookingRequest(
                checkIn.plusDays(1), checkIn.plusDays(2), 2, null);

        mockMvc.perform(patch("/api/v1/customer/bookings/" + bookingId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adjustReq)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code", is("BOOKING_STATE_CONFLICT")));
    }

    @Test
    @DisplayName("API-CUS-09: Từ chối điều chỉnh đơn CONFIRMED khi sát ngày nhận phòng < adjust_min_days_before (ADJUSTMENT_WINDOW_CLOSED)")
    void adjustBookingRejectsConfirmedPastAdjustmentWindow() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(1);
        while (!roomRepository.findUnavailableStayDates(room.getId(), checkIn, checkIn.plusDays(2)).isEmpty()) {
            checkIn = checkIn.plusDays(10);
        }
        CreateBookingRequest req = bookingRequest(checkIn, 1, 2);
        String responseJson = mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long bookingId = objectMapper.readTree(responseJson).path("data").path("id").asLong();

        Booking booking = bookingRepository.findById(bookingId).orElseThrow();
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setApprovedBy(customer.getId());
        booking.setApprovedAt(Instant.now());
        booking.setCheckInDate(LocalDate.now().plusDays(1));
        booking.setCheckOutDate(LocalDate.now().plusDays(2));
        bookingRepository.saveAndFlush(booking);

        CustomerAdjustBookingRequest adjustReq = new CustomerAdjustBookingRequest(
                LocalDate.now().plusDays(10), LocalDate.now().plusDays(12), 2, null);

        mockMvc.perform(patch("/api/v1/customer/bookings/" + bookingId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adjustReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("ADJUSTMENT_WINDOW_CLOSED")));
    }

    @Test
    @DisplayName("API-CUS-09: Từ chối điều chỉnh khi phòng trùng lịch với đơn khác (ROOM_NOT_AVAILABLE)")
    void adjustBookingRejectsConflictingDatesWithAnotherBooking() throws Exception {
        LocalDate dateA = findFreeCheckInDate(10);
        LocalDate dateB = dateA.plusDays(5);

        CreateBookingRequest req1 = bookingRequest(dateA, 2, 2);
        mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isCreated());

        CreateBookingRequest req2 = bookingRequest(dateB, 2, 2);
        String responseJson2 = mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long bookingId2 = objectMapper.readTree(responseJson2).path("data").path("id").asLong();

        CustomerAdjustBookingRequest conflictAdjust = new CustomerAdjustBookingRequest(
                dateA, dateA.plusDays(2), 2, null);

        mockMvc.perform(patch("/api/v1/customer/bookings/" + bookingId2)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(conflictAdjust)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code", is("ROOM_NOT_AVAILABLE")));
    }

    @Test
    @DisplayName("API-CUS-09: Từ chối điều chỉnh khi số khách vượt quá sức chứa phòng (ROOM_CAPACITY_EXCEEDED)")
    void adjustBookingRejectsCapacityExceeded() throws Exception {
        LocalDate checkIn = findFreeCheckInDate(2);
        CreateBookingRequest req = bookingRequest(checkIn, 1, 2);
        String responseJson = mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long bookingId = objectMapper.readTree(responseJson).path("data").path("id").asLong();

        CustomerAdjustBookingRequest adjustReq = new CustomerAdjustBookingRequest(
                checkIn, checkIn.plusDays(1), Byte.toUnsignedInt(room.getMaxGuests()) + 10, null);

        mockMvc.perform(patch("/api/v1/customer/bookings/" + bookingId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adjustReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("ROOM_CAPACITY_EXCEEDED")));
    }

    @Test
    @DisplayName("API-CUS-09: Từ chối điều chỉnh khi khoảng ngày không hợp lệ (INVALID_DATE_RANGE)")
    void adjustBookingRejectsInvalidDateRange() throws Exception {
        LocalDate checkIn = findFreeCheckInDate(3);
        CreateBookingRequest req = bookingRequest(checkIn, 1, 2);
        String responseJson = mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long bookingId = objectMapper.readTree(responseJson).path("data").path("id").asLong();

        CustomerAdjustBookingRequest adjustReq = new CustomerAdjustBookingRequest(
                checkIn.plusDays(5), checkIn.plusDays(4), 2, null);

        mockMvc.perform(patch("/api/v1/customer/bookings/" + bookingId)
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adjustReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_DATE_RANGE")));
    }

    private CreateBookingRequest bookingRequest(LocalDate checkInDate, int guestCount) {
        return bookingRequest(checkInDate, 1, guestCount);
    }

    private Booking createConfirmedBookingWithDeposit(LocalDate checkInDate) throws Exception {
        Booking booking = createPendingBooking(checkInDate);
        User manager = userRepository.findByEmail("manager.maichau@homestay.vn").orElseThrow();
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setApprovedBy(manager.getId());
        booking.setApprovedAt(Instant.now());
        bookingRepository.saveAndFlush(booking);
        createPayment(booking, Payment.PaymentStatus.CONFIRMED, manager.getId());
        return booking;
    }

    private Booking createPendingBooking(LocalDate checkInDate) throws Exception {
        Room testRoom = createRoomForCancellationTest();
        CreateBookingRequest request = new CreateBookingRequest();
        request.setHomestayId(testRoom.getHomestayId());
        request.setRoomIds(List.of(testRoom.getId()));
        request.setCheckInDate(checkInDate);
        request.setCheckOutDate(checkInDate.plusDays(1));
        request.setGuestCount(1);
        request.setNote("Booking fixture cho kiểm thử hủy theo nghiệp vụ");

        String response = mockMvc.perform(post("/api/v1/customer/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long bookingId = objectMapper.readTree(response).path("data").path("id").asLong();
        return bookingRepository.findById(bookingId).orElseThrow();
    }

    private Payment createPayment(Booking booking, Payment.PaymentStatus status, Long confirmedBy) {
        Payment payment = new Payment();
        payment.setBookingId(booking.getId());
        payment.setHomestayId(booking.getHomestayId());
        payment.setType(Payment.PaymentType.DEPOSIT);
        payment.setAmount(booking.getDepositAmount());
        payment.setMethod(Payment.PaymentMethod.BANK_TRANSFER);
        payment.setStatus(status);
        payment.setCreatedBy(customer.getId());
        payment.setConfirmedBy(confirmedBy);
        if (status == Payment.PaymentStatus.CONFIRMED) {
            payment.setConfirmedAt(LocalDateTime.ofInstant(Instant.now(), ZoneOffset.UTC));
        }
        return paymentRepository.saveAndFlush(payment);
    }

    private Room createRoomForCancellationTest() {
        Room testRoom = new Room();
        testRoom.setHomestayId(room.getHomestayId());
        testRoom.setRoomTypeId(room.getRoomTypeId());
        testRoom.setName("Phòng test hủy " + UUID.randomUUID());
        testRoom.setMaxGuests((byte) 2);
        testRoom.setStatus(RoomStatus.ACTIVE);
        Room savedRoom = roomRepository.saveAndFlush(testRoom);

        PriceRule baseRule = new PriceRule();
        baseRule.setHomestayId(savedRoom.getHomestayId());
        baseRule.setRoomId(savedRoom.getId());
        baseRule.setName("Giá base test hủy " + savedRoom.getId());
        baseRule.setRuleType(PriceRule.RuleType.BASE);
        baseRule.setBasePrice(400_000L);
        baseRule.setPriority((short) 0);
        baseRule.setStatus(PriceRule.Status.ACTIVE);
        baseRule.setCreatedAt(Instant.now());
        baseRule.setUpdatedAt(Instant.now());
        priceRuleRepository.saveAndFlush(baseRule);
        return savedRoom;
    }

    private CreateBookingRequest bookingRequest(LocalDate checkInDate, int nights, int guestCount) {
        CreateBookingRequest request = new CreateBookingRequest();
        Homestay homestay = homestayRepository.findById(room.getHomestayId()).orElseThrow();
        request.setHomestayId(homestay.getId());
        request.setRoomIds(List.of(room.getId()));
        request.setCheckInDate(checkInDate);
        request.setCheckOutDate(checkInDate.plusDays(nights));
        request.setGuestCount(guestCount);
        request.setNote("Kiểm thử nghiệp vụ đặt phòng");
        return request;
    }

    private LocalDate findFreeCheckInDate() {
        return findFreeCheckInDate(1);
    }

    private LocalDate findFreeCheckInDate(int nights) {
        for (int offset = 1; offset <= 90; offset++) {
            LocalDate date = LocalDate.now().plusDays(offset);
            if (roomRepository.findUnavailableStayDates(room.getId(), date, date.plusDays(nights)).isEmpty()) {
                return date;
            }
        }
        throw new IllegalStateException("Không tìm được chuỗi đêm trống để chạy test");
    }
}
