package vn.edu.hust.homestay;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import vn.edu.hust.homestay.homestay.dto.UpdateManagerHomestayRequest;
import vn.edu.hust.homestay.homestay.entity.Homestay;
import vn.edu.hust.homestay.homestay.repository.HomestayRepository;
import vn.edu.hust.homestay.room.dto.CreateRoomRequest;
import vn.edu.hust.homestay.room.dto.UpdateRoomRequest;
import vn.edu.hust.homestay.room.dto.UpdateRoomStatusRequest;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;
import vn.edu.hust.homestay.room.entity.RoomType;
import vn.edu.hust.homestay.room.repository.RoomRepository;
import vn.edu.hust.homestay.room.repository.RoomTypeRepository;

import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiểm thử tích hợp toàn bộ các API Quản lý Homestay và Phòng Tuần 3:
 * API-MGR-01 đến API-MGR-07.
 * Ngày thực hiện: 19/10/2026
 */
@SpringBootTest
@Transactional
class ManagerApiTests {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HomestayRepository homestayRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private JwtService jwtService;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private User manager1;       // Homestay 1 (Mai Châu)
    private User manager2;       // Homestay 2 (Mộc Châu)
    private User unassignedMgr; // homestayId = null
    private User customer;

    private String tokenMgr1;
    private String tokenMgr2;
    private String tokenUnassigned;
    private String tokenCustomer;

    private Long homestay1Id;
    private Long homestay2Id;
    private Long roomType1Id;
    private Long roomType2Id;
    private Long room1Id;
    private Long room2Id;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();
        objectMapper = new ObjectMapper();

        // 1. Tạo hoặc lấy Homestay 1 & 2
        Homestay hs1 = homestayRepository.findAll().stream().findFirst().orElseGet(() -> {
            Homestay h = new Homestay();
            h.setName("Mai Chau Green Homestay");
            h.setProvince("Hòa Bình");
            h.setAddress("Bản Lác, Mai Châu, Hòa Bình");
            h.setHotlinePhone("0981111111");
            h.setStatus(Homestay.HomestayStatus.ACTIVE);
            return homestayRepository.save(h);
        });
        homestay1Id = hs1.getId();

        Homestay hs2 = homestayRepository.findAll().stream().filter(h -> !h.getId().equals(homestay1Id)).findFirst().orElseGet(() -> {
            Homestay h = new Homestay();
            h.setName("Moc Chau Eco Homestay");
            h.setProvince("Sơn La");
            h.setAddress("Rừng Thông Bản Áng, Mộc Châu");
            h.setHotlinePhone("0982222222");
            h.setStatus(Homestay.HomestayStatus.ACTIVE);
            return homestayRepository.save(h);
        });
        homestay2Id = hs2.getId();

        // 2. Tạo hoặc lấy RoomType cho HS1 & HS2
        RoomType rt1 = roomTypeRepository.findByHomestayIdOrderByNameAsc(homestay1Id).stream().findFirst().orElseGet(() -> {
            RoomType rt = new RoomType();
            rt.setHomestayId(homestay1Id);
            rt.setName("Phòng Deluxe HS1");
            return roomTypeRepository.save(rt);
        });
        roomType1Id = rt1.getId();

        RoomType rt2 = roomTypeRepository.findByHomestayIdOrderByNameAsc(homestay2Id).stream().findFirst().orElseGet(() -> {
            RoomType rt = new RoomType();
            rt.setHomestayId(homestay2Id);
            rt.setName("Phòng Superior HS2");
            return roomTypeRepository.save(rt);
        });
        roomType2Id = rt2.getId();

        // 3. Tạo phòng mẫu cho HS1 và HS2
        Room r1 = roomRepository.findByHomestayIdAndStatus(homestay1Id, RoomStatus.ACTIVE).stream().findFirst().orElseGet(() -> {
            Room r = new Room();
            r.setHomestayId(homestay1Id);
            r.setRoomTypeId(roomType1Id);
            r.setName("Phòng 101 Test");
            r.setDescription("Mô tả phòng 101");
            r.setMaxGuests((byte) 2);
            r.setAmenities("[\"Wifi\", \"Điều hòa\"]");
            r.setStatus(RoomStatus.ACTIVE);
            return roomRepository.save(r);
        });
        room1Id = r1.getId();

