-- Migrate price_rules.is_active to an explicit lifecycle status.
-- Rules whose date range has ended are marked EXPIRED; other disabled rules become INACTIVE.
ALTER TABLE price_rules
  ADD COLUMN status ENUM('ACTIVE','INACTIVE','EXPIRED') NULL AFTER priority;

UPDATE price_rules
SET status = CASE
  WHEN end_date IS NOT NULL AND end_date < CURRENT_DATE() THEN 'EXPIRED'
  WHEN is_active = FALSE THEN 'INACTIVE'
  ELSE 'ACTIVE'
END;

-- Replace the scope index before dropping the old one because it supports the homestay foreign key.
ALTER TABLE price_rules
  ADD KEY idx_price_rules_scope_new (homestay_id, status, room_id, rule_type, priority);

ALTER TABLE price_rules
  DROP INDEX uq_price_base_room,
  DROP INDEX idx_price_rules_scope,
  DROP COLUMN base_room_id,
  DROP COLUMN is_active,
  MODIFY COLUMN status ENUM('ACTIVE','INACTIVE','EXPIRED') NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE price_rules
  ADD COLUMN base_room_id BIGINT GENERATED ALWAYS AS
    (CASE WHEN rule_type = 'BASE' AND status = 'ACTIVE' THEN room_id ELSE NULL END) STORED,
  ADD UNIQUE KEY uq_price_base_room (base_room_id);

ALTER TABLE price_rules
  RENAME INDEX idx_price_rules_scope_new TO idx_price_rules_scope;
