package vn.edu.hust.homestay;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
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
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
class ManagerReportTests {

    private static final ZoneId BUSINESS_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private BookingRoomRepository bookingRoomRepository;
    @Autowired private BookingRoomNightRepository bookingRoomNightRepository;
    @Autowired private JwtService jwtService;

    private MockMvc mockMvc;
    private User manager;
    private User otherManager;
    private User customer;
    private String managerToken;
    private String otherManagerToken;
    private String customerToken;
    private List<Room> activeRooms;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
        manager = userRepository.findByEmail("manager.maichau@homestay.vn").orElseThrow();
        otherManager = userRepository.findByEmail("manager.mocchau@homestay.vn").orElseThrow();
        customer = userRepository.findByEmail("an.nguyen@example.com")
                .orElseGet(() -> userRepository.findByEmail("customer@gmail.com").orElseThrow());
        managerToken = jwtService.generateAccessToken(manager);
        otherManagerToken = jwtService.generateAccessToken(otherManager);
        customerToken = jwtService.generateAccessToken(customer);
        activeRooms = roomRepository.findByHomestayIdAndStatus(manager.getHomestayId(), RoomStatus.ACTIVE);
    }

    @Test
    @DisplayName("API-REPORT-MGR-01: báo cáo đếm đúng booking và room-night theo kỳ, homestay và trạng thái")
    void overviewCountsOnlyReportableBookingsAndNightsInRange() throws Exception {
        if (activeRooms.size() < 4) throw new AssertionError("Test fixture cần ít nhất 4 phòng ACTIVE");
        LocalDate fromDate = LocalDate.of(2042, 4, 10);
        LocalDate toDate = LocalDate.of(2042, 4, 11);

        createBookingWithNights(activeRooms.get(0), "OVERLAP", BookingStatus.CONFIRMED,
                fromDate.minusDays(1), toDate.plusDays(1));
        createBookingWithNights(activeRooms.get(1), "CHECKED-IN", BookingStatus.CHECKED_IN,
                fromDate, fromDate.plusDays(1));
        createBookingWithNights(activeRooms.get(2), "CHECKED-OUT", BookingStatus.CHECKED_OUT,
                toDate, toDate.plusDays(1));
        createBookingWithNights(activeRooms.get(3), "PENDING", BookingStatus.PENDING_APPROVAL,
                fromDate, fromDate.plusDays(1));
        createBookingWithNights(activeRooms.get(3), "CHECKOUT-ON-START", BookingStatus.CONFIRMED,
                fromDate.minusDays(2), fromDate);

        long activeRoomCount = roomRepository.countByHomestayIdAndStatus(manager.getHomestayId(), RoomStatus.ACTIVE);
        mockMvc.perform(get("/api/v1/manager/reports/overview")
                        .header("Authorization", "Bearer " + managerToken)
                        .param("fromDate", fromDate.toString())
                        .param("toDate", toDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.fromDate", is(fromDate.toString())))
                .andExpect(jsonPath("$.data.toDate", is(toDate.toString())))
                .andExpect(jsonPath("$.data.bookingCount", is(3)))
                .andExpect(jsonPath("$.data.checkIns", is(2)))
                .andExpect(jsonPath("$.data.checkOuts", is(2)))
                .andExpect(jsonPath("$.data.activeRooms", is((int) activeRoomCount)))
                .andExpect(jsonPath("$.data.occupiedRoomNights", is(4)));
    }

    @Test
    @DisplayName("API-REPORT-MGR-01: mặc định từ đầu tháng đến hôm nay theo giờ Việt Nam")
    void overviewDefaultsToCurrentMonthToToday() throws Exception {
        LocalDate today = LocalDate.now(BUSINESS_TIME_ZONE);
        mockMvc.perform(get("/api/v1/manager/reports/overview")
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fromDate", is(today.withDayOfMonth(1).toString())))
                .andExpect(jsonPath("$.data.toDate", is(today.toString())));
    }

    @Test
    @DisplayName("API-REPORT-MGR-01: ngày không hợp lệ trả INVALID_DATE_RANGE")
    void invalidDateRangeIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/manager/reports/overview")
                        .header("Authorization", "Bearer " + managerToken)
                        .param("fromDate", "2042-04-12")
                        .param("toDate", "2042-04-10"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_DATE_RANGE")));

        mockMvc.perform(get("/api/v1/manager/reports/overview")
                        .header("Authorization", "Bearer " + managerToken)
                        .param("fromDate", "10/04/2042"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_DATE_RANGE")));
    }

    @Test
    @DisplayName("API-REPORT-MGR-01: báo cáo bị giới hạn vào homestay của Manager")
    void reportIsScopedToAuthenticatedManagersHomestay() throws Exception {
        if (activeRooms.isEmpty()) throw new AssertionError("Test fixture cần phòng ACTIVE");
        LocalDate fromDate = LocalDate.of(2043, 8, 10);
        LocalDate toDate = fromDate.plusDays(1);
        createBookingWithNights(activeRooms.get(0), "SCOPE", BookingStatus.CONFIRMED, fromDate, toDate);

        mockMvc.perform(get("/api/v1/manager/reports/overview")
                        .header("Authorization", "Bearer " + otherManagerToken)
                        .param("fromDate", fromDate.toString())
                        .param("toDate", toDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bookingCount", is(0)))
                .andExpect(jsonPath("$.data.occupiedRoomNights", is(0)));
    }

    @Test
    @DisplayName("API-REPORT-MGR-01: Manager chưa được gán cơ sở và Customer bị từ chối")
    void rejectsUnassignedManagerAndCustomer() throws Exception {
        User unassignedManager = new User();
        unassignedManager.setEmail("report-unassigned-" + UUID.randomUUID() + "@homestay.test");
        unassignedManager.setPasswordHash("test-only");
        unassignedManager.setFullName("Manager chưa gán");
        unassignedManager.setPhone("099" + UUID.randomUUID().toString().replace("-", "").substring(0, 7));
        unassignedManager.setRole(Role.MANAGER);
        unassignedManager.setStatus(UserStatus.ACTIVE);
        unassignedManager = userRepository.saveAndFlush(unassignedManager);

        mockMvc.perform(get("/api/v1/manager/reports/overview")
                        .header("Authorization", "Bearer " + jwtService.generateAccessToken(unassignedManager)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_NOT_ASSIGNED")));

        mockMvc.perform(get("/api/v1/manager/reports/overview")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());
    }

    private Booking createBookingWithNights(
            Room room, String suffix, BookingStatus status, LocalDate checkIn, LocalDate checkOut
    ) {
        Booking booking = new Booking();
        booking.setCode("RPT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8));
        booking.setHomestayId(manager.getHomestayId());
        booking.setContactName("Report test");
        booking.setContactPhone("0900000000");
        booking.setCheckInDate(checkIn);
        booking.setCheckOutDate(checkOut);
        booking.setGuestCount((short) 1);
        booking.setStatus(status);
        booking.setRoomTotalPrice(100_000L);
        booking.setDepositAmount(30_000L);
        booking.setHoldExpiresAt(LocalDateTime.now(ZoneOffset.UTC).plusDays(1));
        booking.setCreatedBy(manager.getId());
        booking.setPolicySnapshot("{}");
        if (status == BookingStatus.CONFIRMED || status == BookingStatus.CHECKED_IN || status == BookingStatus.CHECKED_OUT) {
            booking.setApprovedBy(manager.getId());
            booking.setApprovedAt(Instant.now());
        }
        Booking saved = bookingRepository.saveAndFlush(booking);
        bookingRoomRepository.saveAndFlush(new BookingRoom(saved.getId(), manager.getHomestayId(), room.getId()));
        for (LocalDate stayDate = checkIn; stayDate.isBefore(checkOut); stayDate = stayDate.plusDays(1)) {
            bookingRoomNightRepository.saveAndFlush(new BookingRoomNight(
                    room.getId(), stayDate, saved.getId(), manager.getHomestayId(), 100_000L, "BASE"));
        }
        return saved;
    }
}