        Room r2 = roomRepository.findByHomestayIdAndStatus(homestay2Id, RoomStatus.ACTIVE).stream().findFirst().orElseGet(() -> {
            Room r = new Room();
            r.setHomestayId(homestay2Id);
            r.setRoomTypeId(roomType2Id);
            r.setName("Phòng 201 Test");
            r.setDescription("Mô tả phòng 201");
            r.setMaxGuests((byte) 4);
            r.setAmenities("[\"Wifi\", \"Tủ lạnh\"]");
            r.setStatus(RoomStatus.ACTIVE);
            return roomRepository.save(r);
        });
        room2Id = r2.getId();

        // 4. Lấy Users & sinh Tokens từ dữ liệu seed chuẩn
        manager1 = userRepository.findByEmail("manager.maichau@homestay.vn").orElseGet(() ->
                userRepository.save(User.builder()
                        .email("manager.maichau@homestay.vn")
                        .fullName("Quản lý Mai Châu")
                        .phone("0911000003")
                        .passwordHash("$2a$10$dummyHash12345678901234567890")
                        .role(Role.MANAGER)
                        .status(UserStatus.ACTIVE)
                        .homestayId(homestay1Id)
                        .build()));
        homestay1Id = manager1.getHomestayId();

        manager2 = userRepository.findByEmail("manager.mocchau@homestay.vn").orElseGet(() ->
                userRepository.save(User.builder()
                        .email("manager.mocchau@homestay.vn")
                        .fullName("Quản lý Mộc Châu")
                        .phone("0911000004")
                        .passwordHash("$2a$10$dummyHash12345678901234567890")
                        .role(Role.MANAGER)
                        .status(UserStatus.ACTIVE)
                        .homestayId(homestay2Id)
                        .build()));
        homestay2Id = manager2.getHomestayId();

        unassignedMgr = userRepository.findByEmail("manager.sapa@homestay.vn").orElseGet(() ->
                userRepository.save(User.builder()
                        .email("manager.sapa@homestay.vn")
                        .fullName("Quản lý Sa Pa")
                        .phone("0911000005")
                        .passwordHash("$2a$10$dummyHash12345678901234567890")
                        .role(Role.MANAGER)
                        .status(UserStatus.ACTIVE)
                        .homestayId(null)
                        .build()));

        customer = userRepository.findByEmail("an.nguyen@example.com").orElseGet(() ->
                userRepository.findByEmail("customer@gmail.com").orElseGet(() ->
                        userRepository.save(User.builder()
                                .email("customer_test_w3@gmail.com")
                                .fullName("Khách Hàng Test W3")
                                .phone("0984444444")
                                .passwordHash("$2a$10$dummyHash12345678901234567890")
                                .role(Role.CUSTOMER)
                                .status(UserStatus.ACTIVE)
                                .build())));

