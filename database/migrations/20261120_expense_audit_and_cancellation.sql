-- Preserve expense history instead of deleting financial records.
ALTER TABLE expenses
  ADD COLUMN cancelled_at DATETIME NULL,
  ADD COLUMN cancelled_by BIGINT NULL,
  ADD COLUMN cancellation_reason VARCHAR(500) NULL,
  ADD CONSTRAINT fk_expenses_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id);

CREATE TABLE expense_audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  expense_id BIGINT NOT NULL,
  actor_id BIGINT NOT NULL,
  action ENUM('CREATED','UPDATED','CANCELLED','APPROVED','REJECTED') NOT NULL,
  reason VARCHAR(500) NULL,
  before_data JSON NULL,
  after_data JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_exp_audit_expense (expense_id, created_at),
  KEY idx_exp_audit_actor (actor_id, created_at),
  CONSTRAINT fk_exp_audit_expense FOREIGN KEY (expense_id) REFERENCES expenses(id),
  CONSTRAINT fk_exp_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id)
) ENGINE=InnoDB;

DELIMITER $$
CREATE TRIGGER trg_expenses_require_proof_before_insert
BEFORE INSERT ON expenses
FOR EACH ROW
BEGIN
  IF NEW.document_type IS NULL OR NEW.proof_url IS NULL OR CHAR_LENGTH(TRIM(NEW.proof_url)) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'New expenses require a document type and proof file';
  END IF;
END$$

CREATE TRIGGER trg_expense_audit_logs_no_update
BEFORE UPDATE ON expense_audit_logs
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Expense audit logs are append-only';
END$$

CREATE TRIGGER trg_expense_audit_logs_no_delete
BEFORE DELETE ON expense_audit_logs
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Expense audit logs are append-only';
END$$
DELIMITER ;

-- Historical rows with no proof remain unchanged. API validation requires proof files
-- for all new expenses and requires proof to be attached when a legacy row is edited.
