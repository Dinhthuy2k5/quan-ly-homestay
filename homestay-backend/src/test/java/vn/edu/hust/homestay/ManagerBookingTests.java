package vn.edu.hust.homestay;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import vn.edu.hust.homestay.auth.entity.Role;
import vn.edu.hust.homestay.auth.entity.User;
import vn.edu.hust.homestay.auth.entity.UserStatus;
import vn.edu.hust.homestay.auth.repository.UserRepository;
import vn.edu.hust.homestay.auth.security.JwtService;
import vn.edu.hust.homestay.booking.entity.Booking;
import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;
import vn.edu.hust.homestay.booking.entity.BookingRoom;
import vn.edu.hust.homestay.booking.entity.BookingRoomNight;
import vn.edu.hust.homestay.booking.repository.BookingRepository;
import vn.edu.hust.homestay.booking.repository.BookingRoomNightRepository;
import vn.edu.hust.homestay.booking.repository.BookingRoomRepository;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;
import vn.edu.hust.homestay.room.repository.RoomRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiểm thử tích hợp & nghiệp vụ cho API-MGR-BOOK-01: Danh sách booking cơ sở.
 */
@SpringBootTest
@Transactional
class ManagerBookingTests {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private BookingRoomRepository bookingRoomRepository;
    @Autowired private BookingRoomNightRepository bookingRoomNightRepository;
    @Autowired private JwtService jwtService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    private User manager1;
    private User manager2;
    private String tokenMgr1;
    private String tokenMgr2;
    private Long homestay1Id;
    private Long homestay2Id;
    private Room room1;
    private Room room2;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        manager1 = userRepository.findByEmail("manager.maichau@homestay.vn").orElseThrow();
        manager2 = userRepository.findByEmail("manager.mocchau@homestay.vn").orElseThrow();

        tokenMgr1 = jwtService.generateAccessToken(manager1);
        tokenMgr2 = jwtService.generateAccessToken(manager2);

        homestay1Id = manager1.getHomestayId();
        homestay2Id = manager2.getHomestayId();

