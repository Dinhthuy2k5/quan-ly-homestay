package vn.edu.hust.homestay;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.web.context.WebApplicationContext;
import vn.edu.hust.homestay.auth.entity.Role;
import vn.edu.hust.homestay.auth.entity.User;
import vn.edu.hust.homestay.auth.entity.UserStatus;
import vn.edu.hust.homestay.auth.repository.UserRepository;
import vn.edu.hust.homestay.auth.security.JwtService;
import vn.edu.hust.homestay.homestay.entity.Homestay;
import vn.edu.hust.homestay.homestay.repository.HomestayRepository;
import vn.edu.hust.homestay.service.entity.Service;
import vn.edu.hust.homestay.service.entity.Service.ServiceStatus;
import vn.edu.hust.homestay.service.entity.ServiceCategory;
import vn.edu.hust.homestay.service.repository.ServiceCategoryRepository;
import vn.edu.hust.homestay.service.repository.ServiceRepository;

import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@Transactional
class ManagerServiceTests {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private HomestayRepository homestayRepository;
    @Autowired private ServiceRepository serviceRepository;
    @Autowired private ServiceCategoryRepository serviceCategoryRepository;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbcTemplate;

    private MockMvc mockMvc;

    private User manager1;
    private User manager2;
    private User unassignedMgr;
    private User customer;

    private String tokenMgr1;
    private String tokenMgr2;
    private String tokenUnassigned;
    private String tokenCustomer;

    private Long homestay1Id;
    private Long homestay2Id;

    private ServiceCategory cat1;
    private ServiceCategory cat2;
    private ServiceCategory catHs2;
    private Service svc1;
    private Service svc2;
    private Service svcInactive;
    private final ObjectMapper objectMapper = new ObjectMapper();

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
        tokenUnassigned = jwtService.generateAccessToken(unassignedMgr);

        customer = userRepository.findByEmail("an.nguyen@example.com").orElseGet(() ->
                userRepository.findByEmail("customer@gmail.com").orElseThrow());
        tokenCustomer = jwtService.generateAccessToken(customer);

        // Tạo dữ liệu danh mục cho homestay 1
        String uniqueSuffix = UUID.randomUUID().toString().substring(0, 8);
        cat1 = new ServiceCategory();
        cat1.setHomestayId(homestay1Id);
        cat1.setName("Ẩm thực " + uniqueSuffix);
        cat1 = serviceCategoryRepository.saveAndFlush(cat1);

        cat2 = new ServiceCategory();
        cat2.setHomestayId(homestay1Id);
        cat2.setName("Trải nghiệm " + uniqueSuffix);
        cat2 = serviceCategoryRepository.saveAndFlush(cat2);

        // Dịch vụ 1 (Ẩm thực, ACTIVE)
        svc1 = new Service();
        svc1.setHomestayId(homestay1Id);
        svc1.setCategoryId(cat1.getId());
        svc1.setName("Bữa sáng bản địa " + uniqueSuffix);
        svc1.setUnit("suất");
        svc1.setUnitPrice(80000L);
        svc1.setDescription("Bữa sáng xôi nếp nương đặc sản");
        svc1.setStatus(ServiceStatus.ACTIVE);
        svc1 = serviceRepository.saveAndFlush(svc1);

        // Dịch vụ 2 (Trải nghiệm, ACTIVE)
        svc2 = new Service();
        svc2.setHomestayId(homestay1Id);
        svc2.setCategoryId(cat2.getId());
        svc2.setName("Thuê xe máy " + uniqueSuffix);
        svc2.setUnit("ngày");
        svc2.setUnitPrice(150000L);
        svc2.setDescription("Xe máy tay ga tiết kiệm xăng");
        svc2.setStatus(ServiceStatus.ACTIVE);
        svc2 = serviceRepository.saveAndFlush(svc2);

