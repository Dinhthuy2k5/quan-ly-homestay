package vn.edu.hust.homestay;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
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
import vn.edu.hust.homestay.booking.repository.BookingRepository;
import vn.edu.hust.homestay.homestay.dto.CreateDirectorHomestayRequest;
import vn.edu.hust.homestay.homestay.dto.UpdateDirectorHomestayRequest;
import vn.edu.hust.homestay.homestay.entity.Homestay;
import vn.edu.hust.homestay.homestay.entity.Homestay.HomestayStatus;
import vn.edu.hust.homestay.homestay.repository.HomestayRepository;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;
import vn.edu.hust.homestay.room.entity.RoomType;
import vn.edu.hust.homestay.room.repository.RoomRepository;
import vn.edu.hust.homestay.room.repository.RoomTypeRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiểm thử tích hợp cho API-DIR-HS-01 (GET/POST /api/v1/director/homestays)
 * và API-DIR-HS-02 (PATCH /api/v1/director/homestays/{homestayId}).
 */
@SpringBootTest
@Transactional
class DirectorHomestayTests {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private HomestayRepository homestayRepository;
    @Autowired private RoomTypeRepository roomTypeRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private JwtService jwtService;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private User director;
    private User lockedDirector;
    private User admin;
    private User manager;
    private User customer;

    private String directorToken;
    private String lockedDirectorToken;
    private String adminToken;
    private String managerToken;
    private String customerToken;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
        objectMapper = new ObjectMapper();

        director = createUser(Role.DIRECTOR, UserStatus.ACTIVE, null);
        lockedDirector = createUser(Role.DIRECTOR, UserStatus.LOCKED, null);
        admin = createUser(Role.ADMIN, UserStatus.ACTIVE, null);
        manager = createUser(Role.MANAGER, UserStatus.ACTIVE, null);
        customer = createUser(Role.CUSTOMER, UserStatus.ACTIVE, null);

