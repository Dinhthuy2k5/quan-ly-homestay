import { formatVnd } from './format';

/**
 * Từ điển nhãn và hàm định dạng quy tắc giá dùng chung giữa giao diện Quản lý (Manager) và Giám đốc (Director)
 * nhằm đảm bảo thuật ngữ nhất quán trên toàn hệ thống.
 */

/** Loại quy tắc giá (ruleType) */
export const PRICE_RULE_TYPE_META = {
  BASE: {
    label: 'Giá cơ bản',
    badgeClass: 'bg-emerald-50 text-emerald-800',
  },
  ADJUSTMENT: {
    label: 'Giá điều chỉnh',
    badgeClass: 'bg-sky-50 text-sky-800',
  },
};

/** Loại yêu cầu thay đổi quy tắc giá (requestType) */
export const PRICE_REQUEST_TYPE_META = {
  CREATE: {
    label: 'Thêm mới',
    badgeClass: 'border-sky-200 bg-sky-50 text-sky-800',
  },
  UPDATE: {
    label: 'Cập nhật',
    badgeClass: 'border-violet-200 bg-violet-50 text-violet-800',
  },
  DEACTIVATE: {
    label: 'Ngừng áp dụng',
    badgeClass: 'border-gray-200 bg-gray-100 text-gray-700',
  },
};

/** Trạng thái yêu cầu phê duyệt giá (status) */
export const PRICE_REQUEST_STATUS_META = {
  PENDING_APPROVAL: {
    label: 'Chờ phê duyệt',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  APPROVED: {
    label: 'Đã phê duyệt',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  REJECTED: {
    label: 'Đã từ chối',
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-800',
  },
};

/** Trạng thái quy tắc giá đang lưu trong bảng price_rules */
export const PRICE_RULE_STATUS_META = {
  ACTIVE: {
    label: 'Đang áp dụng',
    badgeClass: 'bg-emerald-50 text-emerald-700',
  },
  INACTIVE: {
    label: 'Ngừng áp dụng',
    badgeClass: 'bg-gray-100 text-gray-600',
  },
  EXPIRED: {
    label: 'Đã hết hạn',
    badgeClass: 'bg-amber-50 text-amber-700',
  },
};

/** Nhãn rút gọn thứ trong tuần */
export const WEEKDAY_SHORT_LABELS = {
  MON: 'T2',
  TUE: 'T3',
  WED: 'T4',
  THU: 'T5',
  FRI: 'T6',
  SAT: 'T7',
  SUN: 'CN',
  MONDAY: 'T2',
  TUESDAY: 'T3',
  WEDNESDAY: 'T4',
  THURSDAY: 'T5',
  FRIDAY: 'T6',
  SATURDAY: 'T7',
  SUNDAY: 'CN',
};

/**
 * Định dạng danh sách thứ trong tuần sang dạng ngắn gọn nhất quán (T2, T3, ..., CN).
 * @param {string[]|string|null|undefined} weekdays
 * @param {string} emptyFallback Chuỗi trả về khi áp dụng tất cả các ngày (mặc định '')
 */
export function formatWeekdaysShort(weekdays, emptyFallback = '') {
  if (!weekdays) return emptyFallback;
  const list = Array.isArray(weekdays) ? weekdays : String(weekdays).split(',');
  const formatted = list
    .map((day) => String(day).trim())
    .filter(Boolean)
    .map((day) => WEEKDAY_SHORT_LABELS[day.toUpperCase()] || day);
  return formatted.length > 0 ? formatted.join(', ') : emptyFallback;
}

/**
 * Định dạng biểu thức giá điều chỉnh (PERCENT / FIXED_PRICE) đồng nhất giữa Manager và Director.
 */
export function formatAdjustmentValue(rule, { withBaseHint = false, withNightSuffix = false } = {}) {
  if (!rule || typeof rule !== 'object') return '';
  if (rule.adjustType === 'PERCENT' && rule.adjustValue != null) {
    const val = Number(rule.adjustValue);
    const prefix = `${val > 0 ? '+' : ''}${val}%`;
    return withBaseHint ? `${prefix} so với giá cơ bản` : prefix;
  }
  if (rule.adjustType === 'FIXED_PRICE' && rule.adjustValue != null) {
    const suffix = withNightSuffix ? ' / đêm' : '';
    return `Giá cố định ${formatVnd(rule.adjustValue)}${suffix}`;
  }
  return '';
}

/**
 * Định dạng mô tả giá trị của 1 quy tắc giá (BASE hoặc ADJUSTMENT).
 */
export function formatPriceRuleValue(rule) {
  if (!rule || typeof rule !== 'object') return '';
  if (rule.ruleType === 'BASE') {
    return rule.basePrice == null ? 'Chưa có giá' : `${formatVnd(rule.basePrice)} / đêm`;
  }
  return formatAdjustmentValue(rule, { withBaseHint: true, withNightSuffix: true });
}
