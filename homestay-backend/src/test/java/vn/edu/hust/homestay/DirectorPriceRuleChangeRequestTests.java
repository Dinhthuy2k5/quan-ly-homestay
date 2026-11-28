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
import vn.edu.hust.homestay.homestay.entity.Homestay;
import vn.edu.hust.homestay.homestay.entity.Homestay.HomestayStatus;
import vn.edu.hust.homestay.homestay.repository.HomestayRepository;
import vn.edu.hust.homestay.media.entity.Media;
import vn.edu.hust.homestay.media.entity.Media.OwnerType;
import vn.edu.hust.homestay.media.repository.MediaRepository;
import vn.edu.hust.homestay.pricing.entity.PriceRule;
import vn.edu.hust.homestay.pricing.entity.PriceRule.AdjustType;
import vn.edu.hust.homestay.pricing.entity.PriceRule.RuleType;
import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest;
import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest.RequestType;
import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest.Status;
import vn.edu.hust.homestay.pricing.repository.PriceRuleChangeRequestRepository;
import vn.edu.hust.homestay.pricing.repository.PriceRuleRepository;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;
import vn.edu.hust.homestay.room.entity.RoomType;
import vn.edu.hust.homestay.room.repository.RoomRepository;
import vn.edu.hust.homestay.room.repository.RoomTypeRepository;

import java.time.Instant;
import java.util.UUID;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiểm thử tích hợp cho API-DIR-PRICE-01 (danh sách) và API-DIR-PRICE-02 (chi tiết) phê duyệt quy tắc giá Giám đốc.
 */
@SpringBootTest
@Transactional
class DirectorPriceRuleChangeRequestTests {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private HomestayRepository homestayRepository;
    @Autowired private RoomTypeRepository roomTypeRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private MediaRepository mediaRepository;
    @Autowired private PriceRuleRepository priceRuleRepository;
    @Autowired private PriceRuleChangeRequestRepository changeRequestRepository;
    @Autowired private JwtService jwtService;

    private MockMvc mockMvc;

    private User director;
    private User lockedDirector;
    private User admin;
    private User manager1;
    private User manager2;
    private User customer;

    private String directorToken;
    private String lockedDirectorToken;
    private String adminToken;
    private String managerToken;
    private String customerToken;

    private Homestay homestay1;
    private Homestay homestay2;
    private Room room1;
    private PriceRule existingAdjustmentRule;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        String tag = UUID.randomUUID().toString().substring(0, 6);
        homestay1 = createHomestay("Price Dir HS1 " + tag, "Lào Cai", "Sa Pa", "02143881111");
        homestay2 = createHomestay("Price Dir HS2 " + tag, "Sơn La", "Mộc Châu", "02123882222");

        director = createUser(Role.DIRECTOR, UserStatus.ACTIVE, null, "Giám Đốc " + tag);
        lockedDirector = createUser(Role.DIRECTOR, UserStatus.LOCKED, null, "Giám Đốc Khóa " + tag);
        admin = createUser(Role.ADMIN, UserStatus.ACTIVE, null, "Admin " + tag);
        manager1 = createUser(Role.MANAGER, UserStatus.ACTIVE, homestay1.getId(), "Quản Lý Một " + tag);
        manager2 = createUser(Role.MANAGER, UserStatus.ACTIVE, homestay2.getId(), "Quản Lý Hai " + tag);
        customer = createUser(Role.CUSTOMER, UserStatus.ACTIVE, null, "Khách Hàng " + tag);

        directorToken = jwtService.generateAccessToken(director);
        lockedDirectorToken = jwtService.generateAccessToken(lockedDirector);
        adminToken = jwtService.generateAccessToken(admin);
        managerToken = jwtService.generateAccessToken(manager1);
        customerToken = jwtService.generateAccessToken(customer);

        RoomType rt = new RoomType();
        rt.setHomestayId(homestay1.getId());
        rt.setName("Deluxe " + tag);
        rt = roomTypeRepository.saveAndFlush(rt);

        room1 = new Room();
        room1.setHomestayId(homestay1.getId());
        room1.setRoomTypeId(rt.getId());
        room1.setName("Phòng 301 " + tag);
        room1.setMaxGuests((byte) 2);
        room1.setStatus(RoomStatus.ACTIVE);
        room1 = roomRepository.saveAndFlush(room1);

