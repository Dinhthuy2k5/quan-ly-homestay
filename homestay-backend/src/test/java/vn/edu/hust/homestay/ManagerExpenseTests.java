package vn.edu.hust.homestay;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import vn.edu.hust.homestay.auth.entity.User;
import vn.edu.hust.homestay.auth.entity.Role;
import vn.edu.hust.homestay.auth.entity.UserStatus;
import vn.edu.hust.homestay.auth.repository.UserRepository;
import vn.edu.hust.homestay.auth.security.JwtService;
import vn.edu.hust.homestay.expense.entity.Expense;
import vn.edu.hust.homestay.expense.entity.ExpenseCategory;
import vn.edu.hust.homestay.expense.repository.ExpenseCategoryRepository;
import vn.edu.hust.homestay.expense.repository.ExpenseRepository;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Integration tests for API-EXP-03/04; database state is asserted with JDBC after each request. */
@SpringBootTest(properties = "app.storage.upload-dir=target/test-expense-uploads")
@Transactional
class ManagerExpenseTests {

    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository userRepository;
    @Autowired private ExpenseCategoryRepository categoryRepository;
    @Autowired private ExpenseRepository expenseRepository;
    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbcTemplate;

    private MockMvc mockMvc;
    private User manager;
    private User otherManager;
    private User customer;
    private User director;
    private String managerToken;
    private String otherManagerToken;
    private String customerToken;
    private String directorToken;
    private Long homestayId;
    private ExpenseCategory category;
    private Path uploadRoot;

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
        director = new User();
        director.setEmail("expense-audit-director-" + UUID.randomUUID() + "@homestay.test");
        director.setPasswordHash("not-used-by-tests");
        director.setFullName("Director Audit Test");
        director.setRole(Role.DIRECTOR);
        director.setStatus(UserStatus.ACTIVE);
        director = userRepository.saveAndFlush(director);
        directorToken = jwtService.generateAccessToken(director);
        homestayId = manager.getHomestayId();
        category = categoryRepository.findByHomestayIdOrderByNameAsc(homestayId).stream().findFirst().orElseThrow();
        uploadRoot = Path.of("target/test-expense-uploads").toAbsolutePath().normalize();
    }

    @Test
    @DisplayName("API-EXP-03: cập nhật một phần và xác minh các cột thật trong MySQL")
    void patchUpdatesOnlyProvidedFieldsAndPersistsDatabaseValues() throws Exception {
        Expense expense = createExpense();

        patchExpense(expense.getId(), managerToken)
                .param("amount", "1600000")
                .param("description", "Điều chỉnh hóa đơn điện")
                .param("documentNumber", "HD-00126")
                .perform(mockMvc)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(expense.getId()))
                .andExpect(jsonPath("$.data.amount").value(1_600_000))
                .andExpect(jsonPath("$.data.description").value("Điều chỉnh hóa đơn điện"))
                .andExpect(jsonPath("$.data.documentNumber").value("HD-00126"))
                .andExpect(jsonPath("$.data.categoryName").value(category.getName()))
                .andExpect(jsonPath("$.data.paymentMethod").value("BANK_TRANSFER"));

        Map<String, Object> row = jdbcTemplate.queryForMap(
                "SELECT amount, expense_date, description, supplier_name, document_number, payment_method FROM expenses WHERE id = ?",
                expense.getId());
        assertEquals(1_600_000L, ((Number) row.get("amount")).longValue());
        assertEquals("2026-10-08", row.get("expense_date").toString());
        assertEquals("Điều chỉnh hóa đơn điện", row.get("description"));
        assertEquals("Điện lực Mai Châu", row.get("supplier_name"));
        assertEquals("HD-00126", row.get("document_number"));
        assertEquals("BANK_TRANSFER", row.get("payment_method"));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM expense_audit_logs WHERE expense_id = ? AND action = 'UPDATED' AND actor_id = ?",
                Integer.class, expense.getId(), manager.getId()));
        Map<String, Object> history = jdbcTemplate.queryForMap(
                "SELECT before_data, after_data FROM expense_audit_logs WHERE expense_id = ? AND action = 'UPDATED'",
                expense.getId());
        assertTrue(history.get("before_data").toString().contains("1500000"));
        assertTrue(history.get("after_data").toString().contains("1600000"));
    }

    @Test
    @DisplayName("API-EXP-03: thay chứng từ lưu file mới và cập nhật proof_url trong MySQL")
    void patchReplacesProofAndPersistsNewProofUrl() throws Exception {
        Expense expense = createExpense();
        MockMultipartFile proof = new MockMultipartFile(
                "proofFile", "hoa-don.pdf", "application/pdf", "%PDF-1.7\nexpense proof".getBytes());

        patchExpense(expense.getId(), managerToken)
                .file(proof)
                .param("description", "Đã cập nhật kèm hóa đơn")
                .perform(mockMvc)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.proofUrl").isString());

        String savedProofUrl = jdbcTemplate.queryForObject(
                "SELECT proof_url FROM expenses WHERE id = ?", String.class, expense.getId());
        assertNotNull(savedProofUrl);
        assertTrue(savedProofUrl.startsWith("/files/expenses/"));
        String generatedFilename = savedProofUrl.substring("/files/expenses/".length());
        assertTrue(Files.exists(uploadRoot.resolve("expenses").resolve(generatedFilename)));
        assertEquals("Đã cập nhật kèm hóa đơn", jdbcTemplate.queryForObject(
                "SELECT description FROM expenses WHERE id = ?", String.class, expense.getId()));
    }

    @Test
    @DisplayName("API-EXP-03: amount bằng 0 bị từ chối và dữ liệu MySQL không đổi")
    void patchRejectsNonPositiveAmountAndLeavesDatabaseUnchanged() throws Exception {
        Expense expense = createExpense();

        patchExpense(expense.getId(), managerToken)
                .param("amount", "0")
                .perform(mockMvc)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("AMOUNT_MUST_BE_POSITIVE"));

        assertEquals(1_500_000L, jdbcTemplate.queryForObject(
                "SELECT amount FROM expenses WHERE id = ?", Long.class, expense.getId()));
    }

    @Test
    @DisplayName("API-EXP-03: Manager không sửa được khoản chi của homestay khác")
    void patchRejectsAnotherHomestayAndDoesNotChangeDatabase() throws Exception {
        Expense expense = createExpense();

        patchExpense(expense.getId(), otherManagerToken)
                .param("description", "Không được phép")
                .perform(mockMvc)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("HOMESTAY_SCOPE_VIOLATION"));

        assertEquals("Tiền điện tháng 9", jdbcTemplate.queryForObject(
                "SELECT description FROM expenses WHERE id = ?", String.class, expense.getId()));
    }

    @Test
    @DisplayName("API-EXP-03: khoản chi không tồn tại trả EXPENSE_NOT_FOUND")
    void patchUnknownExpenseReturnsNotFound() throws Exception {
        patchExpense(9_999_999L, managerToken)
                .param("description", "Không tồn tại")
                .perform(mockMvc)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("EXPENSE_NOT_FOUND"));
    }

    @Test
    @DisplayName("API-EXP-03: chỉ Manager được phép sửa khoản chi")
    void patchRejectsCustomerRole() throws Exception {
        Expense expense = createExpense();

        patchExpense(expense.getId(), customerToken)
                .param("description", "Không có quyền")
                .perform(mockMvc)
                .andExpect(status().isForbidden());

        assertEquals("Tiền điện tháng 9", jdbcTemplate.queryForObject(
                "SELECT description FROM expenses WHERE id = ?", String.class, expense.getId()));
    }

    @Test
    @DisplayName("API-EXP-04: hủy khoản chi giữ nguyên row, lưu lý do và audit vào MySQL")
    void cancelKeepsExpenseAndPersistsActorReasonAndAudit() throws Exception {
        Expense expense = createExpense();

        mockMvc.perform(post("/api/v1/manager/expenses/{expenseId}/cancel", expense.getId())
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType("application/json")
                        .content("{\"reason\":\"Hóa đơn nhập trùng\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.cancelled").value(true));

        Map<String, Object> row = jdbcTemplate.queryForMap(
                "SELECT cancelled_at, cancelled_by, cancellation_reason, proof_url FROM expenses WHERE id = ?", expense.getId());
        assertNotNull(row.get("cancelled_at"));
        assertEquals(manager.getId().longValue(), ((Number) row.get("cancelled_by")).longValue());
        assertEquals("Hóa đơn nhập trùng", row.get("cancellation_reason"));
        assertEquals("/files/expenses/old.pdf", row.get("proof_url"));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM expense_audit_logs WHERE expense_id = ? AND action = 'CANCELLED' AND actor_id = ?",
                Integer.class, expense.getId(), manager.getId()));
        String afterData = jdbcTemplate.queryForObject(
                "SELECT after_data FROM expense_audit_logs WHERE expense_id = ? AND action = 'CANCELLED'",
                String.class, expense.getId());
        assertTrue(afterData.contains("Hóa đơn nhập trùng"));
    }

    @Test
    @DisplayName("API-EXP-04: Manager không xóa được khoản chi của homestay khác")
    void deleteRejectsAnotherHomestayAndKeepsDatabaseRow() throws Exception {
        Expense expense = createExpense();

        mockMvc.perform(post("/api/v1/manager/expenses/{expenseId}/cancel", expense.getId())
                        .header("Authorization", "Bearer " + otherManagerToken)
                        .contentType("application/json")
                        .content("{\"reason\":\"Không thuộc cơ sở\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("HOMESTAY_SCOPE_VIOLATION"));

        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM expenses WHERE id = ?", Integer.class, expense.getId()));
    }

    @Test
    @DisplayName("API-EXP-04: xóa khoản chi không tồn tại trả EXPENSE_NOT_FOUND")
    void deleteUnknownExpenseReturnsNotFound() throws Exception {
        mockMvc.perform(post("/api/v1/manager/expenses/{expenseId}/cancel", 9_999_999L)
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType("application/json")
                        .content("{\"reason\":\"Nhập nhầm\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("EXPENSE_NOT_FOUND"));
    }

    @Test
    @DisplayName("Nhật ký kiểm toán append-only: MySQL từ chối cập nhật bản ghi đã lưu")
    void auditLogCannotBeModifiedAfterInsert() {
        Expense expense = createExpense();
        jdbcTemplate.update("INSERT INTO expense_audit_logs (expense_id, actor_id, action, after_data) VALUES (?, ?, 'CREATED', JSON_OBJECT('amount', 1500000))",
                expense.getId(), manager.getId());
        Long auditId = jdbcTemplate.queryForObject(
                "SELECT MAX(id) FROM expense_audit_logs WHERE expense_id = ?", Long.class, expense.getId());

        assertThrows(org.springframework.dao.DataAccessException.class,
                () -> jdbcTemplate.update("UPDATE expense_audit_logs SET reason = 'edited' WHERE id = ?", auditId));
        assertNull(jdbcTemplate.queryForObject("SELECT reason FROM expense_audit_logs WHERE id = ?", String.class, auditId));
    }

    @Test
    @DisplayName("Database từ chối INSERT khoản chi mới nếu thiếu loại/tệp chứng từ")
    void databaseRejectsNewExpenseWithoutProof() {
        assertThrows(org.springframework.dao.DataAccessException.class, () -> jdbcTemplate.update(
                "INSERT INTO expenses (homestay_id, category_id, amount, expense_date, created_by) VALUES (?, ?, ?, ?, ?)",
                homestayId, category.getId(), 25_000L, LocalDate.of(2026, 10, 8), manager.getId()));
    }

    @Test
    @DisplayName("Director được xem lịch sử, Manager không được xem lịch sử toàn công ty")
    void directorCanReadAuditHistoryButManagerCannot() throws Exception {
        Expense expense = createExpense();
        jdbcTemplate.update("INSERT INTO expense_audit_logs (expense_id, actor_id, action, after_data) VALUES (?, ?, 'CREATED', JSON_OBJECT('amount', 1500000))",
                expense.getId(), manager.getId());

        mockMvc.perform(get("/api/v1/director/expenses/{expenseId}/history", expense.getId())
                        .header("Authorization", "Bearer " + directorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].action").value("CREATED"))
                .andExpect(jsonPath("$.data[0].actorId").value(manager.getId()))
                .andExpect(jsonPath("$.data[0].afterData.amount").value(1_500_000));

        mockMvc.perform(get("/api/v1/director/expenses/{expenseId}/history", expense.getId())
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("API-EXP-02: không tạo khoản chi mới nếu thiếu tệp chứng từ")
    void createRejectsMissingProofAndDoesNotInsertExpense() throws Exception {
        int before = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM expenses", Integer.class);
        mockMvc.perform(multipart("/api/v1/manager/expenses")
                        .header("Authorization", "Bearer " + managerToken)
                        .param("categoryId", category.getId().toString())
                        .param("amount", "45000")
                        .param("expenseDate", "2026-10-08")
                        .param("documentType", "RECEIPT"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
        assertEquals(before, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM expenses", Integer.class));
    }

    @Test
    @DisplayName("API-EXP-02: khoản chi mới có loại chứng từ và tệp bắt buộc, đồng thời ghi audit tạo mới")
    void createRequiresAndPersistsProofWithCreatedAudit() throws Exception {
        MockMultipartFile proof = new MockMultipartFile("proofFile", "receipt.pdf", "application/pdf", "%PDF-1.7\nproof".getBytes());
        mockMvc.perform(multipart("/api/v1/manager/expenses")
                        .file(proof)
                        .header("Authorization", "Bearer " + managerToken)
                        .param("categoryId", category.getId().toString())
                        .param("amount", "45000")
                        .param("expenseDate", "2026-10-08")
                        .param("documentType", "RECEIPT"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.proofUrl").isString())
                .andExpect(jsonPath("$.data.documentType").value("RECEIPT"));

        Long id = jdbcTemplate.queryForObject("SELECT MAX(id) FROM expenses", Long.class);
        assertNotNull(jdbcTemplate.queryForObject("SELECT proof_url FROM expenses WHERE id = ?", String.class, id));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM expense_audit_logs WHERE expense_id = ? AND action = 'CREATED' AND actor_id = ?",
                Integer.class, id, manager.getId()));
    }

    private Expense createExpense() {
        Expense expense = new Expense();
        expense.setHomestayId(homestayId);
        expense.setCategoryId(category.getId());
        expense.setAmount(1_500_000L);
        expense.setExpenseDate(LocalDate.of(2026, 10, 8));
        expense.setDescription("Tiền điện tháng 9");
        expense.setSupplierName("Điện lực Mai Châu");
        expense.setDocumentType(Expense.DocumentType.INVOICE);
        expense.setDocumentNumber("HD-00125-" + UUID.randomUUID().toString().substring(0, 8));
        expense.setDocumentDate(LocalDate.of(2026, 10, 8));
        expense.setTransactionReference("FT-" + UUID.randomUUID().toString().substring(0, 8));
        expense.setPaymentMethod(Expense.PaymentMethod.BANK_TRANSFER);
        expense.setProofUrl("/files/expenses/old.pdf");
        expense.setCreatedBy(manager.getId());
        return expenseRepository.saveAndFlush(expense);
    }

    private PatchRequest patchExpense(Long expenseId, String token) {
        return new PatchRequest(multipart("/api/v1/manager/expenses/{expenseId}", expenseId)
                .header("Authorization", "Bearer " + token)
                .with(request -> {
                    request.setMethod("PATCH");
                    return request;
                }));
    }

    private static class PatchRequest {
        private final org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder builder;
        private PatchRequest(org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder builder) { this.builder = builder; }
        private PatchRequest param(String name, String value) { builder.param(name, value); return this; }
        private PatchRequest file(MockMultipartFile file) { builder.file(file); return this; }
        private org.springframework.test.web.servlet.ResultActions perform(MockMvc mvc) throws Exception { return mvc.perform(builder); }
    }
}
