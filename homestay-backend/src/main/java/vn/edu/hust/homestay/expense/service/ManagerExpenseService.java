package vn.edu.hust.homestay.expense.service;

import jakarta.persistence.criteria.Predicate;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import vn.edu.hust.homestay.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.expense.dto.CreateExpenseRequest;
import vn.edu.hust.homestay.expense.dto.CancelExpenseRequest;
import vn.edu.hust.homestay.expense.dto.CancelExpenseResponse;
import vn.edu.hust.homestay.expense.dto.ExpenseCategoryResponse;
import vn.edu.hust.homestay.expense.dto.ManagerExpenseListResponse;
import vn.edu.hust.homestay.expense.dto.ManagerExpenseResponse;
import vn.edu.hust.homestay.expense.dto.UpdateExpenseRequest;
import vn.edu.hust.homestay.expense.entity.Expense;
import vn.edu.hust.homestay.expense.entity.ExpenseCategory;
import vn.edu.hust.homestay.expense.entity.ExpenseAuditLog;
import vn.edu.hust.homestay.expense.repository.ExpenseCategoryRepository;
import vn.edu.hust.homestay.expense.repository.ExpenseRepository;
import vn.edu.hust.homestay.expense.repository.ExpenseAuditLogRepository;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ManagerExpenseService {

    private static final Logger log = LoggerFactory.getLogger(ManagerExpenseService.class);
    private static final long MAX_PROOF_SIZE = 5L * 1024 * 1024;
    private static final int MAX_DESCRIPTION_LENGTH = 255;
    private static final int MAX_SUPPLIER_NAME_LENGTH = 150;
    private static final int MAX_DOCUMENT_NUMBER_LENGTH = 100;
    private static final int MAX_TRANSACTION_REFERENCE_LENGTH = 100;

    private final ExpenseRepository expenseRepository;
    private final ExpenseCategoryRepository categoryRepository;
    private final ExpenseAuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    private final Path uploadRoot;

    public ManagerExpenseService(
            ExpenseRepository expenseRepository,
            ExpenseCategoryRepository categoryRepository,
            ExpenseAuditLogRepository auditLogRepository,
            UserRepository userRepository,
            @Value("${app.storage.upload-dir:storage/uploads}") String uploadDir
    ) {
        this.expenseRepository = expenseRepository;
        this.categoryRepository = categoryRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @Transactional(readOnly = true)
    public List<ExpenseCategoryResponse> getCategories(UserPrincipal principal) {
        long homestayId = requireHomestayId(principal);
        return categoryRepository.findByHomestayIdOrderByNameAsc(homestayId).stream()
                .map(ExpenseCategoryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<ManagerExpenseListResponse> listExpenses(
            UserPrincipal principal,
            LocalDate fromDate,
            LocalDate toDate,
            Long categoryId,
            Expense.PaymentMethod paymentMethod,
            String supplierName,
            Pageable pageable
    ) {
        long homestayId = requireHomestayId(principal);
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw validationError("fromDate không được sau toDate");
        }
        if (categoryId != null && categoryId <= 0) {
            throw validationError("categoryId phải lớn hơn 0");
        }
        if (categoryId != null && categoryRepository.findByIdAndHomestayId(categoryId, homestayId).isEmpty()) {
            throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Danh mục chi phí không thuộc homestay đang quản lý");
        }

        String supplierKeyword = normalize(supplierName);
        Specification<Expense> specification = (root, query, builder) -> {
            var predicates = new ArrayList<Predicate>();
            predicates.add(builder.equal(root.get("homestayId"), homestayId));
            if (fromDate != null) predicates.add(builder.greaterThanOrEqualTo(root.get("expenseDate"), fromDate));
            if (toDate != null) predicates.add(builder.lessThanOrEqualTo(root.get("expenseDate"), toDate));
            if (categoryId != null) predicates.add(builder.equal(root.get("categoryId"), categoryId));
            if (paymentMethod != null) predicates.add(builder.equal(root.get("paymentMethod"), paymentMethod));
            if (supplierKeyword != null) {
                predicates.add(builder.like(builder.lower(root.get("supplierName")),
                        "%" + supplierKeyword.toLowerCase(Locale.ROOT) + "%"));
            }
            return builder.and(predicates.toArray(Predicate[]::new));
        };

        Page<Expense> expenses = expenseRepository.findAll(specification, pageable);
        List<Long> categoryIds = expenses.getContent().stream().map(Expense::getCategoryId).distinct().toList();
        Map<Long, String> categoryNames = categoryIds.isEmpty() ? Map.of()
                : categoryRepository.findByHomestayIdAndIdIn(homestayId, categoryIds).stream()
                .collect(Collectors.toMap(ExpenseCategory::getId, ExpenseCategory::getName));
        List<Long> actorIds = expenses.getContent().stream().map(Expense::getCancelledBy)
                .filter(java.util.Objects::nonNull).distinct().toList();
        Map<Long, String> actorNames = actorIds.isEmpty() ? Map.of() : userRepository.findAllById(actorIds).stream()
                .collect(Collectors.toMap(user -> user.getId(), user -> user.getFullName()));

        return expenses.map(expense -> ManagerExpenseListResponse.from(
                expense, categoryNames.get(expense.getCategoryId()), expense.getCancelledBy() == null ? null
                        : actorNames.getOrDefault(expense.getCancelledBy(), "Tài khoản đã bị xóa")));
    }

    @Transactional
    public ManagerExpenseResponse createExpense(
            UserPrincipal principal,
            CreateExpenseRequest request
    ) {
        return createExpense(principal, request, request != null ? request.proofFile() : null);
    }

    @Transactional
    public ManagerExpenseResponse createExpense(
            UserPrincipal principal,
            CreateExpenseRequest request,
            MultipartFile proofFile
    ) {
        long homestayId = requireHomestayId(principal);
        if (request == null) {
            throw validationError("Dữ liệu khoản chi không được để trống");
        }

        Long categoryId = parseRequiredLong(request.categoryId(), "categoryId");
        if (categoryId <= 0) throw validationError("categoryId phải lớn hơn 0");
        long amount = parseRequiredLong(request.amount(), "amount");
        if (amount <= 0) {
            throw BusinessException.badRequest("AMOUNT_MUST_BE_POSITIVE", "Số tiền khoản chi phải lớn hơn 0");
        }
        LocalDate expenseDate = parseRequiredDate(request.expenseDate(), "expenseDate");
        LocalDate documentDate = parseOptionalDate(request.documentDate(), "documentDate");
        Expense.DocumentType documentType = parseEnum(request.documentType(), Expense.DocumentType.class, "documentType");
        if (documentType == null) throw validationError("Loại chứng từ là bắt buộc");
        if (proofFile == null || proofFile.isEmpty()) {
            throw validationError("Cần tải lên tệp hóa đơn, biên nhận hoặc chứng từ giao dịch");
        }

        var category = categoryRepository.findByIdAndHomestayId(categoryId, homestayId)
                .orElseThrow(() -> BusinessException.notFound(
                        "EXPENSE_CATEGORY_NOT_FOUND", "Không tìm thấy danh mục chi phí thuộc homestay đang quản lý"));

        String description = normalize(request.description());
        String supplierName = normalize(request.supplierName());
        String documentNumber = normalize(request.documentNumber());
        String transactionReference = normalize(request.transactionReference());
        validateLength(description, MAX_DESCRIPTION_LENGTH, "description");
        validateLength(supplierName, MAX_SUPPLIER_NAME_LENGTH, "supplierName");
        validateLength(documentNumber, MAX_DOCUMENT_NUMBER_LENGTH, "documentNumber");
        validateLength(transactionReference, MAX_TRANSACTION_REFERENCE_LENGTH, "transactionReference");

        Expense expense = new Expense();
        expense.setHomestayId(homestayId);
        expense.setCategoryId(category.getId());
        expense.setAmount(amount);
        expense.setExpenseDate(expenseDate);
        expense.setDescription(description);
        expense.setSupplierName(supplierName);
        expense.setDocumentType(documentType);
        expense.setDocumentNumber(documentNumber);
        expense.setDocumentDate(documentDate);
        expense.setTransactionReference(transactionReference);
        expense.setPaymentMethod(parseEnum(request.paymentMethod(), Expense.PaymentMethod.class, "paymentMethod"));
        expense.setCreatedBy(principal.getId());

        expense.setProofUrl(storeProof(proofFile).url());

        expenseRepository.saveAndFlush(expense);
        appendAudit(expense, principal.getId(), ExpenseAuditLog.Action.CREATED, null, null);

        return toResponse(expense, category.getName());
    }

    @Transactional
    public ManagerExpenseResponse updateExpense(
            UserPrincipal principal,
            Long expenseId,
            UpdateExpenseRequest request
    ) {
        long homestayId = requireHomestayId(principal);
        if (expenseId == null || expenseId <= 0) throw validationError("expenseId không hợp lệ");
        if (request == null || !hasUpdateField(request)) {
            throw validationError("Cần gửi ít nhất một trường để cập nhật khoản chi");
        }

        Expense expense = getExpenseInScope(expenseId, homestayId);
        if (expense.getCancelledAt() != null) {
            throw BusinessException.conflict("EXPENSE_ALREADY_CANCELLED", "Khoản chi đã được hủy");
        }
        Map<String, Object> before = snapshot(expense);

        if (request.categoryId() != null) {
            Long categoryId = parseRequiredLong(request.categoryId(), "categoryId");
            if (categoryId <= 0) throw validationError("categoryId phải lớn hơn 0");
            var category = categoryRepository.findByIdAndHomestayId(categoryId, homestayId)
                    .orElseThrow(() -> BusinessException.notFound(
                            "EXPENSE_CATEGORY_NOT_FOUND", "Không tìm thấy danh mục chi phí thuộc homestay đang quản lý"));
            expense.setCategoryId(category.getId());
        }
        if (request.amount() != null) {
            long amount = parseRequiredLong(request.amount(), "amount");
            if (amount <= 0) {
                throw BusinessException.badRequest("AMOUNT_MUST_BE_POSITIVE", "Số tiền khoản chi phải lớn hơn 0");
            }
            expense.setAmount(amount);
        }
        if (request.expenseDate() != null) {
            expense.setExpenseDate(parseRequiredDate(request.expenseDate(), "expenseDate"));
        }
        if (request.description() != null) {
            String description = normalize(request.description());
            validateLength(description, MAX_DESCRIPTION_LENGTH, "description");
            expense.setDescription(description);
        }
        if (request.supplierName() != null) {
            String supplierName = normalize(request.supplierName());
            validateLength(supplierName, MAX_SUPPLIER_NAME_LENGTH, "supplierName");
            expense.setSupplierName(supplierName);
        }
        if (request.documentType() != null) {
            Expense.DocumentType documentType = parseEnum(request.documentType(), Expense.DocumentType.class, "documentType");
            if (documentType == null) throw validationError("Loại chứng từ không được để trống");
            expense.setDocumentType(documentType);
        }
        if (request.documentNumber() != null) {
            String documentNumber = normalize(request.documentNumber());
            validateLength(documentNumber, MAX_DOCUMENT_NUMBER_LENGTH, "documentNumber");
            expense.setDocumentNumber(documentNumber);
        }
        if (request.documentDate() != null) {
            expense.setDocumentDate(parseOptionalDate(request.documentDate(), "documentDate"));
        }
        if (request.transactionReference() != null) {
            String transactionReference = normalize(request.transactionReference());
            validateLength(transactionReference, MAX_TRANSACTION_REFERENCE_LENGTH, "transactionReference");
            expense.setTransactionReference(transactionReference);
        }
        if (request.paymentMethod() != null) {
            expense.setPaymentMethod(parseEnum(request.paymentMethod(), Expense.PaymentMethod.class, "paymentMethod"));
        }

        String oldProofUrl = expense.getProofUrl();
        MultipartFile proofFile = request.proofFile();
        if (proofFile != null && !proofFile.isEmpty()) {
            expense.setProofUrl(storeProof(proofFile).url());
        } else if (proofFile != null && proofFile.getOriginalFilename() != null
                && !proofFile.getOriginalFilename().isBlank()) {
            throw BusinessException.badRequest("UNSUPPORTED_MEDIA_TYPE", "Tệp chứng từ tải lên đang trống");
        }
        if (expense.getProofUrl() == null || expense.getDocumentType() == null) {
            throw validationError("Khoản chi phải có loại chứng từ và tệp chứng từ đính kèm");
        }

        expenseRepository.saveAndFlush(expense);
        appendAudit(expense, principal.getId(), ExpenseAuditLog.Action.UPDATED, before, null);
        if (!java.util.Objects.equals(oldProofUrl, expense.getProofUrl())) {
            deleteProofAfterCommit(oldProofUrl);
        }

        String categoryName = categoryRepository.findByIdAndHomestayId(expense.getCategoryId(), homestayId)
                .map(ExpenseCategory::getName)
                .orElse(null);
        return toResponse(expense, categoryName);
    }

    @Transactional
    public CancelExpenseResponse cancelExpense(UserPrincipal principal, Long expenseId, CancelExpenseRequest request) {
        long homestayId = requireHomestayId(principal);
        if (expenseId == null || expenseId <= 0) throw validationError("expenseId không hợp lệ");
        if (request == null || request.reason() == null || request.reason().isBlank()) {
            throw validationError("Cần nhập lý do hủy khoản chi");
        }
        String reason = request.reason().trim();
        validateLength(reason, 500, "reason");
        Expense expense = getExpenseInScope(expenseId, homestayId);
        if (expense.getCancelledAt() != null) {
            throw BusinessException.conflict("EXPENSE_ALREADY_CANCELLED", "Khoản chi đã được hủy");
        }
        Map<String, Object> before = snapshot(expense);
        expense.setCancelledAt(java.time.LocalDateTime.now(java.time.Clock.systemUTC()));
        expense.setCancelledBy(principal.getId());
        expense.setCancellationReason(reason);
        expenseRepository.saveAndFlush(expense);
        appendAudit(expense, principal.getId(), ExpenseAuditLog.Action.CANCELLED, before, reason);
        return CancelExpenseResponse.success();
    }

    private Expense getExpenseInScope(Long expenseId, long homestayId) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> BusinessException.notFound("EXPENSE_NOT_FOUND", "Không tìm thấy khoản chi"));
        if (!java.util.Objects.equals(expense.getHomestayId(), homestayId)) {
            throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Khoản chi không thuộc homestay đang quản lý");
        }
        return expense;
    }

    private ManagerExpenseResponse toResponse(Expense expense, String categoryName) {
        String cancelledByName = expense.getCancelledBy() == null ? null : userRepository.findById(expense.getCancelledBy())
                .map(user -> user.getFullName()).orElse("Tài khoản đã bị xóa");
        return ManagerExpenseResponse.from(expense, categoryName, cancelledByName);
    }

    private boolean hasUpdateField(UpdateExpenseRequest request) {
        return request.categoryId() != null || request.amount() != null || request.expenseDate() != null
                || request.description() != null || request.supplierName() != null || request.documentType() != null
                || request.documentNumber() != null || request.documentDate() != null
                || request.transactionReference() != null || request.paymentMethod() != null
                || request.proofFile() != null;
    }

    private void appendAudit(Expense expense, Long actorId, ExpenseAuditLog.Action action,
                             Map<String, Object> before, String reason) {
        ExpenseAuditLog log = new ExpenseAuditLog();
        log.setExpenseId(expense.getId());
        log.setActorId(actorId);
        log.setAction(action);
        log.setReason(reason);
        log.setBeforeData(before == null ? null : toJson(before));
        log.setAfterData(toJson(snapshot(expense)));
        auditLogRepository.save(log);
    }

    private Map<String, Object> snapshot(Expense expense) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("homestayId", expense.getHomestayId());
        data.put("categoryId", expense.getCategoryId());
        data.put("amount", expense.getAmount());
        data.put("expenseDate", expense.getExpenseDate());
        data.put("description", expense.getDescription());
        data.put("supplierName", expense.getSupplierName());
        data.put("documentType", expense.getDocumentType());
        data.put("documentNumber", expense.getDocumentNumber());
        data.put("documentDate", expense.getDocumentDate());
        data.put("transactionReference", expense.getTransactionReference());
        data.put("paymentMethod", expense.getPaymentMethod());
        data.put("proofUrl", expense.getProofUrl());
        data.put("cancelledAt", expense.getCancelledAt());
        data.put("cancelledBy", expense.getCancelledBy());
        data.put("cancellationReason", expense.getCancellationReason());
        return data;
    }

    private String toJson(Map<String, Object> data) {
        try {
            return objectMapper.writeValueAsString(data);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to serialize expense audit snapshot", exception);
        }
    }

    private StoredProof storeProof(MultipartFile proofFile) {
        if (proofFile.getSize() > MAX_PROOF_SIZE) {
            throw new BusinessException("FILE_TOO_LARGE", "Tệp chứng từ không được vượt quá 5 MB", HttpStatus.PAYLOAD_TOO_LARGE);
        }

        byte[] content;
        try {
            content = proofFile.getBytes();
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to read expense proof", exception);
        }
        ProofType proofType = detectProofType(content);
        Path expenseDirectory = uploadRoot.resolve("expenses").normalize();
        String filename = "expense-" + UUID.randomUUID() + proofType.extension();
        Path target = expenseDirectory.resolve(filename).normalize();
        if (!expenseDirectory.startsWith(uploadRoot) || !target.startsWith(expenseDirectory)) {
            throw new IllegalStateException("Generated expense proof path escaped upload directory");
        }

        try {
            Files.createDirectories(expenseDirectory);
            Files.write(target, content);
        } catch (IOException exception) {
            deleteQuietly(target);
            throw new IllegalStateException("Unable to store expense proof", exception);
        }
        cleanupUploadIfTransactionRollsBack(target);
        return new StoredProof("/files/expenses/" + filename);
    }

    private ProofType detectProofType(byte[] bytes) {
        if (bytes.length >= 5 && ascii(bytes, 0, 5).equals("%PDF-")) return new ProofType(".pdf");
        if (bytes.length >= 3 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8 && (bytes[2] & 0xff) == 0xff) {
            return new ProofType(".jpg");
        }
        if (bytes.length >= 8 && (bytes[0] & 0xff) == 0x89 && ascii(bytes, 1, 3).equals("PNG")
                && bytes[4] == 0x0d && bytes[5] == 0x0a && bytes[6] == 0x1a && bytes[7] == 0x0a) {
            return new ProofType(".png");
        }
        if (bytes.length >= 12 && ascii(bytes, 0, 4).equals("RIFF") && ascii(bytes, 8, 4).equals("WEBP")) {
            return new ProofType(".webp");
        }
        throw new BusinessException("UNSUPPORTED_MEDIA_TYPE", "Chỉ chấp nhận chứng từ PDF, JPG, PNG hoặc WEBP", HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    private String ascii(byte[] bytes, int offset, int length) {
        return new String(bytes, offset, length, StandardCharsets.US_ASCII);
    }

    private long requireHomestayId(UserPrincipal principal) {
        if (principal == null || principal.getHomestayId() == null || principal.getId() == null) {
            throw BusinessException.badRequest("HOMESTAY_NOT_ASSIGNED", "Tài khoản quản lý chưa được phân công cơ sở");
        }
        return principal.getHomestayId();
    }

    private Long parseRequiredLong(String value, String field) {
        if (value == null || value.isBlank()) throw validationError("Trường " + field + " là bắt buộc");
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException exception) {
            throw validationError("Trường " + field + " phải là số nguyên");
        }
    }

    private LocalDate parseRequiredDate(String value, String field) {
        if (value == null || value.isBlank()) throw validationError("Trường " + field + " là bắt buộc");
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException exception) {
            throw validationError("Trường " + field + " phải có định dạng YYYY-MM-DD");
        }
    }

    private LocalDate parseOptionalDate(String value, String field) {
        return value == null || value.isBlank() ? null : parseRequiredDate(value, field);
    }

    private <T extends Enum<T>> T parseEnum(String value, Class<T> enumType, String field) {
        String normalized = normalize(value);
        if (normalized == null) return null;
        try {
            return Enum.valueOf(enumType, normalized.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw validationError("Giá trị " + field + " không hợp lệ");
        }
    }

    private void validateLength(String value, int maxLength, String field) {
        if (value != null && value.length() > maxLength) {
            throw validationError("Trường " + field + " không được vượt quá " + maxLength + " ký tự");
        }
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private BusinessException validationError(String message) {
        return BusinessException.badRequest("VALIDATION_ERROR", message);
    }

    private void cleanupUploadIfTransactionRollsBack(Path target) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) deleteQuietly(target);
            }
        });
    }

    private void deleteProofAfterCommit(String proofUrl) {
        Path proofPath = resolveStoredProofPath(proofUrl);
        if (proofPath == null) return;

        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            deleteQuietly(proofPath);
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                deleteQuietly(proofPath);
            }
        });
    }

    private Path resolveStoredProofPath(String proofUrl) {
        String urlPrefix = "/files/expenses/";
        if (proofUrl == null || !proofUrl.startsWith(urlPrefix)) return null;

        String filename = proofUrl.substring(urlPrefix.length());
        if (filename.isBlank() || filename.contains("/") || filename.contains("\\")
                || filename.equals(".") || filename.equals("..")) return null;

        Path expenseDirectory = uploadRoot.resolve("expenses").normalize();
        Path path = expenseDirectory.resolve(filename).normalize();
        if (!expenseDirectory.startsWith(uploadRoot) || !path.startsWith(expenseDirectory)) return null;
        return path;
    }

    private void deleteQuietly(Path path) {
        try {
            Files.deleteIfExists(path);
        } catch (IOException exception) {
            log.warn("Could not delete expense proof file {}", path, exception);
        }
    }

    private record ProofType(String extension) {}
    private record StoredProof(String url) {}
}
