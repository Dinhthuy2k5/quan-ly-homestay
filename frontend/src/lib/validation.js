/**
 * Tiện ích kiểm tra hợp lệ dữ liệu (Validation Utils) sử dụng Biểu thức chính quy (Regular Expressions).
 * Ngày thực hiện: 21/10/2026
 */

/**
 * Biểu thức chính quy kiểm tra định dạng Email chuẩn RFC 5322 rút gọn:
 * - Phần tên (local part): chữ cái, số, dấu chấm, gạch dưới, %, +, -
 * - Ký tự bắt buộc: @
 * - Tên miền (domain): chữ cái, số, dấu gạch nối, dấu chấm
 * - Đuôi tên miền (TLD): ít nhất 2 chữ cái (ví dụ: .vn, .com, .edu.vn)
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Biểu thức chính quy kiểm tra số điện thoại Việt Nam:
 * - Bắt đầu bằng chữ số 0
 * - Tiếp theo là đúng 9 chữ số (tổng cộng đúng 10 chữ số)
 * Ví dụ hợp lệ: 0901234567, 0387654321
 */
export const PHONE_REGEX = /^0[0-9]{9}$/;

/**
 * Kiểm tra tính hợp lệ của địa chỉ Email.
 * @param {string} email
 * @returns {string|null} Chuỗi thông báo lỗi tiếng Việt nếu không hợp lệ, hoặc null nếu hợp lệ.
 */
export function validateEmail(email) {
  const trimmed = String(email || '').trim();
  if (!trimmed) {
    return 'Email không được để trống.';
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Email không đúng định dạng (ví dụ: khach@example.com).';
  }
  return null;
}

/**
 * Kiểm tra tính hợp lệ của Số điện thoại.
 * @param {string} phone
 * @returns {string|null} Chuỗi thông báo lỗi tiếng Việt nếu không hợp lệ, hoặc null nếu hợp lệ.
 */
export function validatePhone(phone) {
  const trimmed = String(phone || '').trim();
  if (!trimmed) {
    return 'Số điện thoại không được để trống.';
  }
  if (!PHONE_REGEX.test(trimmed)) {
    return 'Số điện thoại không hợp lệ (phải gồm 10 chữ số và bắt đầu bằng số 0, ví dụ: 0901234567).';
  }
  return null;
}