        // Dịch vụ 3 (Ẩm thực, INACTIVE)
        svcInactive = new Service();
        svcInactive.setHomestayId(homestay1Id);
        svcInactive.setCategoryId(cat1.getId());
        svcInactive.setName("Tiệc nướng BBQ " + uniqueSuffix);
        svcInactive.setUnit("set");
        svcInactive.setUnitPrice(350000L);
        svcInactive.setDescription("Tiệc nướng ngoài trời tạm dừng mùa mưa");
        svcInactive.setStatus(ServiceStatus.INACTIVE);
        svcInactive = serviceRepository.saveAndFlush(svcInactive);

        // Dịch vụ của Homestay 2 (để kiểm tra phân lập homestay)
        catHs2 = new ServiceCategory();
        catHs2.setHomestayId(homestay2Id);
        catHs2.setName("Danh mục HS2 " + uniqueSuffix);
        catHs2 = serviceCategoryRepository.saveAndFlush(catHs2);

        Service svcHs2 = new Service();
        svcHs2.setHomestayId(homestay2Id);
        svcHs2.setCategoryId(catHs2.getId());
        svcHs2.setName("Dịch vụ riêng của HS2 " + uniqueSuffix);
        svcHs2.setUnit("lượt");
        svcHs2.setUnitPrice(200000L);
        svcHs2.setDescription("Chỉ thuộc cơ sở 2");
        svcHs2.setStatus(ServiceStatus.ACTIVE);
        serviceRepository.saveAndFlush(svcHs2);
    }

    @Test
    @DisplayName("API-MGR-SVC-01: Manager xem danh sách dịch vụ cơ sở thành công")
    void getServices_Success() throws Exception {
        mockMvc.perform(get("/api/v1/manager/services")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", notNullValue()))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(3))))
                .andExpect(jsonPath("$.data[*].name", hasItem(svc1.getName())))
                .andExpect(jsonPath("$.data[*].name", hasItem(svc2.getName())))
                .andExpect(jsonPath("$.data[*].name", hasItem(svcInactive.getName())))
                .andExpect(jsonPath("$.data[0].id", notNullValue()))
                .andExpect(jsonPath("$.data[0].categoryId", notNullValue()))
                .andExpect(jsonPath("$.data[0].categoryName", notNullValue()))
                .andExpect(jsonPath("$.data[0].unit", notNullValue()))
                .andExpect(jsonPath("$.data[0].unitPrice", notNullValue()))
                .andExpect(jsonPath("$.data[0].status", notNullValue()))
                .andExpect(jsonPath("$.meta.page", is(0)))
                .andExpect(jsonPath("$.meta.size", notNullValue()))
                .andExpect(jsonPath("$.meta.totalElements", greaterThanOrEqualTo(3)))
                .andExpect(jsonPath("$.meta.totalPages", greaterThanOrEqualTo(1)));
    }

    @Test
    @DisplayName("API-MGR-SVC-01: Lọc dịch vụ theo trạng thái ACTIVE và INACTIVE")
    void getServices_FilterByStatus() throws Exception {
        // Lọc ACTIVE
        mockMvc.perform(get("/api/v1/manager/services")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .param("status", "ACTIVE")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].name", hasItem(svc1.getName())))
                .andExpect(jsonPath("$.data[*].name", hasItem(svc2.getName())))
                .andExpect(jsonPath("$.data[*].name", not(hasItem(svcInactive.getName()))))
                .andExpect(jsonPath("$.data[*].status", everyItem(is("ACTIVE"))));

        // Lọc INACTIVE
        mockMvc.perform(get("/api/v1/manager/services")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .param("status", "INACTIVE")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].name", hasItem(svcInactive.getName())))
                .andExpect(jsonPath("$.data[*].name", not(hasItem(svc1.getName()))))
                .andExpect(jsonPath("$.data[*].status", everyItem(is("INACTIVE"))));
    }

    @Test
    @DisplayName("API-MGR-SVC-01: Lọc dịch vụ theo categoryId")
    void getServices_FilterByCategory() throws Exception {
        mockMvc.perform(get("/api/v1/manager/services")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .param("categoryId", cat2.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].name", hasItem(svc2.getName())))
                .andExpect(jsonPath("$.data[*].name", not(hasItem(svc1.getName()))))
                .andExpect(jsonPath("$.data[*].categoryId", everyItem(is(cat2.getId().intValue()))));
    }

    @Test
    @DisplayName("API-MGR-SVC-01: Phân trang và sắp xếp (sort)")
    void getServices_PaginationAndSorting() throws Exception {
        mockMvc.perform(get("/api/v1/manager/services")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .param("page", "0")
                        .param("size", "1")
                        .param("sort", "unitPrice,desc")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.meta.page", is(0)))
                .andExpect(jsonPath("$.meta.size", is(1)));
    }

    @Test
    @DisplayName("API-MGR-SVC-01: Phân lập homestay - không thấy dịch vụ của homestay khác")
    void getServices_ScopeIsolation() throws Exception {
        mockMvc.perform(get("/api/v1/manager/services")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].name", not(hasItem(containsString("Dịch vụ riêng của HS2")))));
    }

    @Test
    @DisplayName("API-MGR-SVC-01: Manager chưa được phân công cơ sở nhận mã lỗi HOMESTAY_NOT_ASSIGNED")
    void getServices_UnassignedManager_Fails() throws Exception {
        mockMvc.perform(get("/api/v1/manager/services")
                        .header("Authorization", "Bearer " + tokenUnassigned)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_NOT_ASSIGNED")));
    }

    @Test
    @DisplayName("API-MGR-SVC-01: Customer hoặc tài khoản chưa đăng nhập bị từ chối")
    void getServices_UnauthorizedOrForbidden() throws Exception {
        // Customer bị 403 Forbidden
        mockMvc.perform(get("/api/v1/manager/services")
                        .header("Authorization", "Bearer " + tokenCustomer)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());

        // Không có token bị 401 Unauthorized
        mockMvc.perform(get("/api/v1/manager/services")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/v1/manager/service-categories: Lấy danh mục dịch vụ của homestay thành công")
    void getServiceCategories_Success() throws Exception {
        mockMvc.perform(get("/api/v1/manager/service-categories")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", notNullValue()))
                .andExpect(jsonPath("$.data[*].name", hasItem(cat1.getName())))
                .andExpect(jsonPath("$.data[*].name", hasItem(cat2.getName())));
    }

    @Test
    @DisplayName("API-MGR-SVC-02: Khai báo dịch vụ mới thành công - 201 Created")
    void createService_Success() throws Exception {
        String uniqueName = "Lẩu gà đen H'Mông " + UUID.randomUUID().toString().substring(0, 8);
        String body = """
                {
                    "categoryId": %d,
                    "name": "%s",
                    "unit": "nồi",
                    "unitPrice": 450000,
                    "description": "Lẩu gà đen đặc sản Tây Bắc kèm rau rừng tươi"
                }
                """.formatted(cat1.getId(), uniqueName);

        mockMvc.perform(post("/api/v1/manager/services")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.name", is(uniqueName)))
                .andExpect(jsonPath("$.data.unit", is("nồi")))
                .andExpect(jsonPath("$.data.unitPrice", is(450000)))
                .andExpect(jsonPath("$.data.status", is("ACTIVE")))
                .andExpect(jsonPath("$.data.categoryId", is(cat1.getId().intValue())))
                .andExpect(jsonPath("$.data.categoryName", is(cat1.getName())));
    }

    @Test
    @DisplayName("API-MGR-SVC-02: Trùng tên dịch vụ trong cùng homestay - 409 Conflict (SERVICE_NAME_EXISTS)")
    void createService_DuplicateName_Fails() throws Exception {
        String body = """
                {
                    "categoryId": %d,
                    "name": "%s",
                    "unit": "suất",
                    "unitPrice": 99000,
                    "description": "Tên trùng dịch vụ đã có"
                }
                """.formatted(cat1.getId(), svc1.getName());

        mockMvc.perform(post("/api/v1/manager/services")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("SERVICE_NAME_EXISTS")));
    }

    @Test
    @DisplayName("API-MGR-SVC-02: Danh mục không thuộc homestay của Manager - 400 Bad Request (SERVICE_CATEGORY_SCOPE_MISMATCH)")
    void createService_WrongCategory_Fails() throws Exception {
        String body = """
                {
                    "categoryId": %d,
                    "name": "Dịch vụ danh mục chéo %s",
                    "unit": "lượt",
                    "unitPrice": 100000,
                    "description": "Dùng danh mục của HS2"
                }
                """.formatted(catHs2.getId(), UUID.randomUUID().toString().substring(0, 8));

        mockMvc.perform(post("/api/v1/manager/services")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("SERVICE_CATEGORY_SCOPE_MISMATCH")));
    }

    @Test
    @DisplayName("API-MGR-SVC-02: Dữ liệu không hợp lệ - 400 Bad Request (VALIDATION_ERROR)")
    void createService_ValidationError_Fails() throws Exception {
        // Tên rỗng, đơn giá âm
        String body = """
                {
                    "categoryId": %d,
                    "name": "   ",
                    "unit": "",
                    "unitPrice": -10000,
                    "description": "Sai validation"
                }
                """.formatted(cat1.getId());

        mockMvc.perform(post("/api/v1/manager/services")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("VALIDATION_ERROR")));
    }

    @Test
    @DisplayName("API-MGR-SVC-02: Nhập chuỗi chữ 'abc' vào đơn giá bị chặn tại backend trả về 400 VALIDATION_ERROR")
    void createService_StringInUnitPrice_FailsWithBadRequest() throws Exception {
        String body = """
                {
                    "categoryId": %d,
                    "name": "Dịch vụ giá chữ",
                    "unit": "suất",
                    "unitPrice": "abc",
                    "description": "Kiểm tra nhập chữ vào đơn giá"
                }
                """.formatted(cat1.getId());

        mockMvc.perform(post("/api/v1/manager/services")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("VALIDATION_ERROR")))
                .andExpect(jsonPath("$.error.message", containsString("unitPrice")));
    }

    @Test
    @DisplayName("API-MGR-SVC-02: Đơn giá vượt quá giới hạn tối đa 1.000.000.000 VNĐ bị từ chối 400 VALIDATION_ERROR")
    void createService_ExceedsMaxUnitPrice_Fails() throws Exception {
        String body = """
                {
                    "categoryId": %d,
                    "name": "Dịch vụ giá trên trời",
                    "unit": "suất",
                    "unitPrice": 1500000000,
                    "description": "Giá 1.5 tỷ vượt giới hạn"
                }
                """.formatted(cat1.getId());

        mockMvc.perform(post("/api/v1/manager/services")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("VALIDATION_ERROR")));
    }

    @Test
    @DisplayName("API-MGR-SVC-02: Manager chưa được phân công cơ sở nhận mã lỗi HOMESTAY_NOT_ASSIGNED")
    void createService_UnassignedManager_Fails() throws Exception {
        String body = """
                {
                    "categoryId": %d,
                    "name": "Dịch vụ của quản lý chưa phân công",
                    "unit": "lượt",
                    "unitPrice": 50000,
                    "description": "Không có homestay_id"
                }
                """.formatted(cat1.getId());

        mockMvc.perform(post("/api/v1/manager/services")
                        .header("Authorization", "Bearer " + tokenUnassigned)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_NOT_ASSIGNED")));
    }

    @Test
    @DisplayName("API-MGR-SVC-02: Customer hoặc không có token bị từ chối")
    void createService_UnauthorizedOrForbidden() throws Exception {
        String body = """
                {
                    "categoryId": %d,
                    "name": "Dịch vụ khách tạo trộm",
                    "unit": "suất",
                    "unitPrice": 100000
                }
                """.formatted(cat1.getId());

        // Customer -> 403
        mockMvc.perform(post("/api/v1/manager/services")
                        .header("Authorization", "Bearer " + tokenCustomer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());

        // Anonymous -> 401
        mockMvc.perform(post("/api/v1/manager/services")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/v1/manager/services/{serviceId}: Xem chi tiết dịch vụ thành công")
    void getServiceDetail_Success() throws Exception {
        mockMvc.perform(get("/api/v1/manager/services/" + svc1.getId())
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(svc1.getId().intValue())))
                .andExpect(jsonPath("$.data.name", is(svc1.getName())))
                .andExpect(jsonPath("$.data.unit", is(svc1.getUnit())))
                .andExpect(jsonPath("$.data.unitPrice", is(svc1.getUnitPrice().intValue())))
                .andExpect(jsonPath("$.data.status", is("ACTIVE")))
                .andExpect(jsonPath("$.data.categoryName", is(cat1.getName())));
    }

    @Test
    @DisplayName("GET /api/v1/manager/services/{serviceId}: Không tìm thấy dịch vụ - 404 SERVICE_NOT_FOUND")
    void getServiceDetail_NotFound() throws Exception {
        mockMvc.perform(get("/api/v1/manager/services/999999")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("SERVICE_NOT_FOUND")));
    }

    @Test
    @DisplayName("GET /api/v1/manager/services/{serviceId}: Quản lý xem dịch vụ cơ sở khác - 403 HOMESTAY_SCOPE_VIOLATION")
    void getServiceDetail_ScopeViolation() throws Exception {
        mockMvc.perform(get("/api/v1/manager/services/" + svc1.getId())
                        .header("Authorization", "Bearer " + tokenMgr2)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_SCOPE_VIOLATION")));
    }

    @Test
    @DisplayName("API-MGR-SVC-03: Cập nhật dịch vụ thành công - 200 OK")
    void updateService_Success() throws Exception {
        String body = """
                {
                    "unitPrice": 120000,
                    "description": "Bữa sáng đặc sản Tây Bắc nếp nương kèm trà hoa cúc",
                    "unit": "phần",
                    "status": "INACTIVE"
                }
                """;

        mockMvc.perform(patch("/api/v1/manager/services/" + svc1.getId())
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(svc1.getId().intValue())))
                .andExpect(jsonPath("$.data.unitPrice", is(120000)))
                .andExpect(jsonPath("$.data.description", is("Bữa sáng đặc sản Tây Bắc nếp nương kèm trà hoa cúc")))
                .andExpect(jsonPath("$.data.unit", is("phần")))
                .andExpect(jsonPath("$.data.status", is("INACTIVE")));
    }

    @Test
    @DisplayName("API-MGR-SVC-03: Cập nhật tên dịch vụ và đổi danh mục thành công")
    void updateService_UpdateNameAndCategory_Success() throws Exception {
        String newName = "Xe tay ga Vision đời mới " + UUID.randomUUID().toString().substring(0, 8);
        String body = """
                {
                    "categoryId": %d,
                    "name": "%s"
                }
                """.formatted(cat2.getId(), newName);

        mockMvc.perform(patch("/api/v1/manager/services/" + svc1.getId())
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.name", is(newName)))
                .andExpect(jsonPath("$.data.categoryId", is(cat2.getId().intValue())))
                .andExpect(jsonPath("$.data.categoryName", is(cat2.getName())));
    }

    @Test
    @DisplayName("API-MGR-SVC-03: Giữ nguyên tên của chính dịch vụ này khi cập nhật trường khác - Không bị báo trùng")
    void updateService_KeepSameName_Success() throws Exception {
        String body = """
                {
                    "name": "%s",
                    "unitPrice": 85000
                }
                """.formatted(svc1.getName());

        mockMvc.perform(patch("/api/v1/manager/services/" + svc1.getId())
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.unitPrice", is(85000)));
    }

    @Test
    @DisplayName("API-MGR-SVC-03: Đổi tên dịch vụ trùng với dịch vụ khác trong cùng cơ sở - 409 Conflict (SERVICE_NAME_EXISTS)")
    void updateService_DuplicateName_Fails() throws Exception {
        String body = """
                {
                    "name": "%s"
                }
                """.formatted(svc2.getName());

        mockMvc.perform(patch("/api/v1/manager/services/" + svc1.getId())
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("SERVICE_NAME_EXISTS")));
    }

    @Test
    @DisplayName("API-MGR-SVC-03: Chuyển sang danh mục của homestay khác - 400 Bad Request (SERVICE_CATEGORY_SCOPE_MISMATCH)")
    void updateService_WrongCategory_Fails() throws Exception {
        String body = """
                {
                    "categoryId": %d
                }
                """.formatted(catHs2.getId());

        mockMvc.perform(patch("/api/v1/manager/services/" + svc1.getId())
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("SERVICE_CATEGORY_SCOPE_MISMATCH")));
    }

    @Test
    @DisplayName("API-MGR-SVC-03: Cập nhật dịch vụ không thuộc cơ sở mình quản lý - 403 Forbidden (HOMESTAY_SCOPE_VIOLATION)")
    void updateService_CrossHomestay_Forbidden() throws Exception {
        String body = """
                {
                    "unitPrice": 999999
                }
                """;

        mockMvc.perform(patch("/api/v1/manager/services/" + svc1.getId())
                        .header("Authorization", "Bearer " + tokenMgr2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_SCOPE_VIOLATION")));
    }

    @Test
    @DisplayName("API-MGR-SVC-03: Cập nhật dịch vụ không tồn tại - 404 Not Found (SERVICE_NOT_FOUND)")
    void updateService_NotFound_Fails() throws Exception {
        String body = """
                {
                    "unitPrice": 999999
                }
                """;

        mockMvc.perform(patch("/api/v1/manager/services/999999")
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("SERVICE_NOT_FOUND")));
    }

    @Test
    @DisplayName("API-MGR-SVC-03: Đơn giá âm hoặc vượt 1 tỷ bị từ chối 400 Bad Request")
    void updateService_InvalidUnitPrice_Fails() throws Exception {
        String bodyNegative = """
                {
                    "unitPrice": -5000
                }
                """;

        mockMvc.perform(patch("/api/v1/manager/services/" + svc1.getId())
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bodyNegative))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)));

        String bodyExceeds = """
                {
                    "unitPrice": 1500000000
                }
                """;

        mockMvc.perform(patch("/api/v1/manager/services/" + svc1.getId())
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bodyExceeds))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)));
    }

    @Test
    @DisplayName("API-MGR-SVC-03: Tên dịch vụ rỗng bị từ chối 400 Bad Request")
    void updateService_EmptyName_Fails() throws Exception {
        String body = """
                {
                    "name": "   "
                }
                """;

        mockMvc.perform(patch("/api/v1/manager/services/" + svc1.getId())
                        .header("Authorization", "Bearer " + tokenMgr1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("INVALID_SERVICE_NAME")));
    }

    @Test
    @DisplayName("API-MGR-SVC-03: Manager chưa phân công homestay - 400 HOMESTAY_NOT_ASSIGNED")
    void updateService_UnassignedManager_Fails() throws Exception {
        String body = """
                {
                    "unitPrice": 90000
                }
                """;

        mockMvc.perform(patch("/api/v1/manager/services/" + svc1.getId())
                        .header("Authorization", "Bearer " + tokenUnassigned)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_NOT_ASSIGNED")));
    }

    @Test
    @DisplayName("API-MGR-SVC-03: Customer hoặc không có token bị từ chối")
    void updateService_UnauthorizedOrForbidden() throws Exception {
        String body = """
                {
                    "unitPrice": 90000
                }
                """;

        // Customer -> 403
        mockMvc.perform(patch("/api/v1/manager/services/" + svc1.getId())
                        .header("Authorization", "Bearer " + tokenCustomer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());

        // Anonymous -> 401
        mockMvc.perform(patch("/api/v1/manager/services/" + svc1.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }
}
