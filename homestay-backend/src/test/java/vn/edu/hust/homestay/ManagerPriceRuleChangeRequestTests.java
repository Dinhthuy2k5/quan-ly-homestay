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
import vn.edu.hust.homestay.pricing.dto.CreatePriceRuleChangeRequest;
import vn.edu.hust.homestay.pricing.dto.ProposedRuleDto;
import vn.edu.hust.homestay.pricing.entity.PriceRule;
import vn.edu.hust.homestay.pricing.entity.PriceRule.AdjustType;
import vn.edu.hust.homestay.pricing.entity.PriceRule.RuleType;
import vn.edu.hust.homestay.pricing.entity.PriceRuleChangeRequest.RequestType;
import vn.edu.hust.homestay.pricing.repository.PriceRuleRepository;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;
import vn.edu.hust.homestay.room.repository.RoomRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiểm thử tích hợp cho API-PRICE-03: Gửi yêu cầu thay đổi quy tắc giá của Manager.
 * Ngày thực hiện: 25/10/2026
 */
@SpringBootTest
@Transactional
class ManagerPriceRuleChangeRequestTests {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private PriceRuleRepository priceRuleRepository;

    @Autowired
    private JwtService jwtService;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private User manager1;
    private User manager2;
    private String tokenMgr1;
    private String tokenMgr2;
    private Long homestay1Id;
    private Long homestay2Id;
    private Long room1Id;
    private Long room2Id;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        manager1 = userRepository.findByEmail("manager.maichau@homestay.vn").orElseThrow();
        manager2 = userRepository.findByEmail("manager.mocchau@homestay.vn").orElseThrow();

        tokenMgr1 = jwtService.generateAccessToken(manager1);
        tokenMgr2 = jwtService.generateAccessToken(manager2);

        homestay1Id = manager1.getHomestayId();
        homestay2Id = manager2.getHomestayId();

        Room r1 = roomRepository.findByHomestayIdAndStatus(homestay1Id, RoomStatus.ACTIVE).stream().findFirst().orElseThrow();
        room1Id = r1.getId();

