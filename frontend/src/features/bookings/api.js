import apiClient from '../../lib/api/client';

/**
 * API-CUS-02: Lấy danh sách booking của khách hàng đang đăng nhập.
 * @param {{ status?: string, page?: number, size?: number, sort?: string }} params
 */
export async function fetchCustomerBookingsApi({
  status,
  page = 0,
  size = 10,
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

