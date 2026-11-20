package vn.edu.hust.homestay.expense.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.mock.web.MockMultipartFile;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.expense.dto.ManagerExpenseResponse;
import vn.edu.hust.homestay.expense.dto.CancelExpenseRequest;
import vn.edu.hust.homestay.expense.dto.UpdateExpenseRequest;
import vn.edu.hust.homestay.expense.entity.Expense;
import vn.edu.hust.homestay.expense.repository.ExpenseCategoryRepository;
import vn.edu.hust.homestay.expense.repository.ExpenseAuditLogRepository;
import vn.edu.hust.homestay.auth.repository.UserRepository;
import vn.edu.hust.homestay.expense.repository.ExpenseRepository;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ManagerExpenseServiceTests {

    @TempDir
    Path tempDirectory;

    private ExpenseRepository expenseRepository;
    private ExpenseCategoryRepository categoryRepository;
    private ExpenseAuditLogRepository auditLogRepository;
    private ManagerExpenseService service;
    private UserPrincipal manager;
    private Expense expense;

    @BeforeEach
    void setUp() {
        expenseRepository = mock(ExpenseRepository.class);
        categoryRepository = mock(ExpenseCategoryRepository.class);
        auditLogRepository = mock(ExpenseAuditLogRepository.class);
        service = new ManagerExpenseService(expenseRepository, categoryRepository, auditLogRepository,
                org.mockito.Mockito.mock(UserRepository.class), tempDirectory.toString());
        manager = UserPrincipal.builder().id(10L).homestayId(20L).build();
        expense = expense(100L, 20L, "/files/expenses/old.pdf");
        when(expenseRepository.findById(100L)).thenReturn(Optional.of(expense));
        when(expenseRepository.saveAndFlush(any(Expense.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void patchOnlyChangesProvidedFieldAndKeepsOmittedValuesAndProof() {
        UpdateExpenseRequest request = request(null, null, null, "  Điều chỉnh hóa đơn  ", null, null, null, null, null, null, null);

        ManagerExpenseResponse response = service.updateExpense(manager, 100L, request);

        assertEquals(1_500_000L, expense.getAmount());
        assertEquals(LocalDate.of(2026, 10, 8), expense.getExpenseDate());
        assertEquals("Điều chỉnh hóa đơn", expense.getDescription());
        assertEquals("Công ty điện lực", expense.getSupplierName());
        assertEquals("/files/expenses/old.pdf", expense.getProofUrl());
        assertEquals(expense.getId(), response.id());
        verify(expenseRepository).saveAndFlush(expense);
        verify(auditLogRepository).save(argThat(log -> log.getAction().name().equals("UPDATED")
                && log.getBeforeData().contains("1500000") && log.getAfterData().contains("Điều chỉnh hóa đơn")));
    }

    @Test
    void patchRejectsNonPositiveAmountWithoutSaving() {
        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.updateExpense(manager, 100L, request(null, "0", null, null, null, null, null, null, null, null, null)));

        assertEquals("AMOUNT_MUST_BE_POSITIVE", exception.getCode());
        assertEquals(1_500_000L, expense.getAmount());
        verify(expenseRepository, never()).saveAndFlush(any());
    }

    @Test
    void updateAndDeleteRejectExpenseOwnedByAnotherHomestay() {
        UserPrincipal otherManager = UserPrincipal.builder().id(11L).homestayId(21L).build();

        BusinessException updateException = assertThrows(BusinessException.class,
                () -> service.updateExpense(otherManager, 100L, request(null, null, null, "Sai phạm vi", null, null, null, null, null, null, null)));
        BusinessException cancelException = assertThrows(BusinessException.class,
                () -> service.cancelExpense(otherManager, 100L, new CancelExpenseRequest("nhập nhầm")));

        assertEquals("HOMESTAY_SCOPE_VIOLATION", updateException.getCode());
        assertEquals("HOMESTAY_SCOPE_VIOLATION", cancelException.getCode());
        verify(expenseRepository, never()).saveAndFlush(any());
    }

    @Test
    void updateAndDeleteReturnExpenseNotFoundForUnknownId() {
        when(expenseRepository.findById(404L)).thenReturn(Optional.empty());

        BusinessException updateException = assertThrows(BusinessException.class,
                () -> service.updateExpense(manager, 404L, request(null, null, null, "Không tồn tại", null, null, null, null, null, null, null)));
        BusinessException cancelException = assertThrows(BusinessException.class,
                () -> service.cancelExpense(manager, 404L, new CancelExpenseRequest("nhập nhầm")));

        assertEquals("EXPENSE_NOT_FOUND", updateException.getCode());
        assertEquals("EXPENSE_NOT_FOUND", cancelException.getCode());
    }

    @Test
    void replacingProofDeletesOldFileOnlyAfterCommitAndKeepsNewFile() throws Exception {
        Path oldFile = tempDirectory.resolve("expenses/old.pdf");
        Files.createDirectories(oldFile.getParent());
        Files.write(oldFile, "%PDF-old".getBytes());
        MockMultipartFile replacement = new MockMultipartFile("proofFile", "new.pdf", "application/pdf", "%PDF-new".getBytes());
        UpdateExpenseRequest request = request(null, null, null, null, null, null, null, null, null, null, replacement);

        TransactionSynchronizationManager.initSynchronization();
        try {
            ManagerExpenseResponse response = service.updateExpense(manager, 100L, request);
            Path newFile = tempDirectory.resolve(response.proofUrl().replace("/files/", ""));

            assertTrue(Files.exists(oldFile));
            assertTrue(Files.exists(newFile));
            assertNotEquals("/files/expenses/old.pdf", response.proofUrl());

            List<TransactionSynchronization> synchronizations = TransactionSynchronizationManager.getSynchronizations();
            synchronizations.forEach(TransactionSynchronization::afterCommit);
            synchronizations.forEach(sync -> sync.afterCompletion(TransactionSynchronization.STATUS_COMMITTED));

            assertFalse(Files.exists(oldFile));
            assertTrue(Files.exists(newFile));
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void cancellationRetainsExpenseAndProofAndRecordsActorAndReason() throws Exception {
        Path proof = tempDirectory.resolve("expenses/old.pdf");
        Files.createDirectories(proof.getParent());
        Files.write(proof, "%PDF-old".getBytes());

        TransactionSynchronizationManager.initSynchronization();
        try {
            assertTrue(service.cancelExpense(manager, 100L, new CancelExpenseRequest("Hóa đơn bị nhập trùng")).cancelled());
            verify(expenseRepository).saveAndFlush(expense);
            assertTrue(Files.exists(proof));
            assertEquals(10L, expense.getCancelledBy());
            assertEquals("Hóa đơn bị nhập trùng", expense.getCancellationReason());
            verify(auditLogRepository).save(argThat(log -> log.getAction().name().equals("CANCELLED")
                    && log.getReason().equals("Hóa đơn bị nhập trùng")
                    && log.getBeforeData().contains("cancelledAt")
                    && log.getAfterData().contains("Hóa đơn bị nhập trùng")));
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    private Expense expense(Long id, Long homestayId, String proofUrl) {
        Expense value = new Expense();
        value.setId(id);
        value.setHomestayId(homestayId);
        value.setCategoryId(30L);
        value.setAmount(1_500_000L);
        value.setExpenseDate(LocalDate.of(2026, 10, 8));
        value.setDescription("Tiền điện tháng 9");
        value.setSupplierName("Công ty điện lực");
        value.setDocumentType(Expense.DocumentType.INVOICE);
        value.setDocumentNumber("HD-00125");
        value.setDocumentDate(LocalDate.of(2026, 10, 8));
        value.setTransactionReference("FT2601001");
        value.setPaymentMethod(Expense.PaymentMethod.BANK_TRANSFER);
        value.setProofUrl(proofUrl);
        value.setDocumentType(Expense.DocumentType.INVOICE);
        value.setCreatedBy(10L);
        return value;
    }

    private UpdateExpenseRequest request(
            String categoryId, String amount, String expenseDate, String description, String supplierName,
            String documentType, String documentNumber, String documentDate, String transactionReference,
            String paymentMethod, org.springframework.web.multipart.MultipartFile proofFile
    ) {
        return new UpdateExpenseRequest(categoryId, amount, expenseDate, description, supplierName,
                documentType, documentNumber, documentDate, transactionReference, paymentMethod, proofFile);
    }
}
