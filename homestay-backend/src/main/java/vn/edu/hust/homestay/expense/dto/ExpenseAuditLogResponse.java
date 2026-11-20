package vn.edu.hust.homestay.expense.dto;

import vn.edu.hust.homestay.expense.entity.ExpenseAuditLog;
import com.fasterxml.jackson.annotation.JsonRawValue;

import java.time.LocalDateTime;

public record ExpenseAuditLogResponse(
        Long id,
        Long expenseId,
        Long actorId,
        ExpenseAuditLog.Action action,
        String reason,
        @JsonRawValue String beforeData,
        @JsonRawValue String afterData,
        LocalDateTime createdAt
) {
    public static ExpenseAuditLogResponse from(ExpenseAuditLog log) {
        return new ExpenseAuditLogResponse(log.getId(), log.getExpenseId(), log.getActorId(), log.getAction(),
                log.getReason(), log.getBeforeData(), log.getAfterData(), log.getCreatedAt());
    }
}
