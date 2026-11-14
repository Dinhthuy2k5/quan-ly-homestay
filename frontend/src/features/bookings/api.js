import apiClient from '../../lib/api/client';

/**
 * API-CUS-02: Lấy danh sách booking của khách hàng đang đăng nhập.
 * @param {{ status?: string, page?: number, size?: number, sort?: string }} params
 */
export async function fetchCustomerBookingsApi({
  status,
  page = 0,
  size = 5,
  sort = 'createdAt,desc',
} = {}) {
  const params = { page, size, sort };
  if (status) params.status = status;

  const res = await apiClient.get('/customer/bookings', { params });
  return {
    items: res.data?.data || [],
    meta: res.data?.meta || { page: 0, size, totalElements: 0, totalPages: 0 },
  };
}

/**
 * API-CUS-03: Lấy chi tiết booking của khách hàng.
 * @param {number|string} bookingId
 */
export async function fetchCustomerBookingDetailApi(bookingId) {
  const res = await apiClient.get(`/customer/bookings/${bookingId}`);
  return res.data?.data || null;
}

/** API-CUS-06: Lấy các dịch vụ đã đăng ký trong booking của khách. */
export async function fetchCustomerBookingServicesApi(bookingId) {
  const res = await apiClient.get(`/customer/bookings/${bookingId}/services`);
  const result = res.data?.data;
  if (!Array.isArray(result)) throw new Error('Máy chủ trả về danh sách dịch vụ không hợp lệ.');
  return result;
}

/** API-CUS-07: Đăng ký dịch vụ cho một phòng thuộc booking. */
export async function registerCustomerBookingServiceApi(bookingId, roomId, request) {
  const res = await apiClient.post(`/customer/bookings/${bookingId}/rooms/${roomId}/services`, request);
  return res.data?.data || null;
}

/**
 * API-CUS-09: Điều chỉnh thông tin đặt phòng cá nhân.
 * @param {number|string} bookingId
 * @param {{ checkInDate?: string, checkOutDate?: string, guestCount?: number, roomIds?: number[] }} data
 */
export async function adjustCustomerBookingApi(bookingId, data) {
  const res = await apiClient.patch(`/customer/bookings/${bookingId}`, data);
  return res.data?.data || null;
}

/** API-CUS-04: Hủy booking của khách hàng theo chính sách hủy đã áp dụng. */
export async function cancelCustomerBookingApi(bookingId, cancelData = '') {
  let payload;
  if (typeof cancelData === 'string') {
    payload = { reason: cancelData };
  } else {
    payload = {
      reason: cancelData?.reason || '',
      ...(cancelData?.bankName ? { bankName: cancelData.bankName.trim() } : {}),
      ...(cancelData?.bankAccountNumber ? { bankAccountNumber: cancelData.bankAccountNumber.trim() } : {}),
      ...(cancelData?.bankAccountHolder ? { bankAccountHolder: cancelData.bankAccountHolder.trim().toUpperCase() } : {}),
    };
  }
  const res = await apiClient.post(`/customer/bookings/${bookingId}/cancel`, payload);
  return res.data?.data || null;
}

/** API-CUS-05: Gửi thông tin và chứng từ chuyển khoản đặt cọc. */
export async function submitCustomerDepositApi(bookingId, { amount, referenceCode, proofFile }) {
  const formData = new FormData();
  formData.append('amount', String(amount));
  formData.append('method', 'BANK_TRANSFER');
  formData.append('referenceCode', referenceCode);
  formData.append('proofFile', proofFile);
  // Let Axios/browser add the multipart boundary.
  const res = await apiClient.post(`/customer/bookings/${bookingId}/deposit-submissions`, formData);
  return res.data?.data || null;
}

/** Tải chứng từ đặt cọc / thanh toán của booking để chủ booking xem lại. */
export async function fetchCustomerDepositProofApi(bookingId, paymentId) {
  const url = paymentId
    ? `/customer/bookings/${bookingId}/payments/${paymentId}/proof`
    : `/customer/bookings/${bookingId}/deposit-submissions/latest/proof`;
  const res = await apiClient.get(url, {
    responseType: 'blob',
  });
  return res.data;
}


