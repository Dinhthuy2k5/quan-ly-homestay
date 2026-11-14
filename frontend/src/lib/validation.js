/**
 * Tiện ích kiểm tra hợp lệ dữ liệu (Validation Utils) sử dụng Biểu thức chính quy (Regular Expressions).
 * Ngày thực hiện: 21/10/2026 - Cập nhật: 14/11/2026
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
 * Biểu thức chính quy kiểm tra số tài khoản ngân hàng:
 * - Chỉ gồm các chữ số 0-9
 * - Độ dài từ 6 đến 20 chữ số
 * Ví dụ hợp lệ: 0987654321, 19036789012345
 */
export const BANK_ACCOUNT_NUMBER_REGEX = /^[0-9]{6,20}$/;

/**
 * Biểu thức chính quy kiểm tra tên chủ tài khoản ngân hàng:
 * - Chỉ gồm chữ cái (hỗ trợ cả tiếng Việt có dấu/không dấu) và khoảng trắng
 * - Độ dài từ 2 đến 50 ký tự
 * - Không chứa số hoặc ký tự đặc biệt
 * Ví dụ hợp lệ: NGUYEN VAN A, TRAN THI B
 */
export const BANK_ACCOUNT_HOLDER_REGEX = /^[\p{L}\s]{2,50}$/u;

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

/**
 * Kiểm tra tính hợp lệ của Số tài khoản ngân hàng.
 * @param {string} accountNumber
 * @returns {string|null} Chuỗi thông báo lỗi tiếng Việt nếu không hợp lệ, hoặc null nếu hợp lệ.
 */
export function validateBankAccountNumber(accountNumber) {
  const trimmed = String(accountNumber || '').trim();
  if (!trimmed) {
    return 'Số tài khoản không được để trống.';
  }
  if (!BANK_ACCOUNT_NUMBER_REGEX.test(trimmed)) {
    return 'Số tài khoản ngân hàng không hợp lệ (phải gồm từ 6 đến 20 chữ số và chỉ chứa số từ 0-9).';
  }
  return null;
}

/**
 * Kiểm tra tính hợp lệ của Tên chủ tài khoản ngân hàng.
 * @param {string} holderName
 * @returns {string|null} Chuỗi thông báo lỗi tiếng Việt nếu không hợp lệ, hoặc null nếu hợp lệ.
 */
export function validateBankAccountHolder(holderName) {
  const trimmed = String(holderName || '').trim();
  if (!trimmed) {
    return 'Tên chủ tài khoản không được để trống.';
  }
  if (!BANK_ACCOUNT_HOLDER_REGEX.test(trimmed)) {
    return 'Tên chủ tài khoản không hợp lệ (phải từ 2 đến 50 ký tự chữ cái, không chứa số hoặc ký tự đặc biệt).';
  }
  return null;
}

/**
 * Chuẩn hóa tên chủ tài khoản sang dạng in hoa không dấu chuẩn ngân hàng.
 * Ví dụ: "Nguyễn Văn Đạt" -> "NGUYEN VAN DAT"
 * @param {string} name
 * @returns {string}
 */
export function normalizeBankAccountHolder(name) {
  if (!name) return '';
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase();
}