        existingAdjustmentRule = new PriceRule();
        existingAdjustmentRule.setHomestayId(homestay1.getId());
        existingAdjustmentRule.setRoomId(room1.getId());
        existingAdjustmentRule.setRuleType(RuleType.ADJUSTMENT);
        existingAdjustmentRule.setName("Phụ thu cuối tuần " + tag);
        existingAdjustmentRule.setAdjustType(AdjustType.PERCENT);
        existingAdjustmentRule.setAdjustValue(15L);
        existingAdjustmentRule.setPriority((short) 10);
        existingAdjustmentRule.setStatus(PriceRule.Status.ACTIVE);
        existingAdjustmentRule.setCreatedAt(Instant.now());
        existingAdjustmentRule.setUpdatedAt(Instant.now());
        existingAdjustmentRule = priceRuleRepository.saveAndFlush(existingAdjustmentRule);
    }

    @Test
    @DisplayName("API-DIR-PRICE-01: liệt kê toàn công ty, bổ sung tên cơ sở/phòng/người gửi, chuẩn hóa ngày JSON và lọc theo status/homestayId/ngày VN")
    void listsEnrichedRequestsWithFiltersVietnamTimezoneBoundariesAndPagination() throws Exception {
        // Yêu cầu 1 (HS1, CREATE, PENDING_APPROVAL): 2047-05-10 23:30 +07:00 (= 2047-05-10T16:30:00Z)
        // Dùng định dạng mảng [2047, 6, 1] giống dữ liệu cũ để kiểm tra khả năng tự chuẩn hóa về "2047-06-01"
        String createProposalJson = """
                {
                  "roomId": %d,
                  "ruleType": "ADJUSTMENT",
                  "name": "Phụ thu hè",
                  "adjustType": "PERCENT",
                  "adjustValue": 20,
                  "weekdays": ["FRI", "SAT"],
                  "startDate": [2047, 6, 1],
                  "endDate": [2047, 6, 30],
                  "priority": 10
                }
                """.formatted(room1.getId());

        PriceRuleChangeRequest req1 = createChangeRequest(
                homestay1.getId(),
                null,
                RequestType.CREATE,
                createProposalJson,
                Status.PENDING_APPROVAL,
                manager1.getId(),
                Instant.parse("2047-05-10T16:30:00Z"),
                null,
                null,
                null
        );

        // Yêu cầu 2 (HS1, UPDATE, APPROVED): 2047-05-11 00:15 +07:00 (= 2047-05-10T17:15:00Z — sang ngày 11/05 theo giờ VN!)
        String updateProposalJson = """
                {
                  "roomId": %d,
                  "ruleType": "ADJUSTMENT",
                  "name": "Phụ thu cuối tuần nâng cấp",
                  "adjustType": "PERCENT",
                  "adjustValue": 25,
                  "priority": 12
                }
                """.formatted(room1.getId());

        PriceRuleChangeRequest req2 = createChangeRequest(
                homestay1.getId(),
                existingAdjustmentRule.getId(),
                RequestType.UPDATE,
                updateProposalJson,
                Status.APPROVED,
                manager1.getId(),
                Instant.parse("2047-05-10T17:15:00Z"),
                director.getId(),
                Instant.parse("2047-05-10T18:00:00Z"),
                null
        );

        // Yêu cầu 3 (HS2, CREATE, REJECTED): 2047-05-12 10:00 +07:00 (= 2047-05-12T03:00:00Z)
        String hs2ProposalJson = """
                {
                  "ruleType": "ADJUSTMENT",
                  "name": "Lễ toàn cơ sở",
                  "adjustType": "FIXED_PRICE",
                  "adjustValue": 1200000,
                  "priority": 20
                }
                """;

        PriceRuleChangeRequest req3 = createChangeRequest(
                homestay2.getId(),
                null,
                RequestType.CREATE,
                hs2ProposalJson,
                Status.REJECTED,
                manager2.getId(),
                Instant.parse("2047-05-12T03:00:00Z"),
                director.getId(),
                Instant.parse("2047-05-12T04:00:00Z"),
                "Mức giá đề xuất quá cao so với mặt bằng"
        );

        // 1. Lọc đúng ngày 2047-05-10 giờ VN: chỉ lấy req1 (23:30 +07:00), KHÔNG lấy req2 (00:15 +07:00 ngày 11/05)
        mockMvc.perform(get("/api/v1/director/price-rule-change-requests")
                        .header("Authorization", "Bearer " + directorToken)
                        .param("fromDate", "2047-05-10")
                        .param("toDate", "2047-05-10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.meta.totalElements", is(1)))
                .andExpect(jsonPath("$.data[0].id", is(req1.getId().intValue())))
                .andExpect(jsonPath("$.data[0].homestayId", is(homestay1.getId().intValue())))
                .andExpect(jsonPath("$.data[0].homestayName", is(homestay1.getName())))
                .andExpect(jsonPath("$.data[0].requestType", is("CREATE")))
                .andExpect(jsonPath("$.data[0].status", is("PENDING_APPROVAL")))
                .andExpect(jsonPath("$.data[0].requestedBy", is(manager1.getId().intValue())))
                .andExpect(jsonPath("$.data[0].requestedByName", is(manager1.getFullName())))
                .andExpect(jsonPath("$.data[0].requestedByEmail", is(manager1.getEmail())))
                .andExpect(jsonPath("$.data[0].roomId", is(room1.getId().intValue())))
                .andExpect(jsonPath("$.data[0].roomName", is(room1.getName())))
                .andExpect(jsonPath("$.data[0].proposedRule.startDate", is("2047-06-01")))
                .andExpect(jsonPath("$.data[0].proposedRule.endDate", is("2047-06-30")));

        // 2. Bỏ trống status trong khoảng 2047-05-10..2047-05-12 → trả đủ cả 3 trạng thái, mặc định sắp xếp mới nhất trước
        mockMvc.perform(get("/api/v1/director/price-rule-change-requests")
                        .header("Authorization", "Bearer " + directorToken)
                        .param("fromDate", "2047-05-10")
                        .param("toDate", "2047-05-12"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(3)))
                .andExpect(jsonPath("$.data[0].id", is(req3.getId().intValue())))
                .andExpect(jsonPath("$.data[0].reviewedByName", is(director.getFullName())))
                .andExpect(jsonPath("$.data[0].rejectionReason", is("Mức giá đề xuất quá cao so với mặt bằng")))
                .andExpect(jsonPath("$.data[0].roomId", nullValue()))
                .andExpect(jsonPath("$.data[1].id", is(req2.getId().intValue())))
                .andExpect(jsonPath("$.data[1].targetRuleId", is(existingAdjustmentRule.getId().intValue())))
                .andExpect(jsonPath("$.data[2].id", is(req1.getId().intValue())));

        // 3. Lọc theo status=APPROVED + homestayId=homestay1
        mockMvc.perform(get("/api/v1/director/price-rule-change-requests")
                        .header("Authorization", "Bearer " + directorToken)
                        .param("fromDate", "2047-05-10")
                        .param("toDate", "2047-05-12")
                        .param("status", "APPROVED")
                        .param("homestayId", homestay1.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].id", is(req2.getId().intValue())));

        // 4. Phân trang size=2 + sort=requestedAt,asc
        mockMvc.perform(get("/api/v1/director/price-rule-change-requests")
                        .header("Authorization", "Bearer " + directorToken)
                        .param("fromDate", "2047-05-10")
                        .param("toDate", "2047-05-12")
                        .param("sort", "requestedAt,asc")
                        .param("page", "0")
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[*].id", contains(req1.getId().intValue(), req2.getId().intValue())))
                .andExpect(jsonPath("$.meta.page", is(0)))
                .andExpect(jsonPath("$.meta.size", is(2)))
                .andExpect(jsonPath("$.meta.totalElements", is(3)))
                .andExpect(jsonPath("$.meta.totalPages", is(2)))
                .andExpect(jsonPath("$.meta.first", is(true)))
                .andExpect(jsonPath("$.meta.last", is(false)));

        // 5. homestayId hợp lệ nhưng không có yêu cầu → 200 OK danh sách rỗng
        mockMvc.perform(get("/api/v1/director/price-rule-change-requests")
                        .header("Authorization", "Bearer " + directorToken)
                        .param("homestayId", "999999999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)))
                .andExpect(jsonPath("$.meta.totalElements", is(0)))
                .andExpect(jsonPath("$.meta.last", is(true)));
    }

    @Test
    @DisplayName("API-DIR-PRICE-01: trả đối chiếu giá hiện tại → đề xuất và tóm tắt phòng/toàn cơ sở")
    void returnsPriceComparisonRoomAndScopeSummaries() throws Exception {
        // Tạo giá BASE hiện hành 800.000đ cho room1 (ACTIVE)
        PriceRule room1Base = createBaseRule(homestay1.getId(), room1.getId(), "Giá cơ bản Phòng 301", 800_000L);

        // Tạo phòng khóa ở HS1 với giá BASE 800.000đ
        Room lockedRoom = new Room();
        lockedRoom.setHomestayId(homestay1.getId());
        lockedRoom.setRoomTypeId(room1.getRoomTypeId());
        lockedRoom.setName("Phòng Khóa 302");
        lockedRoom.setMaxGuests((byte) 4);
        lockedRoom.setStatus(RoomStatus.LOCKED);
        lockedRoom.setStatusReason("Đang bảo trì điều hòa");
        lockedRoom = roomRepository.saveAndFlush(lockedRoom);
        PriceRule lockedRoomBase = createBaseRule(homestay1.getId(), lockedRoom.getId(), "Giá cơ bản Phòng 302", 800_000L);

        // Tạo 3 phòng ở HS2 (2 ACTIVE: 600k & 1.000k; 1 LOCKED: 2.000k) để kiểm chứng homestayScopeSummary
        RoomType hs2Type = new RoomType();
        hs2Type.setHomestayId(homestay2.getId());
        hs2Type.setName("Standard HS2");
        hs2Type = roomTypeRepository.saveAndFlush(hs2Type);

        Room hs2ActiveA = createRoom(homestay2.getId(), hs2Type.getId(), "P201", (byte) 2, RoomStatus.ACTIVE);
        Room hs2ActiveB = createRoom(homestay2.getId(), hs2Type.getId(), "P202", (byte) 4, RoomStatus.ACTIVE);
        Room hs2Locked = createRoom(homestay2.getId(), hs2Type.getId(), "P203", (byte) 2, RoomStatus.LOCKED);
        createBaseRule(homestay2.getId(), hs2ActiveA.getId(), "BASE P201", 600_000L);
        createBaseRule(homestay2.getId(), hs2ActiveB.getId(), "BASE P202", 1_000_000L);
        createBaseRule(homestay2.getId(), hs2Locked.getId(), "BASE P203", 2_000_000L);

        // Case 1: UPDATE BASE 800k → 1.000k (+25%, không rủi ro)
        PriceRuleChangeRequest normalUpdate = createChangeRequest(
                homestay1.getId(),
                room1Base.getId(),
                RequestType.UPDATE,
                """
                {
                  "roomId": %d,
                  "ruleType": "BASE",
                  "name": "Giá cơ bản Phòng 301",
                  "basePrice": 1000000
                }
                """.formatted(room1.getId()),
                Status.PENDING_APPROVAL,
                manager1.getId(),
                Instant.parse("2048-03-10T01:00:00Z"),
                null, null, null
        );

        // Case 2: UPDATE BASE phòng LOCKED 800k → 1.200k (+50% HIGH + ROOM_NOT_ACTIVE MEDIUM)
        PriceRuleChangeRequest riskyLockedUpdate = createChangeRequest(
                homestay1.getId(),
                lockedRoomBase.getId(),
                RequestType.UPDATE,
                """
                {
                  "roomId": %d,
                  "ruleType": "BASE",
                  "name": "Giá cơ bản Phòng 302",
                  "basePrice": 1200000
                }
                """.formatted(lockedRoom.getId()),
                Status.PENDING_APPROVAL,
                manager1.getId(),
                Instant.parse("2048-03-10T02:00:00Z"),
                null, null, null
        );

        // Case 3: CREATE ADJUSTMENT room1 trùng ưu tiên 10 với existingAdjustmentRule + FIXED_PRICE 1.300k (+62.5%)
        PriceRuleChangeRequest overlapCreate = createChangeRequest(
                homestay1.getId(),
                null,
                RequestType.CREATE,
                """
                {
                  "roomId": %d,
                  "ruleType": "ADJUSTMENT",
                  "name": "Lễ cao điểm P301",
                  "adjustType": "FIXED_PRICE",
                  "adjustValue": 1300000,
                  "weekdays": ["FRI", "SAT"],
                  "priority": 10
                }
                """.formatted(room1.getId()),
                Status.PENDING_APPROVAL,
                manager1.getId(),
                Instant.parse("2048-03-10T03:00:00Z"),
                null, null, null
        );

        // Case 4: CREATE ADJUSTMENT toàn cơ sở HS2 (+20%): 2/3 phòng ACTIVE, giá dự kiến 720k–1.200k
        PriceRuleChangeRequest scopeCreate = createChangeRequest(
                homestay2.getId(),
                null,
                RequestType.CREATE,
                """
                {
                  "ruleType": "ADJUSTMENT",
                  "name": "Cuối tuần toàn cơ sở",
                  "adjustType": "PERCENT",
                  "adjustValue": 20,
                  "weekdays": ["SAT", "SUN"],
                  "priority": 15
                }
                """,
                Status.PENDING_APPROVAL,
                manager2.getId(),
                Instant.parse("2048-03-10T04:00:00Z"),
                null, null, null
        );

        // Case 5: Yêu cầu đã APPROVED không tạo priceComparison giả
        PriceRuleChangeRequest approvedReq = createChangeRequest(
                homestay1.getId(),
                room1Base.getId(),
                RequestType.UPDATE,
                """
                {
                  "roomId": %d,
                  "ruleType": "BASE",
                  "name": "Giá cơ bản Phòng 301",
                  "basePrice": 800000
                }
                """.formatted(room1.getId()),
                Status.APPROVED,
                manager1.getId(),
                Instant.parse("2048-03-10T05:00:00Z"),
                director.getId(),
                Instant.parse("2048-03-10T06:00:00Z"),
                null
        );

        mockMvc.perform(get("/api/v1/director/price-rule-change-requests")
                        .header("Authorization", "Bearer " + directorToken)
                        .param("fromDate", "2048-03-10")
                        .param("toDate", "2048-03-10")
                        .param("sort", "requestedAt,asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(5)))

                // [0] normalUpdate: 800k -> 1.000k (+25%), không rủi ro
                .andExpect(jsonPath("$.data[0].id", is(normalUpdate.getId().intValue())))
                .andExpect(jsonPath("$.data[0].roomSummary.name", is(room1.getName())))
                .andExpect(jsonPath("$.data[0].roomSummary.maxGuests", is(2)))
                .andExpect(jsonPath("$.data[0].roomSummary.status", is("ACTIVE")))
                .andExpect(jsonPath("$.data[0].roomSummary.currentBasePrice", is(800000)))
                .andExpect(jsonPath("$.data[0].currentRule.basePrice", is(800000)))
                .andExpect(jsonPath("$.data[0].priceComparison.currentAmount", is(800000)))
                .andExpect(jsonPath("$.data[0].priceComparison.proposedAmount", is(1000000)))
                .andExpect(jsonPath("$.data[0].priceComparison.deltaAmount", is(200000)))
                .andExpect(jsonPath("$.data[0].priceComparison.deltaPercent", is(25.0)))
                .andExpect(jsonPath("$.data[0].priceComparison.changedFields", contains("basePrice")))
                .andExpect(jsonPath("$.data[0].riskAlerts").doesNotExist())

                // [1] riskyLockedUpdate: +50% + LOCKED room
                .andExpect(jsonPath("$.data[1].id", is(riskyLockedUpdate.getId().intValue())))
                .andExpect(jsonPath("$.data[1].roomSummary.status", is("LOCKED")))
                .andExpect(jsonPath("$.data[1].roomSummary.maxGuests", is(4)))
                .andExpect(jsonPath("$.data[1].priceComparison.deltaPercent", is(50.0)))

                // [2] overlapCreate: +62.5% từ BASE 800k + trùng ưu tiên 10
                .andExpect(jsonPath("$.data[2].id", is(overlapCreate.getId().intValue())))
                .andExpect(jsonPath("$.data[2].priceComparison.currentAmount", is(800000)))
                .andExpect(jsonPath("$.data[2].priceComparison.proposedAmount", is(1300000)))
                .andExpect(jsonPath("$.data[2].priceComparison.deltaPercent", is(62.5)))

                // [3] scopeCreate: toàn cơ sở HS2 (chỉ tính phòng ACTIVE 600k..1.000k → dự kiến 720k..1.200k)
                .andExpect(jsonPath("$.data[3].id", is(scopeCreate.getId().intValue())))
                .andExpect(jsonPath("$.data[3].roomSummary", nullValue()))
                .andExpect(jsonPath("$.data[3].homestayScopeSummary.activeRoomCount", is(2)))
                .andExpect(jsonPath("$.data[3].homestayScopeSummary.totalRoomCount", is(3)))
                .andExpect(jsonPath("$.data[3].homestayScopeSummary.minBasePrice", is(600000)))
                .andExpect(jsonPath("$.data[3].homestayScopeSummary.maxBasePrice", is(1000000)))
                .andExpect(jsonPath("$.data[3].priceComparison.deltaPercent", is(20.0)))
                .andExpect(jsonPath("$.data[3].priceComparison.projectedMinPrice", is(720000)))
                .andExpect(jsonPath("$.data[3].priceComparison.projectedMaxPrice", is(1200000)))

                // [4] approvedReq: giữ roomSummary nhưng không tạo priceComparison giả
                .andExpect(jsonPath("$.data[4].id", is(approvedReq.getId().intValue())))
                .andExpect(jsonPath("$.data[4].roomSummary.name", is(room1.getName())))
                .andExpect(jsonPath("$.data[4].priceComparison", nullValue()));
    }

    @Test
    @DisplayName("API-DIR-PRICE-01: kiểm tra lỗi INVALID_DATE_RANGE, VALIDATION_ERROR và INVALID_SORT")
    void validatesQueryParameters() throws Exception {
        // fromDate > toDate → 400 INVALID_DATE_RANGE
        mockMvc.perform(get("/api/v1/director/price-rule-change-requests")
                        .header("Authorization", "Bearer " + directorToken)
                        .param("fromDate", "2047-05-15")
                        .param("toDate", "2047-05-10"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_DATE_RANGE")));

        // Sai định dạng ngày → 400 INVALID_DATE_RANGE
        mockMvc.perform(get("/api/v1/director/price-rule-change-requests")
                        .header("Authorization", "Bearer " + directorToken)
                        .param("fromDate", "15/05/2047"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_DATE_RANGE")));

        // status không hợp lệ → 400 VALIDATION_ERROR
        mockMvc.perform(get("/api/v1/director/price-rule-change-requests")
                        .header("Authorization", "Bearer " + directorToken)
                        .param("status", "UNKNOWN"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("VALIDATION_ERROR")));

        // homestayId không phải số nguyên dương → 400 VALIDATION_ERROR
        mockMvc.perform(get("/api/v1/director/price-rule-change-requests")
                        .header("Authorization", "Bearer " + directorToken)
                        .param("homestayId", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("VALIDATION_ERROR")));

        mockMvc.perform(get("/api/v1/director/price-rule-change-requests")
                        .header("Authorization", "Bearer " + directorToken)
                        .param("homestayId", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("VALIDATION_ERROR")));

        // sort không hợp lệ → 400 INVALID_SORT
        mockMvc.perform(get("/api/v1/director/price-rule-change-requests")
                        .header("Authorization", "Bearer " + directorToken)
                        .param("sort", "passwordHash,desc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code", is("INVALID_SORT")));
    }

    @Test
    @DisplayName("RBAC API-DIR-PRICE-01: chỉ DIRECTOR ACTIVE được truy cập; chưa đăng nhập/LOCKED trả 401; ADMIN/MANAGER/CUSTOMER trả 403")
    void enforcesDirectorOnlyAccessControl() throws Exception {
        mockMvc.perform(get("/api/v1/director/price-rule-change-requests"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/director/price-rule-change-requests")
                        .header("Authorization", "Bearer " + lockedDirectorToken))
                .andExpect(status().isUnauthorized());

        for (String forbiddenToken : new String[]{adminToken, managerToken, customerToken}) {
            mockMvc.perform(get("/api/v1/director/price-rule-change-requests")
                            .header("Authorization", "Bearer " + forbiddenToken))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    @DisplayName("API-DIR-PRICE-02: chi tiết yêu cầu UPDATE BASE trả hồ sơ phòng, mặt bằng giá cùng hạng/cơ sở và danh sách quy tắc ACTIVE")
    void returnsRichRoomDetailBenchmarksAndActiveRules() throws Exception {
        // Bổ sung mô tả, tiện nghi và ảnh đại diện cho room1
        room1.setDescription("Phòng view núi có ban công rộng");
        room1.setAmenities("[\"wifi\",\"balcony\"]");
        room1 = roomRepository.saveAndFlush(room1);

        Media cover = new Media();
        cover.setHomestayId(homestay1.getId());
        cover.setOwnerType(OwnerType.ROOM);
        cover.setOwnerId(room1.getId());
        cover.setUrl("/uploads/test-room-301.jpg");
        cover.setSortOrder(0);
        cover.setUploadedBy(manager1.getId());
        mediaRepository.saveAndFlush(cover);

        // Giá BASE hiện tại của room1 = 800k
        PriceRule room1Base = createBaseRule(homestay1.getId(), room1.getId(), "Giá cơ bản Phòng 301", 800_000L);

        // Điều chỉnh existingAdjustmentRule (+15%, priority 10) thành chỉ áp dụng toàn cơ sở vào T6, T7 (+20%) cho dễ đối chiếu mô phỏng
        existingAdjustmentRule.setRoomId(null);
        existingAdjustmentRule.setName("Cuối tuần +20%");
        existingAdjustmentRule.setAdjustValue(20L);
        existingAdjustmentRule.setWeekdays("FRI,SAT");
        existingAdjustmentRule = priceRuleRepository.saveAndFlush(existingAdjustmentRule);

        // Tạo thêm 2 phòng ACTIVE khác cùng hạng phòng (850k, 950k) và 1 phòng hạng khác (600k) + 1 phòng LOCKED (2.000k, bị loại khỏi benchmark)
        Room sameTypePeer1 = createRoom(homestay1.getId(), room1.getRoomTypeId(), "Peer Deluxe A", (byte) 2, RoomStatus.ACTIVE);
        Room sameTypePeer2 = createRoom(homestay1.getId(), room1.getRoomTypeId(), "Peer Deluxe B", (byte) 2, RoomStatus.ACTIVE);
        Room sameTypeLocked = createRoom(homestay1.getId(), room1.getRoomTypeId(), "Peer Locked", (byte) 2, RoomStatus.LOCKED);
        createBaseRule(homestay1.getId(), sameTypePeer1.getId(), "BASE Peer A", 850_000L);
        createBaseRule(homestay1.getId(), sameTypePeer2.getId(), "BASE Peer B", 950_000L);
        createBaseRule(homestay1.getId(), sameTypeLocked.getId(), "BASE Locked", 2_000_000L);

        RoomType otherType = new RoomType();
        otherType.setHomestayId(homestay1.getId());
        otherType.setName("Standard");
        otherType = roomTypeRepository.saveAndFlush(otherType);
        Room otherTypePeer = createRoom(homestay1.getId(), otherType.getId(), "Standard 101", (byte) 2, RoomStatus.ACTIVE);
        createBaseRule(homestay1.getId(), otherTypePeer.getId(), "BASE Standard", 600_000L);

        // Yêu cầu UPDATE BASE 800k → 1.000k (+25%)
        PriceRuleChangeRequest req = createChangeRequest(
                homestay1.getId(),
                room1Base.getId(),
                RequestType.UPDATE,
                """
                {
                  "roomId": %d,
                  "ruleType": "BASE",
                  "name": "Giá cơ bản Phòng 301",
                  "basePrice": 1000000
                }
                """.formatted(room1.getId()),
                Status.PENDING_APPROVAL,
                manager1.getId(),
                Instant.parse("2048-04-01T08:00:00Z"),
                null, null, null
        );

        mockMvc.perform(get("/api/v1/director/price-rule-change-requests/{id}", req.getId())
                        .header("Authorization", "Bearer " + directorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.meta").doesNotExist())
                .andExpect(jsonPath("$.data.id", is(req.getId().intValue())))
                .andExpect(jsonPath("$.data.homestayName", is(homestay1.getName())))
                .andExpect(jsonPath("$.data.homestayProvince", is("Lào Cai")))
                .andExpect(jsonPath("$.data.requestedByName", is(manager1.getFullName())))
                .andExpect(jsonPath("$.data.requestedByEmail", is(manager1.getEmail())))
                .andExpect(jsonPath("$.data.currentRule.id", is(room1Base.getId().intValue())))
                .andExpect(jsonPath("$.data.currentRule.basePrice", is(800000)))
                .andExpect(jsonPath("$.data.priceComparison.currentAmount", is(800000)))
                .andExpect(jsonPath("$.data.priceComparison.proposedAmount", is(1000000)))
                .andExpect(jsonPath("$.data.priceComparison.deltaAmount", is(200000)))
                .andExpect(jsonPath("$.data.priceComparison.deltaPercent", is(25.0)))
                // Hồ sơ phòng + ảnh + tiện nghi + benchmark
                .andExpect(jsonPath("$.data.roomDetail.id", is(room1.getId().intValue())))
                .andExpect(jsonPath("$.data.roomDetail.description", is("Phòng view núi có ban công rộng")))
                .andExpect(jsonPath("$.data.roomDetail.amenities", contains("wifi", "balcony")))
                .andExpect(jsonPath("$.data.roomDetail.coverImageUrl", is("/uploads/test-room-301.jpg")))
                .andExpect(jsonPath("$.data.roomDetail.currentBasePrice", is(800000)))
                .andExpect(jsonPath("$.data.roomDetail.sameTypeBenchmark.roomCount", is(2)))
                .andExpect(jsonPath("$.data.roomDetail.sameTypeBenchmark.minBasePrice", is(850000)))
                .andExpect(jsonPath("$.data.roomDetail.sameTypeBenchmark.maxBasePrice", is(950000)))
                .andExpect(jsonPath("$.data.roomDetail.sameTypeBenchmark.avgBasePrice", is(900000)))
                .andExpect(jsonPath("$.data.roomDetail.homestayBenchmark.roomCount", is(3)))
                .andExpect(jsonPath("$.data.roomDetail.homestayBenchmark.minBasePrice", is(600000)))
                .andExpect(jsonPath("$.data.roomDetail.homestayBenchmark.maxBasePrice", is(950000)))
                .andExpect(jsonPath("$.data.roomDetail.homestayBenchmark.avgBasePrice", is(800000)))
                .andExpect(jsonPath("$.data.homestayScopeDetail", nullValue()))
                // Danh sách quy tắc ACTIVE tác động lên phòng (BASE được đánh dấu isTargetRule=true + quy tắc toàn cơ sở)
                .andExpect(jsonPath("$.data.activeRules", hasSize(2)))
                .andExpect(jsonPath("$.data.activeRules[0].id", is(room1Base.getId().intValue())))
                .andExpect(jsonPath("$.data.activeRules[0].isTargetRule", is(true)))
                .andExpect(jsonPath("$.data.activeRules[1].id", is(existingAdjustmentRule.getId().intValue())))
                .andExpect(jsonPath("$.data.activeRules[1].isTargetRule", is(false)))
                .andExpect(jsonPath("$.data.ratePreview").doesNotExist());
    }

    @Test
    @DisplayName("API-DIR-PRICE-02: chi tiết toàn cơ sở, chuẩn hóa ngày mảng cũ, yêu cầu đã từ chối, 404 và RBAC")
    void handlesHomestayWideLegacyDatesRejectedNotFoundAndRbac() throws Exception {
        // 1. Tạo 3 phòng ở HS2 (2 ACTIVE: 600k & 1.000k; 1 LOCKED: 2.000k)
        RoomType hs2Type = new RoomType();
        hs2Type.setHomestayId(homestay2.getId());
        hs2Type.setName("Bungalow");
        hs2Type = roomTypeRepository.saveAndFlush(hs2Type);
        Room hs2A = createRoom(homestay2.getId(), hs2Type.getId(), "Bungalow 1", (byte) 2, RoomStatus.ACTIVE);
        Room hs2B = createRoom(homestay2.getId(), hs2Type.getId(), "Bungalow 2", (byte) 4, RoomStatus.ACTIVE);
        Room hs2Locked = createRoom(homestay2.getId(), hs2Type.getId(), "Bungalow Khóa", (byte) 2, RoomStatus.LOCKED);
        createBaseRule(homestay2.getId(), hs2A.getId(), "BASE B1", 600_000L);
        createBaseRule(homestay2.getId(), hs2B.getId(), "BASE B2", 1_000_000L);
        createBaseRule(homestay2.getId(), hs2Locked.getId(), "BASE Locked", 2_000_000L);

        // Yêu cầu toàn cơ sở (+20% Cuối tuần)
        PriceRuleChangeRequest scopeReq = createChangeRequest(
                homestay2.getId(),
                null,
                RequestType.CREATE,
                """
                {
                  "ruleType": "ADJUSTMENT",
                  "name": "Phụ thu cuối tuần toàn cơ sở",
                  "adjustType": "PERCENT",
                  "adjustValue": 20,
                  "weekdays": ["SAT", "SUN"],
                  "priority": 10
                }
                """,
                Status.PENDING_APPROVAL,
                manager2.getId(),
                Instant.parse("2048-05-01T08:00:00Z"),
                null, null, null
        );

        mockMvc.perform(get("/api/v1/director/price-rule-change-requests/{id}", scopeReq.getId())
                        .header("Authorization", "Bearer " + directorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roomDetail", nullValue()))
                .andExpect(jsonPath("$.data.homestayScopeDetail.activeRoomCount", is(2)))
                .andExpect(jsonPath("$.data.homestayScopeDetail.totalRoomCount", is(3)))
                .andExpect(jsonPath("$.data.homestayScopeDetail.affectedRooms", hasSize(2)))
                .andExpect(jsonPath("$.data.homestayScopeDetail.affectedRooms[0].roomName", is("Bungalow 1")))
                .andExpect(jsonPath("$.data.homestayScopeDetail.affectedRooms[0].currentBasePrice", is(600000)))
                .andExpect(jsonPath("$.data.homestayScopeDetail.affectedRooms[0].projectedPrice", is(720000)))
                .andExpect(jsonPath("$.data.homestayScopeDetail.affectedRooms[1].roomName", is("Bungalow 2")))
                .andExpect(jsonPath("$.data.homestayScopeDetail.affectedRooms[1].projectedPrice", is(1200000)));

        // 2. Quy tắc có startDate/endDate dạng mảng cũ [2048, 6, 5] được chuẩn hóa sang ISO YYYY-MM-DD
        createBaseRule(homestay1.getId(), room1.getId(), "BASE P301", 800_000L);
        PriceRuleChangeRequest futureAdjReq = createChangeRequest(
                homestay1.getId(),
                null,
                RequestType.CREATE,
                """
                {
                  "roomId": %d,
                  "ruleType": "ADJUSTMENT",
                  "name": "Lễ hè đặc biệt",
                  "adjustType": "FIXED_PRICE",
                  "adjustValue": 1200000,
                  "weekdays": ["FRI", "SAT"],
                  "startDate": [2048, 6, 5],
                  "endDate": [2048, 6, 15],
                  "priority": 25
                }
                """.formatted(room1.getId()),
                Status.PENDING_APPROVAL,
                manager1.getId(),
                Instant.parse("2048-05-02T08:00:00Z"),
                null, null, null
        );

        mockMvc.perform(get("/api/v1/director/price-rule-change-requests/{id}", futureAdjReq.getId())
                        .header("Authorization", "Bearer " + directorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.proposedRule.startDate", is("2048-06-05")))
                .andExpect(jsonPath("$.data.proposedRule.endDate", is("2048-06-15")))
                .andExpect(jsonPath("$.data.priceComparison.currentAmount", is(800000)))
                .andExpect(jsonPath("$.data.priceComparison.proposedAmount", is(1200000)))
                .andExpect(jsonPath("$.data.priceComparison.deltaPercent", is(50.0)));

        // 3. Yêu cầu đã REJECTED: giữ thông tin duyệt & hồ sơ phòng, KHÔNG dựng priceComparison giả
        PriceRuleChangeRequest rejectedReq = createChangeRequest(
                homestay1.getId(),
                null,
                RequestType.CREATE,
                """
                {
                  "roomId": %d,
                  "ruleType": "ADJUSTMENT",
                  "name": "Tăng giá bị từ chối",
                  "adjustType": "PERCENT",
                  "adjustValue": 80,
                  "priority": 30
                }
                """.formatted(room1.getId()),
                Status.REJECTED,
                manager1.getId(),
                Instant.parse("2048-05-03T08:00:00Z"),
                director.getId(),
                Instant.parse("2048-05-03T09:00:00Z"),
                "Mức tăng chưa phù hợp"
        );

        mockMvc.perform(get("/api/v1/director/price-rule-change-requests/{id}", rejectedReq.getId())
                        .header("Authorization", "Bearer " + directorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("REJECTED")))
                .andExpect(jsonPath("$.data.reviewedByName", is(director.getFullName())))
                .andExpect(jsonPath("$.data.rejectionReason", is("Mức tăng chưa phù hợp")))
                .andExpect(jsonPath("$.data.roomDetail.id", is(room1.getId().intValue())))
                .andExpect(jsonPath("$.data.priceComparison", nullValue()));

        // 4. Không tìm thấy → 404 PRICE_REQUEST_NOT_FOUND
        mockMvc.perform(get("/api/v1/director/price-rule-change-requests/{id}", 999999999L)
                        .header("Authorization", "Bearer " + directorToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code", is("PRICE_REQUEST_NOT_FOUND")));

        // 5. RBAC: chưa đăng nhập / LOCKED → 401; ADMIN / MANAGER / CUSTOMER → 403
        mockMvc.perform(get("/api/v1/director/price-rule-change-requests/{id}", scopeReq.getId()))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/director/price-rule-change-requests/{id}", scopeReq.getId())
                        .header("Authorization", "Bearer " + lockedDirectorToken))
                .andExpect(status().isUnauthorized());

        for (String forbiddenToken : new String[]{adminToken, managerToken, customerToken}) {
            mockMvc.perform(get("/api/v1/director/price-rule-change-requests/{id}", scopeReq.getId())
                            .header("Authorization", "Bearer " + forbiddenToken))
                    .andExpect(status().isForbidden());
        }
    }

    private Homestay createHomestay(String name, String province, String address, String hotline) {
        Homestay hs = new Homestay();
        hs.setName(name);
        hs.setProvince(province);
        hs.setAddress(address);
        hs.setHotlinePhone(hotline);
        hs.setStatus(HomestayStatus.ACTIVE);
        return homestayRepository.saveAndFlush(hs);
    }

    private User createUser(Role role, UserStatus status, Long homestayId, String fullName) {
        String random = UUID.randomUUID().toString().replace("-", "");
        User user = new User();
        user.setEmail(role.name().toLowerCase() + "-pr-" + random.substring(0, 8) + "@homestay.test");
        user.setPasswordHash("encoded-test-password");
        user.setFullName(fullName);
        user.setPhone("09" + random.replaceAll("[^0-9]", "1").concat("12345678").substring(0, 8));
        user.setRole(role);
        user.setStatus(status);
        user.setHomestayId(homestayId);
        return userRepository.saveAndFlush(user);
    }

    private PriceRuleChangeRequest createChangeRequest(
            Long homestayId,
            Long targetRuleId,
            RequestType requestType,
            String proposedRuleJson,
            Status status,
            Long requestedBy,
            Instant requestedAt,
            Long reviewedBy,
            Instant reviewedAt,
            String rejectionReason
    ) {
        PriceRuleChangeRequest req = new PriceRuleChangeRequest();
        req.setHomestayId(homestayId);
        req.setTargetRuleId(targetRuleId);
        req.setRequestType(requestType);
        req.setProposedRule(proposedRuleJson);
        req.setStatus(status);
        req.setRequestedBy(requestedBy);
        req.setRequestedAt(requestedAt);
        req.setReviewedBy(reviewedBy);
        req.setReviewedAt(reviewedAt);
        req.setRejectionReason(rejectionReason);
        return changeRequestRepository.saveAndFlush(req);
    }

    private Room createRoom(Long homestayId, Long roomTypeId, String name, byte maxGuests, RoomStatus status) {
        Room room = new Room();
        room.setHomestayId(homestayId);
        room.setRoomTypeId(roomTypeId);
        room.setName(name);
        room.setMaxGuests(maxGuests);
        room.setStatus(status);
        return roomRepository.saveAndFlush(room);
    }

    private PriceRule createBaseRule(Long homestayId, Long roomId, String name, long basePrice) {
        PriceRule rule = new PriceRule();
        rule.setHomestayId(homestayId);
        rule.setRoomId(roomId);
        rule.setRuleType(RuleType.BASE);
        rule.setName(name);
        rule.setBasePrice(basePrice);
        rule.setPriority((short) 0);
        rule.setStatus(PriceRule.Status.ACTIVE);
        rule.setCreatedAt(Instant.now());
        rule.setUpdatedAt(Instant.now());
        return priceRuleRepository.saveAndFlush(rule);
    }
}
