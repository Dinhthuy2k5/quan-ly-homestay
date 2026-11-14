INSERT INTO policy_settings (policy_group, policy_key, value_type, policy_value, description)
SELECT 'PAYMENT', 'final_payment_timing', 'TEXT', 'Thanh toán nốt khi trả phòng', 'Thời điểm thanh toán khoản tiền phòng còn lại'
WHERE NOT EXISTS (
    SELECT 1 FROM policy_settings WHERE policy_group = 'PAYMENT' AND policy_key = 'final_payment_timing'
);
