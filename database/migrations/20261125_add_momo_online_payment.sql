-- =====================================================================
-- Migration: Hỗ trợ đặt cọc và hoàn tiền trực tuyến qua cổng MoMo Sandbox
-- Đồng bộ với database/homestay-database.sql
-- =====================================================================

-- 1. Bảng payments: mở rộng method thêm 'MOMO', thêm provider_order_id (UNIQUE) & provider_trans_id,
--    và điều chỉnh ck_pay_confirmed cho phép cổng thanh toán MoMo tự động xác nhận (confirmed_by = NULL)
ALTER TABLE payments
  MODIFY COLUMN method ENUM('CASH','BANK_TRANSFER','MOMO') NOT NULL,
  ADD COLUMN provider_order_id VARCHAR(100) NULL AFTER reference_code,
  ADD COLUMN provider_trans_id VARCHAR(100) NULL AFTER provider_order_id,
  ADD UNIQUE KEY uq_pay_provider_order (provider_order_id),
  ADD KEY idx_pay_provider_trans (provider_trans_id),
  DROP CHECK ck_pay_confirmed,
  ADD CONSTRAINT ck_pay_confirmed CHECK (
       status <> 'CONFIRMED'
    OR (confirmed_at IS NOT NULL AND (confirmed_by IS NOT NULL OR (method = 'MOMO' AND provider_trans_id IS NOT NULL)))
  );

-- 2. Bảng bookings: cho phép đơn đặt cọc online qua MoMo tự động chuyển CONFIRMED
--    với approved_at IS NOT NULL và approved_by IS NULL (không cần Manager bấm duyệt tay)
ALTER TABLE bookings
  DROP CHECK ck_bookings_approval_pair,
  DROP CHECK ck_bookings_confirmed_approval,
  ADD CONSTRAINT ck_bookings_approval_pair CHECK (
       approved_by IS NULL OR approved_at IS NOT NULL
  ),
  ADD CONSTRAINT ck_bookings_confirmed_approval CHECK (
       status NOT IN ('CONFIRMED','CHECKED_IN','CHECKED_OUT')
    OR approved_at IS NOT NULL
  );