        tokenMgr1 = jwtService.generateAccessToken(manager1);
        tokenMgr2 = jwtService.generateAccessToken(manager2);
        tokenUnassigned = jwtService.generateAccessToken(unassignedMgr);
        tokenCustomer = jwtService.generateAccessToken(customer);
    }

    // ── API-MGR-01: Xem homestay được giao ───────────────────────────────────

    @Test
    @DisplayName("API-MGR-01: Manager xem homestay được giao thành công (200 OK)")
    void testGetAssignedHomestaySuccess() throws Exception {
        mockMvc.perform(get("/api/v1/manager/homestay")
                        .header("Authorization", "Bearer " + tokenMgr1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(homestay1Id.intValue())))
                .andExpect(jsonPath("$.data.name", notNullValue()))
                .andExpect(jsonPath("$.data.province", notNullValue()))
                .andExpect(jsonPath("$.data.hotlinePhone", notNullValue()));
    }

    @Test
    @DisplayName("API-MGR-01: Manager chưa được phân công homestay trả 400 HOMESTAY_NOT_ASSIGNED")
    void testGetAssignedHomestayNotAssigned() throws Exception {
        mockMvc.perform(get("/api/v1/manager/homestay")
                        .header("Authorization", "Bearer " + tokenUnassigned))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_NOT_ASSIGNED")));
    }

    // ── API-MGR-02: Cập nhật thông tin homestay ──────────────────────────────

    @Test
    @DisplayName("API-MGR-02: Cập nhật thông tin homestay thành công (200 OK)")
    void testUpdateHomestaySuccess() throws Exception {
        UpdateManagerHomestayRequest req = UpdateManagerHomestayRequest.builder()
                .name("Mai Châu Đổi Tên")
                .address("Địa chỉ mới Bản Lác")
                .hotlinePhone("0989999888")
                .description("Mô tả mới của homestay")
                .build();

        mockMvc.perform(patch("/api/v1/manager/homestay")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(homestay1Id.intValue())))
                .andExpect(jsonPath("$.data.name", is("Mai Châu Đổi Tên")))
                .andExpect(jsonPath("$.data.address", is("Địa chỉ mới Bản Lác")))
                .andExpect(jsonPath("$.data.hotlinePhone", is("0989999888")));
    }

    // ── API-MGR-03: Danh sách phòng ──────────────────────────────────────────

    @Test
    @DisplayName("API-MGR-03: Lấy danh sách phòng có phân trang và bộ lọc (200 OK)")
    void testGetRoomsWithFilters() throws Exception {
        mockMvc.perform(get("/api/v1/manager/rooms")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .param("status", "ACTIVE")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", notNullValue()))
                .andExpect(jsonPath("$.meta.page", is(0)))
                .andExpect(jsonPath("$.meta.size", is(10)));
    }

    // ── API-MGR-04: Thêm phòng ──────────────────────────────────────────────

    @Test
    @DisplayName("API-MGR-04: Thêm phòng mới thành công (201 Created)")
    void testCreateRoomSuccess() throws Exception {
        CreateRoomRequest req = CreateRoomRequest.builder()
                .roomTypeId(roomType1Id)
                .name("Phòng Mới Tạo 999")
                .description("Phòng mới view núi tuyệt đẹp")
                .maxGuests((byte) 3)
                .amenities(List.of("Wifi", "Điều hòa", "Ban công"))
                .build();

        mockMvc.perform(post("/api/v1/manager/rooms")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.name", is("Phòng Mới Tạo 999")))
                .andExpect(jsonPath("$.data.maxGuests", is(3)))
                .andExpect(jsonPath("$.data.status", is("ACTIVE")))
                .andExpect(jsonPath("$.data.amenities", hasItems("Wifi", "Điều hòa", "Ban công")));
    }

    @Test
    @DisplayName("API-MGR-04: Thêm phòng trùng tên trả 409 ROOM_NAME_EXISTS")
    void testCreateRoomDuplicateName() throws Exception {
        Room existing = roomRepository.findById(room1Id).orElseThrow();
        CreateRoomRequest req = CreateRoomRequest.builder()
                .roomTypeId(roomType1Id)
                .name(existing.getName())
                .description("Thử tạo trùng tên")
                .maxGuests((byte) 2)
                .build();

        mockMvc.perform(post("/api/v1/manager/rooms")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ROOM_NAME_EXISTS")));
    }

    @Test
    @DisplayName("API-MGR-04: Thêm phòng với roomTypeId của homestay khác trả 400 ROOM_TYPE_SCOPE_MISMATCH")
    void testCreateRoomTypeMismatch() throws Exception {
        CreateRoomRequest req = CreateRoomRequest.builder()
                .roomTypeId(roomType2Id) // roomType của homestay 2
                .name("Phòng Lạ 888")
                .maxGuests((byte) 2)
                .build();

        mockMvc.perform(post("/api/v1/manager/rooms")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ROOM_TYPE_SCOPE_MISMATCH")));
    }

    // ── API-MGR-05: Chi tiết phòng ──────────────────────────────────────────

    @Test
    @DisplayName("API-MGR-05: Xem chi tiết phòng thành công (200 OK)")
    void testGetRoomDetailSuccess() throws Exception {
        mockMvc.perform(get("/api/v1/manager/rooms/" + room1Id)
                        .header("Authorization", "Bearer " + tokenMgr1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(room1Id.intValue())))
                .andExpect(jsonPath("$.data.homestayId", is(homestay1Id.intValue())));
    }

    @Test
    @DisplayName("API-MGR-05: Xem phòng không tồn tại trả 404 ROOM_NOT_FOUND")
    void testGetRoomDetailNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/manager/rooms/999999")
                        .header("Authorization", "Bearer " + tokenMgr1))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ROOM_NOT_FOUND")));
    }

    @Test
    @DisplayName("API-MGR-05: Manager truy cập phòng thuộc cơ sở khác trả 403 HOMESTAY_SCOPE_VIOLATION")
    void testGetRoomDetailScopeViolation() throws Exception {
        mockMvc.perform(get("/api/v1/manager/rooms/" + room2Id) // room2 thuộc homestay2, tokenMgr1 quản lý homestay1
                        .header("Authorization", "Bearer " + tokenMgr1))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_SCOPE_VIOLATION")));
    }

    // ── API-MGR-06: Cập nhật phòng ──────────────────────────────────────────

    @Test
    @DisplayName("API-MGR-06: Cập nhật phòng thành công (200 OK)")
    void testUpdateRoomSuccess() throws Exception {
        UpdateRoomRequest req = UpdateRoomRequest.builder()
                .name("Phòng 101 Cải Tiến")
                .description("Mô tả mới sau sửa chữa")
                .maxGuests((byte) 3)
                .amenities(List.of("Wifi", "Điều hòa", "Smart TV"))
                .build();

        mockMvc.perform(patch("/api/v1/manager/rooms/" + room1Id)
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.name", is("Phòng 101 Cải Tiến")))
                .andExpect(jsonPath("$.data.maxGuests", is(3)))
                .andExpect(jsonPath("$.data.amenities", hasItem("Smart TV")));
    }

    @Test
    @DisplayName("API-MGR-06: Cập nhật phòng cơ sở khác trả 403 HOMESTAY_SCOPE_VIOLATION")
    void testUpdateRoomScopeViolation() throws Exception {
        UpdateRoomRequest req = UpdateRoomRequest.builder()
                .name("Hack Phòng")
                .build();

        mockMvc.perform(patch("/api/v1/manager/rooms/" + room2Id)
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_SCOPE_VIOLATION")));
    }

    // ── API-MGR-07: Khóa/mở/ngừng phòng ─────────────────────────────────────

    @Test
    @DisplayName("API-MGR-07: Đổi trạng thái phòng sang LOCKED và ACTIVE (200 OK)")
    void testUpdateRoomStatusSuccess() throws Exception {
        Room roomToLock = new Room();
        roomToLock.setHomestayId(homestay1Id);
        roomToLock.setRoomTypeId(roomType1Id);
        roomToLock.setName("Phòng Khóa Thử 777");
        roomToLock.setMaxGuests((byte) 2);
        roomToLock.setStatus(RoomStatus.ACTIVE);
        Room savedRoom = roomRepository.save(roomToLock);

        UpdateRoomStatusRequest lockReq = UpdateRoomStatusRequest.builder()
                .status(RoomStatus.LOCKED)
                .reason("Bảo trì định kỳ máy lạnh")
                .build();

        mockMvc.perform(patch("/api/v1/manager/rooms/" + savedRoom.getId() + "/status")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(lockReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.roomId", is(savedRoom.getId().intValue())))
                .andExpect(jsonPath("$.data.status", is("LOCKED")));

        UpdateRoomStatusRequest activeReq = UpdateRoomStatusRequest.builder()
                .status(RoomStatus.ACTIVE)
                .reason("Hoàn thành bảo trì")
                .build();

        mockMvc.perform(patch("/api/v1/manager/rooms/" + savedRoom.getId() + "/status")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(activeReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("ACTIVE")));
    }

    @Test
    @DisplayName("API-MGR-07: Phòng có lịch đặt trong tương lai khi khóa trả 409 ROOM_HAS_FUTURE_BOOKINGS")
    void testUpdateRoomStatusWithFutureBookingsThrowsConflict() throws Exception {
        // Phòng 1 (id=1) đã có booking_id=4 trong tương lai tại CSDL seed
        UpdateRoomStatusRequest lockReq = UpdateRoomStatusRequest.builder()
                .status(RoomStatus.LOCKED)
                .reason("Thử khóa phòng đã được đặt trước")
                .build();

        mockMvc.perform(patch("/api/v1/manager/rooms/1/status")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(lockReq)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ROOM_HAS_FUTURE_BOOKINGS")));
    }

    @Test
    @DisplayName("API-MGR-07: Đổi trạng thái phòng cơ sở khác trả 403 HOMESTAY_SCOPE_VIOLATION")
    void testUpdateRoomStatusScopeViolation() throws Exception {
        UpdateRoomStatusRequest req = UpdateRoomStatusRequest.builder()
                .status(RoomStatus.LOCKED)
                .build();

        mockMvc.perform(patch("/api/v1/manager/rooms/" + room2Id + "/status")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_SCOPE_VIOLATION")));
    }

    // ── Phân quyền RBAC ──────────────────────────────────────────────────────

    @Test
    @DisplayName("RBAC: Customer cố gắng gọi API Manager trả về 403 FORBIDDEN")
    void testCustomerForbiddenOnManagerApi() throws Exception {
        mockMvc.perform(get("/api/v1/manager/homestay")
                        .header("Authorization", "Bearer " + tokenCustomer))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("FORBIDDEN")));
    }

    @Test
    @DisplayName("RBAC: Anonymous không token gọi API Manager trả về 401 UNAUTHORIZED")
    void testAnonymousUnauthorizedOnManagerApi() throws Exception {
        mockMvc.perform(get("/api/v1/manager/homestay"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("UNAUTHORIZED")));
    }
}
