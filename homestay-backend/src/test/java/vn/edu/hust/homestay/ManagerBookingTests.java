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
import vn.edu.hust.homestay.booking.dto.ManagerAdjustBookingRequest;
import vn.edu.hust.homestay.booking.dto.ManagerCreateBookingRequest;
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
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiểm thử tích hợp & nghiệp vụ cho:
 * - API-MGR-BOOK-01: Danh sách booking cơ sở
 * - API-MGR-BOOK-02: Đặt phòng hộ khách
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

    // ── API-MGR-BOOK-02: Đặt phòng hộ khách ─────────────────────────────────

    @Test
    @DisplayName("API-MGR-BOOK-02: Manager đặt phòng hộ khách thành công (201 Created)")
    void createBookingSuccess() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(20);
        LocalDate checkOut = LocalDate.now().plusDays(22);
        ManagerCreateBookingRequest req = ManagerCreateBookingRequest.builder()
                .contactName("Trần Văn Khách")
                .contactPhone("0987654321")
                .contactEmail("khach@example.com")
                .roomIds(List.of(room1.getId()))
                .checkInDate(checkIn)
                .checkOutDate(checkOut)
                .guestCount(2)
                .note("Khách gọi điện thoại đặt trực tiếp")
                .build();

        mockMvc.perform(post("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.code", startsWith("HS-")))
                .andExpect(jsonPath("$.data.source", is("MANAGER")))
                .andExpect(jsonPath("$.data.status", is("PENDING_DEPOSIT")))
                .andExpect(jsonPath("$.data.roomTotalPrice", greaterThan(0)))
                .andExpect(jsonPath("$.data.depositAmount", greaterThan(0)))
                .andExpect(jsonPath("$.data.holdExpiresAt", notNullValue()));

        // Kiểm tra CSDL
        Booking saved = bookingRepository.findAll().stream()
                .filter(b -> "Trần Văn Khách".equals(b.getContactName()))
                .findFirst()
                .orElseThrow();
        assertEquals(manager1.getId(), saved.getCreatedBy());
        assertNull(saved.getCustomerId()); // Khách chưa có tài khoản
        assertEquals(homestay1Id, saved.getHomestayId());
        assertEquals(2, (int) saved.getGuestCount());

        List<BookingRoom> bRooms = bookingRoomRepository.findByBookingId(saved.getId());
        assertEquals(1, bRooms.size());
        assertEquals(room1.getId(), bRooms.get(0).getRoomId());

        List<BookingRoomNight> bNights = bookingRoomNightRepository.findByBookingId(saved.getId());
        assertEquals(2, bNights.size());
    }

    @Test
    @DisplayName("API-MGR-BOOK-02: Khách đã có tài khoản theo SĐT thì tự động liên kết customerId")
    void createBookingWithRegisteredCustomerPhone() throws Exception {
        String phone = "0989998877";
        User existingCust = userRepository.saveAndFlush(User.builder()
                .email("existing-cust-" + UUID.randomUUID() + "@example.com")
                .passwordHash("hashed")
                .fullName("Lê Khách Cũ")
                .phone(phone)
                .role(Role.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build());

        ManagerCreateBookingRequest req = ManagerCreateBookingRequest.builder()
                .contactName("Lê Khách Cũ")
                .contactPhone(phone)
                .contactEmail("existing@example.com")
                .roomIds(List.of(room1.getId()))
                .checkInDate(LocalDate.now().plusDays(25))
                .checkOutDate(LocalDate.now().plusDays(27))
                .guestCount(2)
                .build();

        mockMvc.perform(post("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)));

        Booking saved = bookingRepository.findAll().stream()
                .filter(b -> phone.equals(b.getContactPhone()))
                .findFirst()
                .orElseThrow();
        assertEquals(existingCust.getId(), saved.getCustomerId());
    }

    @Test
    @DisplayName("API-MGR-BOOK-02: Manager chưa được gán cơ sở bị từ chối 400 HOMESTAY_NOT_ASSIGNED")
    void createBookingRejectsUnassignedManager() throws Exception {
        User unassigned = userRepository.saveAndFlush(User.builder()
                .email("mgr-unassigned-book-" + UUID.randomUUID() + "@example.com")
                .passwordHash("hashed")
                .fullName("Quản lý chưa gán")
                .phone("0988000444")
                .role(Role.MANAGER)
                .status(UserStatus.ACTIVE)
                .homestayId(null)
                .build());
        String token = jwtService.generateAccessToken(unassigned);

        ManagerCreateBookingRequest req = ManagerCreateBookingRequest.builder()
                .contactName("Khách Thử")
                .contactPhone("0987111222")
                .roomIds(List.of(room1.getId()))
                .checkInDate(LocalDate.now().plusDays(10))
                .checkOutDate(LocalDate.now().plusDays(12))
                .guestCount(2)
                .build();

        mockMvc.perform(post("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_NOT_ASSIGNED")));
    }

    @Test
    @DisplayName("API-MGR-BOOK-02: Manager không được đặt phòng thuộc cơ sở khác 400 ROOM_NOT_AVAILABLE")
    void createBookingRejectsRoomFromAnotherHomestay() throws Exception {
        ManagerCreateBookingRequest req = ManagerCreateBookingRequest.builder()
                .contactName("Khách Thử")
                .contactPhone("0987111222")
                .roomIds(List.of(room2.getId())) // room2 thuộc homestay 2
                .checkInDate(LocalDate.now().plusDays(10))
                .checkOutDate(LocalDate.now().plusDays(12))
                .guestCount(2)
                .build();

        mockMvc.perform(post("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ROOM_NOT_AVAILABLE")));
    }

    @Test
    @DisplayName("API-MGR-BOOK-02: Không được đặt phòng đang LOCKED 409 ROOM_LOCKED")
    void createBookingRejectsLockedRoom() throws Exception {
        Room lockedRoom = new Room();
        lockedRoom.setHomestayId(homestay1Id);
        lockedRoom.setRoomTypeId(room1.getRoomTypeId());
        lockedRoom.setName("Phòng Khóa 999");
        lockedRoom.setMaxGuests((byte) 2);
        lockedRoom.setStatus(RoomStatus.LOCKED);
        lockedRoom = roomRepository.saveAndFlush(lockedRoom);

        ManagerCreateBookingRequest req = ManagerCreateBookingRequest.builder()
                .contactName("Khách Thử")
                .contactPhone("0987111222")
                .roomIds(List.of(lockedRoom.getId()))
                .checkInDate(LocalDate.now().plusDays(10))
                .checkOutDate(LocalDate.now().plusDays(12))
                .guestCount(2)
                .build();

        mockMvc.perform(post("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ROOM_LOCKED")));
    }

    @Test
    @DisplayName("API-MGR-BOOK-02: Số khách vượt quá sức chứa trả về 400 ROOM_CAPACITY_EXCEEDED")
    void createBookingRejectsCapacityExceeded() throws Exception {
        ManagerCreateBookingRequest req = ManagerCreateBookingRequest.builder()
                .contactName("Khách Thử")
                .contactPhone("0987111222")
                .roomIds(List.of(room1.getId()))
                .checkInDate(LocalDate.now().plusDays(10))
                .checkOutDate(LocalDate.now().plusDays(12))
                .guestCount((int) room1.getMaxGuests() + 1)
                .build();

        mockMvc.perform(post("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ROOM_CAPACITY_EXCEEDED")));
    }

    @Test
    @DisplayName("API-MGR-BOOK-02: Ngày nhận phòng ở quá khứ trả về 400 INVALID_DATE_RANGE")
    void createBookingRejectsDateInPast() throws Exception {
        ManagerCreateBookingRequest req = ManagerCreateBookingRequest.builder()
                .contactName("Khách Thử")
                .contactPhone("0987111222")
                .roomIds(List.of(room1.getId()))
                .checkInDate(LocalDate.now().minusDays(1))
                .checkOutDate(LocalDate.now().plusDays(2))
                .guestCount(2)
                .build();

        mockMvc.perform(post("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("INVALID_DATE_RANGE")));
    }

    @Test
    @DisplayName("API-MGR-BOOK-02: Phòng bị trùng lịch giữ chỗ trả về 409 ROOM_NOT_AVAILABLE")
    void createBookingRejectsConflictingDates() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(30);
        LocalDate checkOut = LocalDate.now().plusDays(33);

        createSampleBooking(homestay1Id, room1, "HS-CONF-001", "0988111999", "Khách 1",
                checkIn, checkOut, BookingStatus.PENDING_DEPOSIT);

        ManagerCreateBookingRequest req = ManagerCreateBookingRequest.builder()
                .contactName("Khách Trùng Lịch")
                .contactPhone("0987333444")
                .roomIds(List.of(room1.getId()))
                .checkInDate(checkIn.plusDays(1)) // Gối lên ngày của booking trên
                .checkOutDate(checkOut.plusDays(1))
                .guestCount(2)
                .build();

        mockMvc.perform(post("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ROOM_NOT_AVAILABLE")));
    }

    @Test
    @DisplayName("API-MGR-BOOK-02: Chưa đăng nhập trả về 401 hoặc Customer trả về 403")
    void createBookingRejectsUnauthorized() throws Exception {
        ManagerCreateBookingRequest req = ManagerCreateBookingRequest.builder()
                .contactName("Khách Thử")
                .contactPhone("0987111222")
                .roomIds(List.of(room1.getId()))
                .checkInDate(LocalDate.now().plusDays(10))
                .checkOutDate(LocalDate.now().plusDays(12))
                .guestCount(2)
                .build();

        // Chưa đăng nhập
        mockMvc.perform(post("/api/v1/manager/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());

        // Customer
        User customer = userRepository.saveAndFlush(User.builder()
                .email("cust-book-mgr-" + UUID.randomUUID() + "@example.com")
                .passwordHash("hashed")
                .fullName("Khách hàng")
                .phone("0988000555")
                .role(Role.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build());
        String customerToken = jwtService.generateAccessToken(customer);

        mockMvc.perform(post("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("API-MGR-BOOK-02: Email sai định dạng biểu thức chính quy trả về 400 VALIDATION_ERROR")
    void createBookingRejectsInvalidEmail() throws Exception {
        ManagerCreateBookingRequest req = ManagerCreateBookingRequest.builder()
                .contactName("Khách Email Sai")
                .contactPhone("0987111222")
                .contactEmail("khach-invalid-email")
                .roomIds(List.of(room1.getId()))
                .checkInDate(LocalDate.now().plusDays(10))
                .checkOutDate(LocalDate.now().plusDays(12))
                .guestCount(2)
                .build();

        mockMvc.perform(post("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("VALIDATION_ERROR")));
    }

    @Test
    @DisplayName("API-MGR-BOOK-02: Email là null (không bắt buộc) vẫn tạo đơn thành công (201 Created)")
    void createBookingWithNullEmailSuccess() throws Exception {
        ManagerCreateBookingRequest req = ManagerCreateBookingRequest.builder()
                .contactName("Khách Không Có Email")
                .contactPhone("0987999888")
                .contactEmail(null)
                .roomIds(List.of(room1.getId()))
                .checkInDate(LocalDate.now().plusDays(40))
                .checkOutDate(LocalDate.now().plusDays(42))
                .guestCount(2)
                .build();

        mockMvc.perform(post("/api/v1/manager/bookings")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.code", startsWith("HS-")));
    }

    // ── API-MGR-BOOK-03: Chi tiết booking ────────────────────────────────────

    @Test
    @DisplayName("API-MGR-BOOK-03: Manager xem chi tiết booking thành công (200 OK)")
    void getBookingDetailSuccess() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(50);
        LocalDate checkOut = LocalDate.now().plusDays(52);
        Booking booking = createSampleBooking(homestay1Id, room1, "HS-DET-" + UUID.randomUUID().toString().substring(0, 4),
                "0988555666", "Khách Chi Tiết", checkIn, checkOut, BookingStatus.PENDING_DEPOSIT);

        mockMvc.perform(get("/api/v1/manager/bookings/" + booking.getId())
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(booking.getId().intValue())))
                .andExpect(jsonPath("$.data.code", is(booking.getCode())))
                .andExpect(jsonPath("$.data.homestayId", is(homestay1Id.intValue())))
                .andExpect(jsonPath("$.data.homestayName", notNullValue()))
                .andExpect(jsonPath("$.data.contactName", is("Khách Chi Tiết")))
                .andExpect(jsonPath("$.data.contactPhone", is("0988555666")))
                .andExpect(jsonPath("$.data.contactEmail", is("test@example.com")))
                .andExpect(jsonPath("$.data.source", is("MANAGER")))
                .andExpect(jsonPath("$.data.status", is("PENDING_DEPOSIT")))
                .andExpect(jsonPath("$.data.roomTotalPrice", is(1_000_000)))
                .andExpect(jsonPath("$.data.depositAmount", is(300_000)))
                .andExpect(jsonPath("$.data.paidAmount", is(0)))
                .andExpect(jsonPath("$.data.outstandingAmount", is(1_000_000)))
                .andExpect(jsonPath("$.data.holdExpiresAt", notNullValue()))
                .andExpect(jsonPath("$.data.paymentInstruction", notNullValue()))
                .andExpect(jsonPath("$.data.rooms", hasSize(1)))
                .andExpect(jsonPath("$.data.rooms[0].roomId", is(room1.getId().intValue())))
                .andExpect(jsonPath("$.data.rooms[0].name", is(room1.getName())))
                .andExpect(jsonPath("$.data.rooms[0].roomName", is(room1.getName())))
                .andExpect(jsonPath("$.data.rooms[0].nights", hasSize(2)))
                .andExpect(jsonPath("$.data.rooms[0].nights[0].nightlyPrice", is(500_000)))
                .andExpect(jsonPath("$.data.rooms[0].nights[0].appliedRuleName", is("BASE")));
    }

    @Test
    @DisplayName("API-MGR-BOOK-03: Booking không tồn tại trả về 404 BOOKING_NOT_FOUND")
    void getBookingDetailRejectsNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/manager/bookings/99999999")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("BOOKING_NOT_FOUND")));
    }

    @Test
    @DisplayName("API-MGR-BOOK-03: Manager xem booking thuộc cơ sở khác trả về 403 HOMESTAY_SCOPE_VIOLATION")
    void getBookingDetailRejectsScopeViolation() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(55);
        LocalDate checkOut = LocalDate.now().plusDays(57);
        // Tạo booking thuộc cơ sở 2 (Mộc Châu)
        Booking bookingHomestay2 = createSampleBooking(homestay2Id, room2, "HS-MOC-" + UUID.randomUUID().toString().substring(0, 4),
                "0988777888", "Khách Mộc Châu", checkIn, checkOut, BookingStatus.PENDING_DEPOSIT);

        // Manager 1 (quản lý cơ sở 1 Mai Châu) cố tình truy cập booking cơ sở 2
        mockMvc.perform(get("/api/v1/manager/bookings/" + bookingHomestay2.getId())
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_SCOPE_VIOLATION")));
    }

    @Test
    @DisplayName("API-MGR-BOOK-03: Manager chưa phân công cơ sở trả về 400 HOMESTAY_NOT_ASSIGNED")
    void getBookingDetailRejectsUnassignedManager() throws Exception {
        User unassigned = userRepository.saveAndFlush(User.builder()
                .email("unassigned.mgr.detail." + UUID.randomUUID() + "@homestay.vn")
                .passwordHash("hashed")
                .fullName("Quản lý chưa gán")
                .phone("0988000777")
                .role(Role.MANAGER)
                .status(UserStatus.ACTIVE)
                .build());
        String unassignedToken = jwtService.generateAccessToken(unassigned);

        mockMvc.perform(get("/api/v1/manager/bookings/1")
                        .header("Authorization", "Bearer " + unassignedToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_NOT_ASSIGNED")));
    }

    @Test
    @DisplayName("API-MGR-BOOK-03: Chưa đăng nhập hoặc Customer truy cập trả về 401/403")
    void getBookingDetailRejectsUnauthorized() throws Exception {
        // 1. Chưa đăng nhập -> 401
        mockMvc.perform(get("/api/v1/manager/bookings/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());

        // 2. Customer -> 403
        User customer = userRepository.saveAndFlush(User.builder()
                .email("cust.access.mgr.detail." + UUID.randomUUID() + "@example.com")
                .passwordHash("hashed")
                .fullName("Khách hàng thường")
                .phone("0988000888")
                .role(Role.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build());
        String custToken = jwtService.generateAccessToken(customer);

        mockMvc.perform(get("/api/v1/manager/bookings/1")
                        .header("Authorization", "Bearer " + custToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("API-MGR-BOOK-03: Đơn đã CONFIRMED không còn thông tin hướng dẫn nộp cọc")
    void getBookingDetailConfirmedHasNoPaymentInstruction() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(60);
        LocalDate checkOut = LocalDate.now().plusDays(62);
        Booking booking = createSampleBooking(homestay1Id, room1, "HS-CONF-" + UUID.randomUUID().toString().substring(0, 4),
                "0988999111", "Khách Đã Xác Nhận", checkIn, checkOut, BookingStatus.CONFIRMED);

        mockMvc.perform(get("/api/v1/manager/bookings/" + booking.getId())
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.status", is("CONFIRMED")))
                .andExpect(jsonPath("$.data.paymentInstruction").doesNotExist());
    }

    // ── API-MGR-BOOK-04: Điều chỉnh booking ─────────────────────────────────

    @Test
    @DisplayName("API-MGR-BOOK-04: Điều chỉnh booking PENDING_DEPOSIT thành công (200 OK)")
    void adjustBookingPendingDepositSuccess() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(70);
        LocalDate checkOut = LocalDate.now().plusDays(72);
        Booking booking = createSampleBooking(homestay1Id, room1, "HS-ADJ-" + UUID.randomUUID().toString().substring(0, 4),
                "0988111222", "Khách Điều Chỉnh", checkIn, checkOut, BookingStatus.PENDING_DEPOSIT);

        // Kéo dài thêm 1 đêm (70 đến 73 = 3 đêm = 1.500.000đ, cọc 30% = 450.000đ)
        LocalDate newCheckOut = LocalDate.now().plusDays(73);
        ManagerAdjustBookingRequest request = ManagerAdjustBookingRequest.builder()
                .checkInDate(checkIn)
                .checkOutDate(newCheckOut)
                .guestCount(2)
                .reason("Khách yêu cầu thêm 1 đêm")
                .build();

        mockMvc.perform(patch("/api/v1/manager/bookings/" + booking.getId())
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(booking.getId().intValue())))
                .andExpect(jsonPath("$.data.status", is("PENDING_DEPOSIT")))
                .andExpect(jsonPath("$.data.checkInDate", is(checkIn.toString())))
                .andExpect(jsonPath("$.data.checkOutDate", is(newCheckOut.toString())))
                .andExpect(jsonPath("$.data.roomTotalPrice", greaterThan(0)))
                .andExpect(jsonPath("$.data.depositAmount", greaterThan(0)))
                .andExpect(jsonPath("$.data.updatedAt", notNullValue()));

        // Kiểm tra database: 3 đêm đã được tạo mới
        assertEquals(3, bookingRoomNightRepository.findByBookingId(booking.getId()).size());
    }

    @Test
    @DisplayName("API-MGR-BOOK-04: Manager không được điều chỉnh booking do Customer tự đặt")
    void adjustBookingRejectsCustomerCreatedBooking() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(70);
        LocalDate checkOut = LocalDate.now().plusDays(72);
        Booking booking = createSampleBooking(homestay1Id, room1,
                "HS-CUSTOMER-ADJ-" + UUID.randomUUID().toString().substring(0, 4),
                "0988000999", "Booking do khách tự đặt", checkIn, checkOut, BookingStatus.PENDING_DEPOSIT);
        User customer = userRepository.saveAndFlush(User.builder()
                .email("customer.booking.adjust." + UUID.randomUUID() + "@example.com")
                .passwordHash("hashed")
                .fullName("Khách tự đặt")
                .phone("0988000999")
                .role(Role.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build());
        booking.setCustomerId(customer.getId());
        booking.setCreatedBy(customer.getId());
        bookingRepository.saveAndFlush(booking);

        ManagerAdjustBookingRequest request = ManagerAdjustBookingRequest.builder()
                .checkOutDate(checkOut.plusDays(1))
                .reason("Thử chỉnh booking khách tự đặt")
                .build();

        mockMvc.perform(patch("/api/v1/manager/bookings/" + booking.getId())
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code", is("BOOKING_NOT_MANAGER_CREATED")));

        Booking unchanged = bookingRepository.findById(booking.getId()).orElseThrow();
        assertEquals(checkIn, unchanged.getCheckInDate());
        assertEquals(checkOut, unchanged.getCheckOutDate());
        assertEquals(2, bookingRoomNightRepository.findByBookingId(booking.getId()).size());
    }

    @Test
    @DisplayName("API-MGR-BOOK-04: Điều chỉnh booking CONFIRMED giữ nguyên tiền cọc đã chuyển (200 OK)")
    void adjustBookingConfirmedSuccess() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(80);
        LocalDate checkOut = LocalDate.now().plusDays(82);
        Booking booking = createSampleBooking(homestay1Id, room1, "HS-ADJ-CONF-" + UUID.randomUUID().toString().substring(0, 4),
                "0988222333", "Khách Đã Cọc", checkIn, checkOut, BookingStatus.CONFIRMED);
        Long originalDeposit = booking.getDepositAmount();

        LocalDate newCheckOut = LocalDate.now().plusDays(83); // Thêm 1 đêm
        ManagerAdjustBookingRequest request = ManagerAdjustBookingRequest.builder()
                .checkInDate(checkIn)
                .checkOutDate(newCheckOut)
                .guestCount(1)
                .reason("Khách kéo dài đêm, tiền cọc cũ giữ nguyên")
                .build();

        mockMvc.perform(patch("/api/v1/manager/bookings/" + booking.getId())
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.status", is("CONFIRMED")))
                .andExpect(jsonPath("$.data.guestCount", is(1)))
                .andExpect(jsonPath("$.data.depositAmount", is(originalDeposit.intValue())));
    }

    @Test
    @DisplayName("API-MGR-BOOK-04: Điều chỉnh booking PENDING_APPROVAL giữ nguyên tiền cọc đã chuyển (200 OK)")
    void adjustBookingPendingApprovalSuccess() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(95);
        LocalDate checkOut = LocalDate.now().plusDays(97);
        Booking bookingApproval = createSampleBooking(homestay1Id, room1, "HS-APPR-" + UUID.randomUUID().toString().substring(0, 4),
                "0988666777", "Khách Chờ Duyệt", checkIn, checkOut, BookingStatus.PENDING_APPROVAL);
        Long originalDeposit = bookingApproval.getDepositAmount();

        LocalDate newCheckOut = LocalDate.now().plusDays(98); // Kéo dài thêm 1 đêm
        ManagerAdjustBookingRequest request = ManagerAdjustBookingRequest.builder()
                .checkInDate(checkIn)
                .checkOutDate(newCheckOut)
                .guestCount(2)
                .reason("Khách yêu cầu thêm đêm khi đang chờ duyệt cọc")
                .build();

        mockMvc.perform(patch("/api/v1/manager/bookings/" + bookingApproval.getId())
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.status", is("PENDING_APPROVAL")))
                .andExpect(jsonPath("$.data.roomTotalPrice", greaterThan(0)))
                .andExpect(jsonPath("$.data.depositAmount", is(originalDeposit.intValue())));
    }

    @Test
    @DisplayName("API-MGR-BOOK-04: Booking không tồn tại trả về 404 BOOKING_NOT_FOUND")
    void adjustBookingRejectsNotFound() throws Exception {
        ManagerAdjustBookingRequest request = ManagerAdjustBookingRequest.builder()
                .guestCount(2)
                .build();

        mockMvc.perform(patch("/api/v1/manager/bookings/99999999")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("BOOKING_NOT_FOUND")));
    }

    @Test
    @DisplayName("API-MGR-BOOK-04: Manager cơ sở khác cố tình điều chỉnh trả về 403 HOMESTAY_SCOPE_VIOLATION")
    void adjustBookingRejectsScopeViolation() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(85);
        LocalDate checkOut = LocalDate.now().plusDays(87);
        Booking bookingHomestay2 = createSampleBooking(homestay2Id, room2, "HS-MOC-ADJ-" + UUID.randomUUID().toString().substring(0, 4),
                "0988444555", "Khách Homestay 2", checkIn, checkOut, BookingStatus.PENDING_DEPOSIT);

        ManagerAdjustBookingRequest request = ManagerAdjustBookingRequest.builder()
                .guestCount(2)
                .build();

        mockMvc.perform(patch("/api/v1/manager/bookings/" + bookingHomestay2.getId())
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_SCOPE_VIOLATION")));
    }

    @Test
    @DisplayName("API-MGR-BOOK-04: Trạng thái CANCELLED trả về 409 BOOKING_STATE_CONFLICT")
    void adjustBookingRejectsStateConflict() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(90);
        LocalDate checkOut = LocalDate.now().plusDays(92);
        Booking bookingCancelled = createSampleBooking(homestay1Id, room1, "HS-CANC-" + UUID.randomUUID().toString().substring(0, 4),
                "0988666777", "Khách Đã Hủy", checkIn, checkOut, BookingStatus.CANCELLED);

        ManagerAdjustBookingRequest request = ManagerAdjustBookingRequest.builder()
                .guestCount(1)
                .build();

        mockMvc.perform(patch("/api/v1/manager/bookings/" + bookingCancelled.getId())
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("BOOKING_STATE_CONFLICT")));
    }

    @Test
    @DisplayName("API-MGR-BOOK-04: Booking CONFIRMED quá hạn điều chỉnh (< 3 ngày) trả về 400 ADJUSTMENT_WINDOW_CLOSED")
    void adjustBookingRejectsWindowClosed() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(1); // Chỉ còn 1 ngày trước check-in
        LocalDate checkOut = LocalDate.now().plusDays(3);
        Booking bookingTooLate = createSampleBooking(homestay1Id, room1, "HS-LATE-" + UUID.randomUUID().toString().substring(0, 4),
                "0988777999", "Khách Quá Hạn Điều Chỉnh", checkIn, checkOut, BookingStatus.CONFIRMED);

        ManagerAdjustBookingRequest request = ManagerAdjustBookingRequest.builder()
                .guestCount(1)
                .build();

        mockMvc.perform(patch("/api/v1/manager/bookings/" + bookingTooLate.getId())
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ADJUSTMENT_WINDOW_CLOSED")));
    }

    @Test
    @DisplayName("API-MGR-BOOK-04: Đổi sang phòng đang bị khóa trả về 409 ROOM_LOCKED")
    void adjustBookingRejectsLockedRoom() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(100);
        LocalDate checkOut = LocalDate.now().plusDays(102);
        Booking booking = createSampleBooking(homestay1Id, room1, "HS-ADJ-LOCK-" + UUID.randomUUID().toString().substring(0, 4),
                "0988999888", "Khách Thử Đổi Phòng Khóa", checkIn, checkOut, BookingStatus.PENDING_DEPOSIT);

        Room lockedRoom = new Room();
        lockedRoom.setHomestayId(homestay1Id);
        lockedRoom.setRoomTypeId(room1.getRoomTypeId());
        lockedRoom.setName("Phòng Khóa Điều Chỉnh");
        lockedRoom.setMaxGuests((byte) 2);
        lockedRoom.setStatus(RoomStatus.LOCKED);
        lockedRoom = roomRepository.saveAndFlush(lockedRoom);

        ManagerAdjustBookingRequest request = ManagerAdjustBookingRequest.builder()
                .roomIds(List.of(lockedRoom.getId()))
                .build();

        mockMvc.perform(patch("/api/v1/manager/bookings/" + booking.getId())
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ROOM_LOCKED")));
    }

    @Test
    @DisplayName("API-MGR-BOOK-04: Ngày nhận phòng ở quá khứ hoặc checkout <= checkin trả về 400 INVALID_DATE_RANGE")
    void adjustBookingRejectsInvalidDates() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(105);
        LocalDate checkOut = LocalDate.now().plusDays(107);
        Booking booking = createSampleBooking(homestay1Id, room1, "HS-ADJ-DATE-" + UUID.randomUUID().toString().substring(0, 4),
                "0988111333", "Khách Thử Ngày Sai", checkIn, checkOut, BookingStatus.PENDING_DEPOSIT);

        // Checkout <= Checkin
        ManagerAdjustBookingRequest requestInvalidRange = ManagerAdjustBookingRequest.builder()
                .checkInDate(checkIn)
                .checkOutDate(checkIn)
                .build();

        mockMvc.perform(patch("/api/v1/manager/bookings/" + booking.getId())
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestInvalidRange)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("INVALID_DATE_RANGE")));
    }

    @Test
    @DisplayName("API-MGR-BOOK-04: Chưa đăng nhập (401) hoặc Customer truy cập (403)")
    void adjustBookingRejectsUnauthorized() throws Exception {
        ManagerAdjustBookingRequest request = ManagerAdjustBookingRequest.builder().guestCount(2).build();

        // 1. Chưa đăng nhập
        mockMvc.perform(patch("/api/v1/manager/bookings/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());

        // 2. Customer
        User customer = userRepository.saveAndFlush(User.builder()
                .email("cust.mgr.adj." + UUID.randomUUID() + "@example.com")
                .passwordHash("hashed")
                .fullName("Khách hàng")
                .phone("0988000999")
                .role(Role.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build());
        String customerToken = jwtService.generateAccessToken(customer);

        mockMvc.perform(patch("/api/v1/manager/bookings/1")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }
}
