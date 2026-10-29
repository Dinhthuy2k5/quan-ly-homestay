/**
 * Định dạng tiền tệ VND từ số nguyên.
 * Tuyệt đối không dùng số thực, toFixed hoặc tự format rải rác.
 * @param {number|null|undefined} amount
 * @returns {string} ví dụ: "1.800.000 ₫" hoặc "Liên hệ"
 */
export function formatVnd(amount) {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return 'Liên hệ';
  }
  return new Intl.NumberFormat('vi-VN').format(Math.round(Number(amount))) + ' ₫';
}

/**
 * Định dạng ngày thuần từ chuỗi "YYYY-MM-DD" hoặc ISO string.
 * Cấm dùng new Date("YYYY-MM-DD") để tránh lệch múi giờ.
 * @param {string|null|undefined} dateStr
 * @returns {string} ví dụ: "10/10/2026"
 */
export function formatDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const dateOnly = dateStr.includes('T')
    ? dateStr.split('T')[0]
    : (dateStr.includes(' ') ? dateStr.split(' ')[0] : dateStr);
  const parts = dateOnly.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return dateStr;
}

/**
 * Định dạng thời điểm ISO sang múi giờ Asia/Ho_Chi_Minh: HH:mm:ss dd/MM/yyyy.
 * @param {string|null|undefined} dateTimeStr
 * @returns {string} ví dụ: "20:42:08 27/10/2026"
 */
export function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return '';
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour12: false,
    }).format(d);
  } catch {
    return dateTimeStr;
  }
}

/**
 * Tính số đêm giữa 2 ngày (checkInDate -> checkOutDate).
 * @param {string} checkInDate "YYYY-MM-DD"
 * @param {string} checkOutDate "YYYY-MM-DD"
 * @returns {number}
 */
export function nightsBetween(checkInDate, checkOutDate) {
  if (!checkInDate || !checkOutDate) return 0;
  const d1 = new Date(checkInDate + 'T00:00:00');
  const d2 = new Date(checkOutDate + 'T00:00:00');
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
