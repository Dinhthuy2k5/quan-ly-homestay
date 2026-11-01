-- Seed bank account policy settings for deposit payment instructions (API-CUS-01)
INSERT INTO policy_settings (policy_group, policy_key, value_type, policy_value, description)
VALUES
  ('PAYMENT', 'bank_name', 'STRING', 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)', 'Tên ngân hàng nhận thanh toán đặt cọc'),
  ('PAYMENT', 'bank_account_number', 'STRING', '998877665544', 'Số tài khoản ngân hàng nhận tiền cọc'),
  ('PAYMENT', 'bank_account_holder', 'STRING', 'CONG TY CP HOMESTAY VIET NAM', 'Tên chủ tài khoản ngân hàng nhận tiền cọc')
ON DUPLICATE KEY UPDATE
  policy_value = VALUES(policy_value),
  description = VALUES(description);
