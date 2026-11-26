-- Migration: Gỡ bỏ phương thức MOMO khỏi bảng payments, giữ lại VNPay Sandbox (VNPAY) song song với CASH và BANK_TRANSFER
-- Áp dụng cho schema homestayv4 (MySQL 8.0+)

-- 1. Xóa các bản ghi thử nghiệm MoMo đã bị từ chối (nếu có) trước khi thu gọn ENUM
DELETE FROM payments
WHERE method = 'MOMO' AND status = 'REJECTED';

-- 2. Gỡ ràng buộc CHECK cũ tham chiếu tới MOMO
ALTER TABLE payments
    DROP CHECK ck_pay_confirmed;

-- 3. Thu gọn cột method còn CASH, BANK_TRANSFER, VNPAY
ALTER TABLE payments
    MODIFY COLUMN method ENUM('CASH','BANK_TRANSFER','VNPAY') NOT NULL DEFAULT 'BANK_TRANSFER'
    COMMENT 'Phương thức: CASH (tiền mặt), BANK_TRANSFER (chuyển khoản thủ công), VNPAY (cổng thanh toán trực tuyến VNPay)';

-- 4. Tạo lại ràng buộc CHECK chỉ cho phép confirmed_by = NULL khi là giao dịch trực tuyến VNPAY đã có provider_trans_id
ALTER TABLE payments
    ADD CONSTRAINT ck_pay_confirmed CHECK (
        status <> 'CONFIRMED'
        OR (
            confirmed_at IS NOT NULL
            AND (
                confirmed_by IS NOT NULL
                OR (method = 'VNPAY' AND provider_trans_id IS NOT NULL)
            )
        )
    );
