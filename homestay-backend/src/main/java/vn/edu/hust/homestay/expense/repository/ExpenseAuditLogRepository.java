package vn.edu.hust.homestay.expense.repository;

import org.springframework.data.repository.Repository;
import vn.edu.hust.homestay.expense.entity.ExpenseAuditLog;

import java.util.List;

/** Intentionally exposes insert and read only; application code cannot update or delete audit rows. */
public interface ExpenseAuditLogRepository extends Repository<ExpenseAuditLog, Long> {
    ExpenseAuditLog save(ExpenseAuditLog log);
    List<ExpenseAuditLog> findByExpenseIdOrderByCreatedAtAsc(Long expenseId);
}