        directorToken = jwtService.generateAccessToken(director);
        lockedDirectorToken = jwtService.generateAccessToken(lockedDirector);
        adminToken = jwtService.generateAccessToken(admin);
        managerToken = jwtService.generateAccessToken(manager);
        customerToken = jwtService.generateAccessToken(customer);
    }

    @Test
    @DisplayName("API-DIR-HS-01 (POST): Director tạo homestay mới thành công với hotline cố định 11 số và +84")
    void createHomestaySuccess() throws Exception {
        String uniqueSuffix = UUID.randomUUID().toString().substring(0, 8);
        CreateDirectorHomestayRequest request = CreateDirectorHomestayRequest.builder()
                .name("  Mộc Châu Pine " + uniqueSuffix + "  ")
                .province("  Sơn La  ")
                .address("  Bản Áng, Đông Sang, Mộc Châu  ")
                .hotlinePhone("02123881234")
                .description("  Khu nghỉ dưỡng rừng thông  ")
                .build();

        mockMvc.perform(post("/api/v1/director/homestays")
                        .header("Authorization", "Bearer " + directorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.name", is("Mộc Châu Pine " + uniqueSuffix)))
                .andExpect(jsonPath("$.data.province", is("Sơn La")))
                .andExpect(jsonPath("$.data.address", is("Bản Áng, Đông Sang, Mộc Châu")))
                .andExpect(jsonPath("$.data.hotlinePhone", is("02123881234")))
                .andExpect(jsonPath("$.data.description", is("Khu nghỉ dưỡng rừng thông")))
                .andExpect(jsonPath("$.data.status", is("ACTIVE")))
                .andExpect(jsonPath("$.data.manager", nullValue()))
                .andExpect(jsonPath("$.data.totalRooms", is(0)))
                .andExpect(jsonPath("$.data.activeRooms", is(0)));

        // Trùng tên nhưng khác tỉnh/thành vẫn hợp lệ theo uq_homestays_name (province, name)
        CreateDirectorHomestayRequest sameNameOtherProvince = CreateDirectorHomestayRequest.builder()
                .name("Mộc Châu Pine " + uniqueSuffix)
                .province("Hòa Bình")
                .address("Bản Lác, Mai Châu")
                .hotlinePhone("+842183881234")
                .description("")
                .build();

        mockMvc.perform(post("/api/v1/director/homestays")
                        .header("Authorization", "Bearer " + directorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sameNameOtherProvince)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.hotlinePhone", is("+842183881234")))
                .andExpect(jsonPath("$.data.description", nullValue()));
    }

    @Test
    @DisplayName("API-DIR-HS-01 (POST): trùng (province, name) trả 409 HOMESTAY_NAME_EXISTS; thiếu/sai hotline trả 400 VALIDATION_ERROR")
    void createHomestayRejectsDuplicateNameAndInvalidInput() throws Exception {
        String uniqueSuffix = UUID.randomUUID().toString().substring(0, 8);
        createHomestayEntity("Sapa Valley " + uniqueSuffix, "Lào Cai", "Tả Van, Sa Pa", "02143881234", HomestayStatus.ACTIVE);

        // Trùng tên & tỉnh (khác hoa thường vẫn phải bị chặn)
        CreateDirectorHomestayRequest duplicate = CreateDirectorHomestayRequest.builder()
                .name("sapa valley " + uniqueSuffix)
                .province("lào cai")
                .address("Trung tâm Sa Pa")
                .hotlinePhone("02143889999")
                .build();

        mockMvc.perform(post("/api/v1/director/homestays")
                        .header("Authorization", "Bearer " + directorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicate)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_NAME_EXISTS")));

        // Thiếu hotlinePhone
        CreateDirectorHomestayRequest missingHotline = CreateDirectorHomestayRequest.builder()
                .name("New HS " + uniqueSuffix)
                .province("Lào Cai")
                .address("Tả Phìn")
                .hotlinePhone("")
                .build();

        mockMvc.perform(post("/api/v1/director/homestays")
                        .header("Authorization", "Bearer " + directorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(missingHotline)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("VALIDATION_ERROR")));

        // Sai định dạng hotlinePhone
        CreateDirectorHomestayRequest invalidHotline = CreateDirectorHomestayRequest.builder()
                .name("New HS 2 " + uniqueSuffix)
                .province("Lào Cai")
                .address("Tả Phìn")
                .hotlinePhone("12345")
                .build();

        mockMvc.perform(post("/api/v1/director/homestays")
                        .header("Authorization", "Bearer " + directorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidHotline)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("VALIDATION_ERROR")));
    }

    @Test
    @DisplayName("API-DIR-HS-01 (GET): liệt kê homestay toàn công ty gồm cả ACTIVE/INACTIVE, kèm Manager, số phòng, lọc và phân trang")
    void listHomestaysSupportsFiltersPaginationManagerAndRoomStats() throws Exception {
        String tag = "DIRLIST-" + UUID.randomUUID().toString().substring(0, 6);
        Homestay activeHs = createHomestayEntity(
                tag + " Active", "Ninh Bình " + tag, "Tràng An, Ninh Bình", "02293881111", HomestayStatus.ACTIVE);
        Homestay inactiveHs = createHomestayEntity(
                tag + " Inactive", "Ninh Bình " + tag, "Tam Cốc, Ninh Bình", "02293882222", HomestayStatus.INACTIVE);

        // Gán Manager cho activeHs và tạo 2 phòng (1 ACTIVE, 1 LOCKED)
        manager.setHomestayId(activeHs.getId());
        userRepository.saveAndFlush(manager);

        RoomType roomType = new RoomType();
        roomType.setHomestayId(activeHs.getId());
        roomType.setName("Deluxe " + tag);
        roomType = roomTypeRepository.saveAndFlush(roomType);
        createRoomEntity(activeHs.getId(), roomType.getId(), "P101-" + tag, RoomStatus.ACTIVE);
        createRoomEntity(activeHs.getId(), roomType.getId(), "P102-" + tag, RoomStatus.LOCKED);

        // Lọc theo keyword = tag → thấy cả 2 cơ sở (ACTIVE và INACTIVE) cùng manager và thống kê phòng
        mockMvc.perform(get("/api/v1/director/homestays")
                        .header("Authorization", "Bearer " + directorToken)
                        .param("keyword", tag)
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.meta.page", is(0)))
                .andExpect(jsonPath("$.meta.size", is(10)))
                .andExpect(jsonPath("$.meta.totalElements", is(2)))
                .andExpect(jsonPath("$.meta.totalPages", is(1)))
                .andExpect(jsonPath("$.data[?(@.id == " + activeHs.getId() + ")].status", contains("ACTIVE")))
                .andExpect(jsonPath("$.data[?(@.id == " + activeHs.getId() + ")].totalRooms", contains(2)))
                .andExpect(jsonPath("$.data[?(@.id == " + activeHs.getId() + ")].activeRooms", contains(1)))
                .andExpect(jsonPath("$.data[?(@.id == " + activeHs.getId() + ")].manager.id", contains(manager.getId().intValue())))
                .andExpect(jsonPath("$.data[?(@.id == " + inactiveHs.getId() + ")].status", contains("INACTIVE")))
                .andExpect(jsonPath("$.data[?(@.id == " + inactiveHs.getId() + ")].totalRooms", contains(0)));

        // Lọc theo status=INACTIVE và province
        mockMvc.perform(get("/api/v1/director/homestays")
                        .header("Authorization", "Bearer " + directorToken)
                        .param("status", "INACTIVE")
                        .param("province", "Ninh Bình " + tag))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].id", is(inactiveHs.getId().intValue())))
                .andExpect(jsonPath("$.data[0].manager", nullValue()));

        // Phân trang size=1
        mockMvc.perform(get("/api/v1/director/homestays")
                        .header("Authorization", "Bearer " + directorToken)
                        .param("keyword", tag)
                        .param("page", "0")
                        .param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.meta.totalElements", is(2)))
                .andExpect(jsonPath("$.meta.totalPages", is(2)))
                .andExpect(jsonPath("$.meta.first", is(true)))
                .andExpect(jsonPath("$.meta.last", is(false)));

        // Trạng thái query không hợp lệ → 400 VALIDATION_ERROR
        mockMvc.perform(get("/api/v1/director/homestays")
                        .header("Authorization", "Bearer " + directorToken)
                        .param("status", "DELETED"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("VALIDATION_ERROR")));
    }

    @Test
    @DisplayName("API-DIR-HS-02 (PATCH): cập nhật partial thông tin, kiểm tra trùng tên và kích hoạt lại cơ sở")
    void updateHomestayPartialAndReactivate() throws Exception {
        String tag = UUID.randomUUID().toString().substring(0, 6);
        Homestay target = createHomestayEntity(
                "Ha Giang Lodge " + tag, "Hà Giang", "Đồng Văn", "02193881234", HomestayStatus.INACTIVE);
        Homestay other = createHomestayEntity(
                "Ha Giang Existing " + tag, "Hà Giang", "Mèo Vạc", "02193885678", HomestayStatus.ACTIVE);

        // Partial update chỉ đổi địa chỉ, hotline và kích hoạt lại ACTIVE
        UpdateDirectorHomestayRequest patchReq = UpdateDirectorHomestayRequest.builder()
                .address("Phố cổ Đồng Văn, Hà Giang")
                .hotlinePhone("02193889999")
                .status("ACTIVE")
                .build();

        mockMvc.perform(patch("/api/v1/director/homestays/{id}", target.getId())
                        .header("Authorization", "Bearer " + directorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(patchReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(target.getId().intValue())))
                .andExpect(jsonPath("$.data.name", is("Ha Giang Lodge " + tag)))
                .andExpect(jsonPath("$.data.province", is("Hà Giang")))
                .andExpect(jsonPath("$.data.address", is("Phố cổ Đồng Văn, Hà Giang")))
                .andExpect(jsonPath("$.data.hotlinePhone", is("02193889999")))
                .andExpect(jsonPath("$.data.status", is("ACTIVE")));

        // Đổi tên trùng với cơ sở khác trong cùng tỉnh → 409 HOMESTAY_NAME_EXISTS
        UpdateDirectorHomestayRequest duplicateNamePatch = UpdateDirectorHomestayRequest.builder()
                .name(other.getName())
                .build();

        mockMvc.perform(patch("/api/v1/director/homestays/{id}", target.getId())
                        .header("Authorization", "Bearer " + directorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicateNamePatch)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_NAME_EXISTS")));

        // Body rỗng hoàn toàn → 400 VALIDATION_ERROR
        mockMvc.perform(patch("/api/v1/director/homestays/{id}", target.getId())
                        .header("Authorization", "Bearer " + directorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("VALIDATION_ERROR")));

        // Homestay không tồn tại → 404 HOMESTAY_NOT_FOUND
        mockMvc.perform(patch("/api/v1/director/homestays/{id}", 999_999_999L)
                        .header("Authorization", "Bearer " + directorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"address\":\"Mới\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_NOT_FOUND")));
    }

    @Test
    @DisplayName("API-DIR-HS-02 (PATCH): chặn tạm ngừng khi còn booking hoạt động (kể cả CHECKED_IN quá hạn) và cho phép khi chỉ còn đơn kết thúc")
    void deactivateHomestayGuardsAgainstActiveBookings() throws Exception {
        String tag = UUID.randomUUID().toString().substring(0, 6);
        Homestay hsWithActive = createHomestayEntity(
                "Da Lat Villa " + tag, "Lâm Đồng", "Phường 3, Đà Lạt", "02633881234", HomestayStatus.ACTIVE);

        // Tạo đơn CHECKED_IN đã quá ngày trả phòng dự kiến nhưng khách chưa check-out
        createBookingEntity(hsWithActive.getId(), BookingStatus.CHECKED_IN,
                LocalDate.now().minusDays(5), LocalDate.now().minusDays(2));

        // Chuyển sang INACTIVE phải bị chặn 409 HOMESTAY_HAS_ACTIVE_BOOKINGS
        mockMvc.perform(patch("/api/v1/director/homestays/{id}", hsWithActive.getId())
                        .header("Authorization", "Bearer " + directorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"INACTIVE\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_HAS_ACTIVE_BOOKINGS")));

        // Nhưng chỉ sửa hotlinePhone (không đổi sang INACTIVE) vẫn được phép dù đang có booking
        mockMvc.perform(patch("/api/v1/director/homestays/{id}", hsWithActive.getId())
                        .header("Authorization", "Bearer " + directorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"hotlinePhone\":\"02633889999\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.hotlinePhone", is("02633889999")))
                .andExpect(jsonPath("$.data.status", is("ACTIVE")));

        // Cơ sở có đơn PENDING_DEPOSIT cũng bị chặn tạm ngừng
        Homestay hsWithPending = createHomestayEntity(
                "Da Lat Cabin " + tag, "Lâm Đồng", "Phường 4, Đà Lạt", "02633882222", HomestayStatus.ACTIVE);
        createBookingEntity(hsWithPending.getId(), BookingStatus.PENDING_DEPOSIT,
                LocalDate.now().plusDays(3), LocalDate.now().plusDays(5));

        mockMvc.perform(patch("/api/v1/director/homestays/{id}", hsWithPending.getId())
                        .header("Authorization", "Bearer " + directorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"INACTIVE\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_HAS_ACTIVE_BOOKINGS")));

        // Cơ sở chỉ còn các đơn đã kết thúc (CHECKED_OUT, CANCELLED, EXPIRED) được phép chuyển sang INACTIVE
        Homestay hsCompletedOnly = createHomestayEntity(
                "Da Lat Retreats " + tag, "Lâm Đồng", "Phường 5, Đà Lạt", "02633883333", HomestayStatus.ACTIVE);
        createBookingEntity(hsCompletedOnly.getId(), BookingStatus.CHECKED_OUT,
                LocalDate.now().minusDays(4), LocalDate.now().minusDays(2));
        createBookingEntity(hsCompletedOnly.getId(), BookingStatus.CANCELLED,
                LocalDate.now().plusDays(2), LocalDate.now().plusDays(4));
        createBookingEntity(hsCompletedOnly.getId(), BookingStatus.EXPIRED,
                LocalDate.now().plusDays(6), LocalDate.now().plusDays(7));

        mockMvc.perform(patch("/api/v1/director/homestays/{id}", hsCompletedOnly.getId())
                        .header("Authorization", "Bearer " + directorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"INACTIVE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("INACTIVE")));
    }

    @Test
    @DisplayName("RBAC: chỉ DIRECTOR ACTIVE được truy cập; chưa đăng nhập/LOCKED trả 401; ADMIN/MANAGER/CUSTOMER trả 403")
    void enforcesDirectorOnlyAccessControl() throws Exception {
        Homestay existing = createHomestayEntity(
                "RBAC Test " + UUID.randomUUID().toString().substring(0, 6),
                "Quảng Ninh", "Hạ Long", "02033881234", HomestayStatus.ACTIVE);

        String validCreateBody = objectMapper.writeValueAsString(CreateDirectorHomestayRequest.builder()
                .name("Unauthorized HS " + UUID.randomUUID().toString().substring(0, 6))
                .province("Quảng Ninh")
                .address("Bãi Cháy")
                .hotlinePhone("02033889999")
                .build());

        // Không có token → 401
        mockMvc.perform(get("/api/v1/director/homestays"))
                .andExpect(status().isUnauthorized());

        // Tài khoản DIRECTOR bị khóa → 401
        mockMvc.perform(get("/api/v1/director/homestays")
                        .header("Authorization", "Bearer " + lockedDirectorToken))
                .andExpect(status().isUnauthorized());

        // ADMIN, MANAGER, CUSTOMER đều bị từ chối 403 trên cả GET, POST, PATCH
        for (String forbiddenToken : new String[]{adminToken, managerToken, customerToken}) {
            mockMvc.perform(get("/api/v1/director/homestays")
                            .header("Authorization", "Bearer " + forbiddenToken))
                    .andExpect(status().isForbidden());

            mockMvc.perform(post("/api/v1/director/homestays")
                            .header("Authorization", "Bearer " + forbiddenToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(validCreateBody))
                    .andExpect(status().isForbidden());

            mockMvc.perform(patch("/api/v1/director/homestays/{id}", existing.getId())
                            .header("Authorization", "Bearer " + forbiddenToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"status\":\"INACTIVE\"}"))
                    .andExpect(status().isForbidden());
        }

        // DIRECTOR hợp lệ truy cập thành công
        mockMvc.perform(get("/api/v1/director/homestays")
                        .header("Authorization", "Bearer " + directorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.totalElements", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.data[*].id", hasItem(existing.getId().intValue())));
    }

    private User createUser(Role role, UserStatus status, Long homestayId) {
        String random = UUID.randomUUID().toString().replace("-", "");
        User user = new User();
        user.setEmail(role.name().toLowerCase() + "-" + random.substring(0, 10) + "@homestay.test");
        user.setPasswordHash("encoded-test-password");
        user.setFullName("Test " + role.name() + " " + random.substring(0, 4));
        user.setPhone("09" + random.replaceAll("[^0-9]", "1").concat("12345678").substring(0, 8));
        user.setRole(role);
        user.setStatus(status);
        user.setHomestayId(homestayId);
        return userRepository.saveAndFlush(user);
    }

    private Homestay createHomestayEntity(
            String name, String province, String address, String hotlinePhone, HomestayStatus status
    ) {
        Homestay hs = new Homestay();
        hs.setName(name);
        hs.setProvince(province);
        hs.setAddress(address);
        hs.setHotlinePhone(hotlinePhone);
        hs.setDescription("Mô tả " + name);
        hs.setStatus(status);
        return homestayRepository.saveAndFlush(hs);
    }

    private Room createRoomEntity(Long homestayId, Long roomTypeId, String name, RoomStatus status) {
        Room room = new Room();
        room.setHomestayId(homestayId);
        room.setRoomTypeId(roomTypeId);
        room.setName(name);
        room.setMaxGuests((byte) 2);
        room.setStatus(status);
        return roomRepository.saveAndFlush(room);
    }

    private Booking createBookingEntity(
            Long homestayId, BookingStatus status, LocalDate checkIn, LocalDate checkOut
    ) {
        Booking booking = new Booking();
        booking.setCode("DIR-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10));
        booking.setHomestayId(homestayId);
        booking.setContactName("Khách test");
        booking.setContactPhone("0901234567");
        booking.setCheckInDate(checkIn);
        booking.setCheckOutDate(checkOut);
        booking.setGuestCount((short) 2);
        booking.setStatus(status);
        booking.setRoomTotalPrice(500_000L);
        booking.setDepositAmount(150_000L);
        booking.setHoldExpiresAt(LocalDateTime.now(ZoneOffset.UTC).plusHours(24));
        booking.setCreatedBy(director.getId());
        booking.setPolicySnapshot("{}");
        if (status == BookingStatus.CONFIRMED
                || status == BookingStatus.CHECKED_IN
                || status == BookingStatus.CHECKED_OUT) {
            booking.setApprovedBy(director.getId());
            booking.setApprovedAt(Instant.now());
        }
        return bookingRepository.saveAndFlush(booking);
    }
}
