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
import vn.edu.hust.homestay.booking.dto.CreateBookingRequest;
import vn.edu.hust.homestay.booking.entity.BookingRoomNight;
import vn.edu.hust.homestay.booking.repository.BookingRepository;
import vn.edu.hust.homestay.booking.repository.BookingRoomNightRepository;
import vn.edu.hust.homestay.homestay.entity.Homestay;
import vn.edu.hust.homestay.homestay.repository.HomestayRepository;
import vn.edu.hust.homestay.pricing.entity.PriceRule;
import vn.edu.hust.homestay.pricing.repository.PriceRuleRepository;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;
import vn.edu.hust.homestay.room.repository.RoomRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
class CustomerBookingTests {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private HomestayRepository homestayRepository;
    @Autowired private PriceRuleRepository priceRuleRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private BookingRoomNightRepository bookingRoomNightRepository;
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

        // Đọc chi tiết booking
        String detailRes = mockMvc.perform(get("/api/v1/customer/bookings/" + bookingId)
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rooms", hasSize(1)))
                .andExpect(jsonPath("$.data.rooms[0].nights", hasSize(2)))
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
        org.junit.jupiter.api.Assertions.assertEquals(0L, paidAmount);
        org.junit.jupiter.api.Assertions.assertEquals(roomTotalPrice, outstandingAmount);
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

    private CreateBookingRequest bookingRequest(LocalDate checkInDate, int guestCount) {
        return bookingRequest(checkInDate, 1, guestCount);
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