        Room r2 = roomRepository.findByHomestayIdAndStatus(homestay2Id, RoomStatus.ACTIVE).stream().findFirst().orElseThrow();
        room2Id = r2.getId();
    }

    @Test
    @DisplayName("API-PRICE-03: Manager gửi yêu cầu CREATE quy tắc điều chỉnh giá thành công (201)")
    void testCreateAdjustmentChangeRequest_Success() throws Exception {
        ProposedRuleDto proposed = ProposedRuleDto.builder()
                .ruleType(RuleType.ADJUSTMENT)
                .name("Phụ thu cuối tuần hè")
                .weekdays(List.of("FRI", "SAT"))
                .adjustType(AdjustType.PERCENT)
                .adjustValue(20L)
                .priority((short) 10)
                .startDate(LocalDate.now().plusDays(1))
                .endDate(LocalDate.now().plusDays(30))
                .build();

        CreatePriceRuleChangeRequest request = CreatePriceRuleChangeRequest.builder()
                .requestType(RequestType.CREATE)
                .targetRuleId(null)
                .proposedRule(proposed)
                .build();

        mockMvc.perform(post("/api/v1/manager/price-rule-change-requests")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.requestType").value("CREATE"))
                .andExpect(jsonPath("$.data.status").value("PENDING_APPROVAL"))
                .andExpect(jsonPath("$.data.homestayId").value(homestay1Id));
    }

    @Test
    @DisplayName("API-PRICE-03: Manager gửi yêu cầu CREATE giá cơ bản (BASE) cho phòng thành công (201)")
    void testCreateBasePriceChangeRequest_Success() throws Exception {
        // Dùng phòng mới trong transaction của test để không phụ thuộc đề xuất BASE đang chờ
        // hoặc giá BASE hiện có của dữ liệu seed.
        Room testRoom = new Room();
        testRoom.setHomestayId(homestay1Id);
        testRoom.setRoomTypeId(roomRepository.findById(room1Id).orElseThrow().getRoomTypeId());
        testRoom.setName("Test BASE request " + UUID.randomUUID());
        testRoom.setMaxGuests((byte) 2);
        testRoom.setStatus(RoomStatus.ACTIVE);
        testRoom = roomRepository.saveAndFlush(testRoom);

        ProposedRuleDto proposed = ProposedRuleDto.builder()
                .ruleType(RuleType.BASE)
                .roomId(testRoom.getId())
                .basePrice(1000000L)
                .name("Giá cơ bản mới phòng 101")
                .build();

        CreatePriceRuleChangeRequest request = CreatePriceRuleChangeRequest.builder()
                .requestType(RequestType.CREATE)
                .targetRuleId(null)
                .proposedRule(proposed)
                .build();

        mockMvc.perform(post("/api/v1/manager/price-rule-change-requests")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.requestType").value("CREATE"))
                .andExpect(jsonPath("$.data.status").value("PENDING_APPROVAL"))
                .andExpect(jsonPath("$.data.homestayId").value(homestay1Id));
    }

    @Test
    @DisplayName("API-PRICE-03: Manager gửi yêu cầu UPDATE quy tắc giá của homestay mình thành công (201)")
    void testUpdateChangeRequest_Success() throws Exception {
        // Tìm 1 quy tắc giá ADJUSTMENT thuộc homestay 1 chưa có yêu cầu pending
        PriceRule targetRule = priceRuleRepository.findAll().stream()
                .filter(r -> r.getHomestayId().equals(homestay1Id)
                        && r.getStatus() == PriceRule.Status.ACTIVE
                        && r.getRuleType() == RuleType.ADJUSTMENT
                        && r.getId() != 4L && r.getId() != 13L)
                .findFirst()
                .orElseThrow();

        ProposedRuleDto proposed = ProposedRuleDto.builder()
                .ruleType(targetRule.getRuleType())
                .name("Cập nhật " + targetRule.getName())
                .adjustType(targetRule.getAdjustType() != null ? targetRule.getAdjustType() : AdjustType.PERCENT)
                .adjustValue(15L)
                .priority((short) 12)
                .build();

        CreatePriceRuleChangeRequest request = CreatePriceRuleChangeRequest.builder()
                .requestType(RequestType.UPDATE)
                .targetRuleId(targetRule.getId())
                .proposedRule(proposed)
                .build();

        mockMvc.perform(post("/api/v1/manager/price-rule-change-requests")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.requestType").value("UPDATE"))
                .andExpect(jsonPath("$.data.targetRuleId").value(targetRule.getId()))
                .andExpect(jsonPath("$.data.status").value("PENDING_APPROVAL"));
    }

    @Test
    @DisplayName("API-PRICE-03: Manager gửi yêu cầu DEACTIVATE quy tắc phụ thu thành công (201)")
    void testDeactivateChangeRequest_Success() throws Exception {
        PriceRule targetRule = priceRuleRepository.findAll().stream()
                .filter(r -> r.getHomestayId().equals(homestay1Id)
                        && r.getStatus() == PriceRule.Status.ACTIVE
                        && r.getRuleType() == RuleType.ADJUSTMENT
                        && r.getId() != 4L && r.getId() != 13L)
                .skip(1)
                .findFirst()
                .orElseThrow();

        CreatePriceRuleChangeRequest request = CreatePriceRuleChangeRequest.builder()
                .requestType(RequestType.DEACTIVATE)
                .targetRuleId(targetRule.getId())
                .proposedRule(null)
                .build();

        mockMvc.perform(post("/api/v1/manager/price-rule-change-requests")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.requestType").value("DEACTIVATE"))
                .andExpect(jsonPath("$.data.targetRuleId").value(targetRule.getId()))
                .andExpect(jsonPath("$.data.status").value("PENDING_APPROVAL"));
    }

    @Test
    @DisplayName("API-PRICE-03: Thất bại khi gửi đề xuất thay đổi cho quy tắc đang có yêu cầu PENDING (409)")
    void testChangeRequest_Conflict_WhenAlreadyPending() throws Exception {
        // Quy tắc id 4 trong DB đã có yêu cầu PENDING_APPROVAL
        CreatePriceRuleChangeRequest request = CreatePriceRuleChangeRequest.builder()
                .requestType(RequestType.UPDATE)
                .targetRuleId(4L)
                .proposedRule(ProposedRuleDto.builder()
                        .ruleType(RuleType.BASE)
                        .roomId(room1Id)
                        .basePrice(1400000L)
                        .build())
                .build();

        mockMvc.perform(post("/api/v1/manager/price-rule-change-requests")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("PRICE_REQUEST_ALREADY_PENDING"));
    }

    @Test
    @DisplayName("API-PRICE-03: Thất bại khi Manager gửi đề xuất áp dụng cho phòng thuộc cơ sở khác (403)")
    void testChangeRequest_Forbidden_ScopeViolation() throws Exception {
        // Manager 1 gửi đề xuất gán vào room2Id của homestay 2
        ProposedRuleDto proposed = ProposedRuleDto.builder()
                .ruleType(RuleType.BASE)
                .roomId(room2Id)
                .basePrice(800000L)
                .build();

        CreatePriceRuleChangeRequest request = CreatePriceRuleChangeRequest.builder()
                .requestType(RequestType.CREATE)
                .targetRuleId(null)
                .proposedRule(proposed)
                .build();

        mockMvc.perform(post("/api/v1/manager/price-rule-change-requests")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("HOMESTAY_SCOPE_VIOLATION"));
    }

    @Test
    @DisplayName("API-PRICE-03: Thất bại khi đề xuất có startDate sau endDate (400)")
    void testChangeRequest_BadRequest_InvalidDates() throws Exception {
        ProposedRuleDto proposed = ProposedRuleDto.builder()
                .ruleType(RuleType.ADJUSTMENT)
                .name("Ngày lỗi")
                .adjustType(AdjustType.PERCENT)
                .adjustValue(10L)
                .startDate(LocalDate.now().plusDays(10))
                .endDate(LocalDate.now().plusDays(2)) // startDate > endDate
                .build();

        CreatePriceRuleChangeRequest request = CreatePriceRuleChangeRequest.builder()
                .requestType(RequestType.CREATE)
                .targetRuleId(null)
                .proposedRule(proposed)
                .build();

        mockMvc.perform(post("/api/v1/manager/price-rule-change-requests")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_PRICE_RULE"));
    }
}
