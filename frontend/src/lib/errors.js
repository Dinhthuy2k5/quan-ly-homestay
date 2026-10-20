/**
 * Ánh xạ mã lỗi -> thông báo tiếng Việt thân thiện (frontend guidelines mục 5.5).
 * Frontend chỉ dựa vào error.code, không parse message.
 */

export const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại thông tin.',
  INVALID_DATE_RANGE: 'Ngày trả phòng phải sau ngày nhận phòng.',
  INVALID_GUEST_COUNT: 'Số khách không hợp lệ.',
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
  ACCOUNT_LOCKED: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  HOMESTAY_SCOPE_VIOLATION: 'Bạn không có quyền thao tác trên homestay này.',
  HOMESTAY_NOT_ASSIGNED: 'Tài khoản quản lý của bạn chưa được gán homestay.',
  HOMESTAY_NOT_FOUND: 'Không tìm thấy homestay được yêu cầu.',
  ROOM_NOT_FOUND: 'Không tìm thấy phòng được yêu cầu.',
  ROOM_NOT_AVAILABLE: 'Phòng không còn trống trong khoảng ngày đã chọn. Vui lòng chọn ngày khác.',
  ROOM_LOCKED: 'Phòng đang tạm khóa.',
  ROOM_CAPACITY_EXCEEDED: 'Số khách vượt quá sức chứa tối đa của phòng.',
  ROOM_NAME_EXISTS: 'Tên phòng này đã tồn tại trong cơ sở homestay. Vui lòng chọn tên khác.',
  ROOM_TYPE_SCOPE_MISMATCH: 'Loại phòng được chọn không thuộc homestay đang quản lý.',
  ROOM_HAS_FUTURE_BOOKINGS: 'Phòng đang có lịch đặt trong tương lai, không thể khóa hoặc ngừng hoạt động.',
  ROOM_HAS_CONFLICTING_BOOKINGS: 'Phòng đang có lịch đặt phòng mâu thuẫn với thông tin mới.',
  HOMESTAY_INACTIVE: 'Homestay hiện đang tạm ngừng hoạt động.',
  BOOKING_STATE_CONFLICT: 'Trạng thái booking đã thay đổi. Vui lòng tải lại trang.',
  BOOKING_CONCURRENT_MODIFICATION: 'Booking vừa được người khác cập nhật. Vui lòng tải lại trang.',
  ADJUSTMENT_WINDOW_CLOSED: 'Đã quá thời hạn được phép điều chỉnh booking.',
  CANCELLATION_NOT_ALLOWED: 'Booking này không thể hủy ở trạng thái hiện tại.',
  DEPOSIT_AMOUNT_INVALID: 'Số tiền đặt cọc chưa đúng theo chính sách.',
  DEPOSIT_AMOUNT_INSUFFICIENT: 'Số tiền cọc chưa đủ theo yêu cầu.',
  PAYMENT_ALREADY_REVIEWED: 'Khoản thanh toán này đã được xử lý trước đó.',
  OUTSTANDING_BALANCE: 'Khách vẫn còn số tiền chưa thanh toán.',
  PRICE_REQUEST_ALREADY_PENDING: 'Đã có yêu cầu thay đổi giá đang chờ duyệt cho mục này.',
  PRICE_REQUEST_ALREADY_REVIEWED: 'Yêu cầu thay đổi giá này đã được xử lý.',
  PRICE_RULE_CONFLICT: 'Quy tắc giá bị trùng hoặc xung đột với quy tắc khác.',
  FILE_TOO_LARGE: 'Tệp tải lên vượt quá dung lượng cho phép.',
  UNSUPPORTED_MEDIA_TYPE: 'Định dạng tệp không được hỗ trợ.',
  EMAIL_ALREADY_EXISTS: 'Email này đã được sử dụng bởi một tài khoản khác.',
  INTERNAL_ERROR: 'Có lỗi hệ thống. Vui lòng thử lại sau ít phút.',
};

/**
 * Trích xuất mã lỗi và trả về thông báo tương ứng
 * @param {any} err
 * @returns {string}
 */
export function getErrorMessage(err) {
  if (!err) return 'Đã xảy ra lỗi không xác định.';

  // Trường hợp error response từ Spring Boot backend bọc ApiResponse
  const serverError = err.response?.data?.error;
  if (serverError?.code && ERROR_MESSAGES[serverError.code]) {
    return ERROR_MESSAGES[serverError.code];
  }
  if (serverError?.message) {
    return serverError.message;
  }

  // Lỗi mạng hoặc HTTP cơ bản
  if (err.response?.status === 404) {
    return 'Không tìm thấy dữ liệu yêu cầu.';
  }
  if (err.response?.status === 403) {
    return 'Bạn không có quyền thực hiện thao tác này.';
  }
  if (err.response?.status === 401) {
    return 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.';
  }
  if (err.message === 'Network Error' || err.code === 'ERR_NETWORK' || (err.request && !err.response)) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
  }

  return err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}