        room1 = roomRepository.findByHomestayIdAndStatus(homestay1Id, RoomStatus.ACTIVE).stream().findFirst().orElseThrow();
        room2 = roomRepository.findByHomestayIdAndStatus(homestay2Id, RoomStatus.ACTIVE).stream().findFirst().orElseThrow();
    }

    @Test
    @DisplayName("API-MGR-BOOK-01: Manager xem danh sách booking của cơ sở thành công")
    void getHomestayBookingsSuccess() throws Exception {
        createSampleBooking(homestay1Id, room1, "HS-TEST-001", "0988111222", "Khách Test 1",
                LocalDate.now().plusDays(10), LocalDate.now().plusDays(12), BookingStatus.PENDING_DEPOSIT);

        mockMvc.perform(get("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", notNullValue()))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data[0].id", notNullValue()))
                .andExpect(jsonPath("$.data[0].code", notNullValue()))
                .andExpect(jsonPath("$.data[0].status", notNullValue()))
                .andExpect(jsonPath("$.data[0].roomTotalPrice", notNullValue()))
                .andExpect(jsonPath("$.data[0].rooms", notNullValue()))
                .andExpect(jsonPath("$.meta.page", is(0)))
                .andExpect(jsonPath("$.meta.size", notNullValue()))
                .andExpect(jsonPath("$.meta.totalElements", greaterThanOrEqualTo(1)));
    }

    @Test
    @DisplayName("API-MGR-BOOK-01: Lọc booking theo status")
    void getHomestayBookingsFilterByStatus() throws Exception {
        createSampleBooking(homestay1Id, room1, "HS-PENDING-" + UUID.randomUUID().toString().substring(0, 4),
                "0988111333", "Khách Chờ Cọc",
                LocalDate.now().plusDays(15), LocalDate.now().plusDays(17), BookingStatus.PENDING_DEPOSIT);

        createSampleBooking(homestay1Id, room1, "HS-CONFIRM-" + UUID.randomUUID().toString().substring(0, 4),
                "0988111444", "Khách Đã Xác Nhận",
                LocalDate.now().plusDays(20), LocalDate.now().plusDays(22), BookingStatus.CONFIRMED);

        mockMvc.perform(get("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .param("status", "CONFIRMED")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", notNullValue()))
                .andExpect(jsonPath("$.data[*].status", everyItem(is("CONFIRMED"))));
    }

    @Test
    @DisplayName("API-MGR-BOOK-01: Lọc booking theo khoảng ngày nhận phòng (fromDate, toDate)")
    void getHomestayBookingsFilterByDateRange() throws Exception {
        LocalDate targetCheckIn = LocalDate.now().plusDays(30);
        createSampleBooking(homestay1Id, room1, "HS-DATE-" + UUID.randomUUID().toString().substring(0, 4),
                "0988111555", "Khách Đúng Ngày",
                targetCheckIn, targetCheckIn.plusDays(2), BookingStatus.CONFIRMED);

        mockMvc.perform(get("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .param("fromDate", targetCheckIn.toString())
                        .param("toDate", targetCheckIn.toString())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data[0].checkInDate", is(targetCheckIn.toString())));
    }

    @Test
    @DisplayName("API-MGR-BOOK-01: Lọc booking theo từ khóa (keyword: mã đơn, SĐT, tên khách)")
    void getHomestayBookingsFilterByKeyword() throws Exception {
        String uniqueCode = "HS-KEYWORD-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String uniquePhone = "0977888999";
        String uniqueName = "Ong Hoang Du Lich";

        createSampleBooking(homestay1Id, room1, uniqueCode, uniquePhone, uniqueName,
                LocalDate.now().plusDays(40), LocalDate.now().plusDays(42), BookingStatus.CONFIRMED);

        // 1. Tìm theo mã booking
        mockMvc.perform(get("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .param("keyword", uniqueCode)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].code", is(uniqueCode)));

        // 2. Tìm theo số điện thoại
        mockMvc.perform(get("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .param("keyword", uniquePhone)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].contactPhone", is(uniquePhone)));

        // 3. Tìm theo tên khách
        mockMvc.perform(get("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .param("keyword", "Hoang Du Lich")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].contactName", is(uniqueName)));
    }

    @Test
    @DisplayName("API-MGR-BOOK-01: Cách ly dữ liệu giữa các homestay (Data Isolation)")
    void getHomestayBookingsDataIsolation() throws Exception {
        String codeH1 = "HS1-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase();
        String codeH2 = "HS2-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase();

        createSampleBooking(homestay1Id, room1, codeH1, "0911000111", "Khách Cơ Sở 1",
                LocalDate.now().plusDays(50), LocalDate.now().plusDays(52), BookingStatus.PENDING_DEPOSIT);

        createSampleBooking(homestay2Id, room2, codeH2, "0922000222", "Khách Cơ Sở 2",
                LocalDate.now().plusDays(50), LocalDate.now().plusDays(52), BookingStatus.PENDING_DEPOSIT);

        // Manager 1 chỉ thấy booking của cơ sở 1, không thấy codeH2
        mockMvc.perform(get("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].code", hasItem(codeH1)))
                .andExpect(jsonPath("$.data[*].code", not(hasItem(codeH2))));

        // Manager 2 chỉ thấy booking của cơ sở 2, không thấy codeH1
        mockMvc.perform(get("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + tokenMgr2)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].code", hasItem(codeH2)))
                .andExpect(jsonPath("$.data[*].code", not(hasItem(codeH1))));
    }

    @Test
    @DisplayName("API-MGR-BOOK-01: Từ chối khi Manager chưa được phân công cơ sở (HOMESTAY_NOT_ASSIGNED)")
    void getHomestayBookingsRejectsUnassignedManager() throws Exception {
        User unassignedMgr = userRepository.saveAndFlush(User.builder()
                .email("unassigned-" + UUID.randomUUID() + "@homestay.vn")
                .passwordHash("hashed")
                .fullName("Quản lý chưa gán cơ sở")
                .phone("0988000111")
                .role(Role.MANAGER)
                .status(UserStatus.ACTIVE)
                .homestayId(null)
                .build());
        String unassignedToken = jwtService.generateAccessToken(unassignedMgr);

        mockMvc.perform(get("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + unassignedToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_NOT_ASSIGNED")));
    }

    @Test
    @DisplayName("API-MGR-BOOK-01: Từ chối khi khoảng ngày không hợp lệ fromDate > toDate (INVALID_DATE_RANGE)")
    void getHomestayBookingsRejectsInvalidDateRange() throws Exception {
        mockMvc.perform(get("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .param("fromDate", "2026-11-15")
                        .param("toDate", "2026-11-10")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_DATE_RANGE")));
    }

    @Test
    @DisplayName("API-MGR-BOOK-01: Phân quyền - Người chưa đăng nhập hoặc Customer không được truy cập")
    void getHomestayBookingsRejectsUnauthorized() throws Exception {
        // Chưa đăng nhập
        mockMvc.perform(get("/api/v1/manager/bookings")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());

        // Tài khoản Customer
        User customer = userRepository.saveAndFlush(User.builder()
                .email("cust-rbac-" + UUID.randomUUID() + "@example.com")
                .passwordHash("hashed")
                .fullName("Khách hàng")
                .phone("0988000222")
                .role(Role.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build());
        String customerToken = jwtService.generateAccessToken(customer);

        mockMvc.perform(get("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    private Booking createSampleBooking(Long homestayId, Room room, String code,
                                        String phone, String name,
                                        LocalDate checkIn, LocalDate checkOut,
                                        BookingStatus status) {
        Booking booking = new Booking();
        booking.setCode(code);
        booking.setHomestayId(homestayId);
        booking.setCustomerId(null); // Đặt hộ hoặc khách vãng lai
        booking.setContactName(name);
        booking.setContactPhone(phone);
        booking.setContactEmail("test@example.com");
        booking.setCheckInDate(checkIn);
        booking.setCheckOutDate(checkOut);
        booking.setGuestCount((short) 2);
        booking.setStatus(status);
        booking.setRoomTotalPrice(1_000_000L);
        booking.setDepositAmount(300_000L);
        booking.setHoldExpiresAt(LocalDateTime.ofInstant(Instant.now().plusSeconds(86400), ZoneOffset.UTC));
        booking.setPolicySnapshot("{}");
        booking.setCreatedBy(manager1.getId());
        if (status == BookingStatus.CONFIRMED) {
            booking.setApprovedBy(manager1.getId());
            booking.setApprovedAt(Instant.now());
        }
        Booking saved = bookingRepository.saveAndFlush(booking);

        BookingRoom br = new BookingRoom(saved.getId(), homestayId, room.getId());
        bookingRoomRepository.saveAndFlush(br);

        for (LocalDate d = checkIn; d.isBefore(checkOut); d = d.plusDays(1)) {
            BookingRoomNight brn = new BookingRoomNight(room.getId(), d, saved.getId(), homestayId, 500_000L, "BASE");
            bookingRoomNightRepository.saveAndFlush(brn);
        }

        return saved;
    }
}
