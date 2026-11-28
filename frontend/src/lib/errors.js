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
  HOMESTAY_NAME_EXISTS: 'Tên homestay đã tồn tại tại tỉnh/thành phố này. Vui lòng chọn tên khác.',
  HOMESTAY_HAS_ACTIVE_BOOKINGS: 'Homestay vẫn còn đơn đặt phòng đang hoạt động hoặc chưa hoàn tất, không thể tạm ngừng.',
  HOMESTAY_ALREADY_ASSIGNED: 'Quản lý này đang phụ trách một cơ sở khác. Vui lòng gỡ phân công cũ trước.',
  USER_NOT_FOUND: 'Không tìm thấy tài khoản người dùng được chọn.',
  USER_NOT_MANAGER: 'Tài khoản được chọn không có vai trò Quản lý (MANAGER).',
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
  BOOKING_HOLD_EXPIRED: 'Đơn đặt phòng đã hết thời hạn giữ chỗ.',
  BOOKING_CONCURRENT_MODIFICATION: 'Booking vừa được người khác cập nhật. Vui lòng tải lại trang.',
  ADJUSTMENT_WINDOW_CLOSED: 'Đã quá thời hạn được phép điều chỉnh booking.',
  CANCELLATION_NOT_ALLOWED: 'Booking này không thể hủy ở trạng thái hiện tại.',
  CANCELLATION_POLICY_INVALID: 'Chưa thể xử lý hủy đơn do chính sách hoàn tiền chưa được cấu hình hợp lệ. Vui lòng liên hệ homestay.',
  REFUND_BANK_INFO_REQUIRED: 'Đơn hủy có tiền hoàn cọc, vui lòng cung cấp đầy đủ thông tin tài khoản ngân hàng để nhận tiền hoàn.',
  INVALID_BANK_ACCOUNT_NUMBER: 'Số tài khoản ngân hàng không hợp lệ (phải gồm từ 6 đến 20 chữ số và chỉ chứa số từ 0-9).',
  INVALID_BANK_ACCOUNT_HOLDER: 'Tên chủ tài khoản không hợp lệ (phải từ 2 đến 50 ký tự chữ cái, không chứa số hoặc ký tự đặc biệt).',
  DEPOSIT_AMOUNT_INVALID: 'Số tiền đặt cọc chưa đúng theo chính sách.',
  DEPOSIT_AMOUNT_INSUFFICIENT: 'Số tiền cọc chưa đủ theo yêu cầu.',
  PAYMENT_ALREADY_REVIEWED: 'Khoản thanh toán này đã được xử lý trước đó.',
  PAYMENT_NOT_ONLINE: 'Giao dịch này không phải phiên thanh toán trực tuyến.',
  PAYMENT_AMOUNT_MISMATCH: 'Số tiền xác nhận từ cổng thanh toán không khớp với số tiền đặt cọc của đơn.',
  PAYMENT_GATEWAY_NOT_CONFIGURED: 'Cổng thanh toán trực tuyến chưa được cấu hình khóa kết nối (TMN Code / Hash Secret) trên máy chủ. Vui lòng cập nhật tệp .env hoặc chọn chuyển khoản thủ công.',
  PAYMENT_GATEWAY_ERROR: 'Cổng thanh toán trực tuyến đang gián đoạn hoặc từ chối giao dịch. Vui lòng thử lại sau.',
  UNSUPPORTED_PAYMENT_PROVIDER: 'Cổng thanh toán được chọn chưa được hỗ trợ.',
  INVALID_PAYMENT_SIGNATURE: 'Chữ ký xác thực từ cổng thanh toán không hợp lệ.',
  ORIGINAL_DEPOSIT_TRANSACTION_MISSING: 'Không tìm thấy mã giao dịch gốc của khoản đặt cọc trực tuyến để hoàn tiền tự động.',
  OUTSTANDING_BALANCE: 'Khách vẫn còn số tiền chưa thanh toán.',
  PRICE_REQUEST_ALREADY_PENDING: 'Đã có yêu cầu thay đổi giá đang chờ phê duyệt cho mục này.',
  PRICE_REQUEST_ALREADY_REVIEWED: 'Yêu cầu thay đổi giá này đã được xử lý.',
  PRICE_RULE_CONFLICT: 'Quy tắc giá bị trùng hoặc xung đột với quy tắc khác.',
  INVALID_PRICE_RULE: 'Thông tin quy tắc giá không hợp lệ.',
  PRICE_RULE_BASE_REQUIRES_ROOM: 'Quy tắc giá cơ bản bắt buộc phải chỉ định phòng.',
  PRICE_RULE_INVALID_BASE_PRICE: 'Giá cơ bản phải là số dương lớn hơn 0.',
  PRICE_RULE_ADJUST_TYPE_REQUIRED: 'Kiểu tính giá điều chỉnh không được để trống.',
  PRICE_RULE_INVALID_ADJUST_VALUE: 'Giá trị điều chỉnh phải lớn hơn 0.',
  PRICE_RULE_NAME_REQUIRED: 'Tên quy tắc giá điều chỉnh không được để trống.',
  PRICE_RULE_NOT_FOUND: 'Không tìm thấy quy tắc giá.',
  FILE_TOO_LARGE: 'Tệp tải lên vượt quá dung lượng cho phép.',
  UNSUPPORTED_MEDIA_TYPE: 'Định dạng tệp không được hỗ trợ.',
  EXPENSE_CATEGORY_NOT_FOUND: 'Danh mục chi phí không tồn tại hoặc không thuộc homestay của bạn.',
  AMOUNT_MUST_BE_POSITIVE: 'Số tiền khoản chi phải lớn hơn 0.',
  SERVICE_NOT_FOUND: 'Không tìm thấy thông tin dịch vụ.',
  SERVICE_NAME_EXISTS: 'Tên dịch vụ đã tồn tại trong cơ sở homestay.',
  SERVICE_CATEGORY_SCOPE_MISMATCH: 'Danh mục dịch vụ không thuộc cơ sở homestay đang quản lý.',
  SERVICE_NOT_ACTIVE: 'Dịch vụ này hiện đang tạm ngừng hoạt động.',
  SERVICE_BOOKING_CLOSED: 'Đơn đặt phòng hiện không nhận đăng ký thêm dịch vụ.',
  SERVICE_LINE_NOT_FOUND: 'Không tìm thấy dịch vụ đã đăng ký trong đơn đặt phòng.',
  SERVICE_ALREADY_USED: 'Dịch vụ đã được sử dụng, không thể hủy.',
  SERVICE_CANCELLATION_NOT_ALLOWED: 'Đơn đặt phòng hiện không cho phép hủy dịch vụ.',
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
  if (
    (serverError?.code === 'PAYMENT_GATEWAY_ERROR' ||
      serverError?.code === 'HOMESTAY_HAS_ACTIVE_BOOKINGS' ||
      serverError?.code === 'HOMESTAY_ALREADY_ASSIGNED' ||
      serverError?.code === 'ACCOUNT_LOCKED' ||
      serverError?.code === 'INVALID_DATE_RANGE') &&
    serverError?.message
  ) {
    return serverError.message;
  }
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
