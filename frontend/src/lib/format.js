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
 * Định dạng ngày thuần từ chuỗi "YYYY-MM-DD".
 * Cấm dùng new Date("YYYY-MM-DD") để tránh lệch múi giờ.
 * @param {string|null|undefined} dateStr
 * @returns {string} ví dụ: "10/10/2026"
 */
export function formatDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return dateStr;
}

/**
 * Định dạng thời điểm ISO sang múi giờ Asia/Ho_Chi_Minh: HH:mm dd/MM/yyyy.
 * @param {string|null|undefined} dateTimeStr
 * @returns {string}
 */
export function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return '';
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
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
