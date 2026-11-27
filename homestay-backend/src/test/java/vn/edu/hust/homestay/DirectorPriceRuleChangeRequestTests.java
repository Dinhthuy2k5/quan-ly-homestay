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
 * Kiểm thử tích hợp cho API-DIR-PRICE-01 (GET /api/v1/director/price-rule-change-requests).
 */
@SpringBootTest
@Transactional
class DirectorPriceRuleChangeRequestTests {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private HomestayRepository homestayRepository;
    @Autowired private RoomTypeRepository roomTypeRepository;
    @Autowired private RoomRepository roomRepository;
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
}
