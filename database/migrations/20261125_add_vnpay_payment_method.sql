-- =====================================================================
-- Migration: Bổ sung phương thức 'VNPAY' vào bảng payments (chạy song song với MOMO)
-- Đồng bộ với database/homestay-database.sql
-- =====================================================================

ALTER TABLE payments
  MODIFY COLUMN method ENUM('CASH','BANK_TRANSFER','MOMO','VNPAY') NOT NULL,
  DROP CHECK ck_pay_confirmed,
  ADD CONSTRAINT ck_pay_confirmed CHECK (
       status <> 'CONFIRMED'
    OR (confirmed_at IS NOT NULL AND (confirmed_by IS NOT NULL OR (method IN ('MOMO','VNPAY') AND provider_trans_id IS NOT NULL)))
  );
