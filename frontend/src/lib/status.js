/**
 * Nhãn và màu trạng thái dùng chung toàn dự án (frontend guidelines mục 5.4).
 */

export const ROOM_STATUS = {
  ACTIVE: { label: 'Đang nhận đặt', color: 'success' },
  LOCKED: { label: 'Tạm khóa', color: 'warning' },
  INACTIVE: { label: 'Ngừng khai thác', color: 'neutral' },
};

export const HOMESTAY_STATUS = {
  ACTIVE: { label: 'Đang hoạt động', color: 'success' },
  INACTIVE: { label: 'Tạm ngừng', color: 'neutral' },
};

export const BOOKING_STATUS = {
  PENDING_DEPOSIT: { label: 'Chờ đặt cọc', color: 'warning' },
  PENDING_APPROVAL: { label: 'Chờ xác nhận', color: 'info' },
  CONFIRMED: { label: 'Đã xác nhận', color: 'success' },
  CHECKED_IN: { label: 'Đang lưu trú', color: 'teal' },
  CHECKED_OUT: { label: 'Đã trả phòng', color: 'neutral' },
  CANCELLED: { label: 'Đã hủy', color: 'danger' },
  EXPIRED: { label: 'Hết hạn giữ chỗ', color: 'neutral' },
};

export const PAYMENT_STATUS = {
  PENDING: { label: 'Chờ xác minh', color: 'warning' },
  CONFIRMED: { label: 'Đã xác nhận', color: 'success' },
  REJECTED: { label: 'Bị từ chối', color: 'danger' },
};

export const NIGHT_STATUS = {
  HELD: { label: 'Đang giữ', color: 'warning' },
  BOOKED: { label: 'Đã đặt', color: 'info' },
};

/**
 * Trả về thông tin trạng thái theo nhóm và mã
 * @param {'room'|'homestay'|'booking'|'payment'|'night'} type
 * @param {string} code
 * @returns {{ label: string, color: string }}
 */
export function getStatusInfo(type, code) {
  if (!code) return { label: 'Không xác định', color: 'neutral' };

  let dict = null;
  switch (type) {
    case 'room':
      dict = ROOM_STATUS;
      break;
    case 'homestay':
      dict = HOMESTAY_STATUS;
      break;
    case 'booking':
      dict = BOOKING_STATUS;
      break;
    case 'payment':
      dict = PAYMENT_STATUS;
      break;
    case 'night':
      dict = NIGHT_STATUS;
      break;
    default:
      dict = null;
  }

  if (dict && dict[code]) {
    return dict[code];
  }

  return { label: code, color: 'neutral' };
}
