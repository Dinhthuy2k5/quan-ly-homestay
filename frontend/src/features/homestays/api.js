import apiClient from '../../lib/api/client';

/**
 * Tra cứu danh sách homestay công khai (API-PUB-05).
 * @param {{ province?: string, keyword?: string, page?: number, size?: number }} params
 * @returns {Promise<{ items: Array, page: number, size: number, totalElements: number, totalPages: number }>}
 */
export async function fetchHomestays({ province = '', keyword = '', page = 0, size = 10 } = {}) {
  const query = { page, size };
  if (province && province.trim()) {
    query.province = province.trim();
  }
  if (keyword && keyword.trim()) {
    query.keyword = keyword.trim();
  }

  const res = await apiClient.get('/public/homestays', { params: query });
  const result = res.data?.data;
  if (!result || !Array.isArray(result.items)) {
    throw new Error('Máy chủ trả về danh sách homestay không hợp lệ.');
  }
  return result;
}

/**
 * Xem chi tiết homestay (API-PUB-02).
 * @param {number|string} homestayId
 * @returns {Promise<any>}
 */
export async function fetchHomestayDetail(homestayId) {
  const res = await apiClient.get(`/public/homestays/${homestayId}`);
  const result = res.data?.data;
  if (!result) throw new Error('Máy chủ không trả về thông tin homestay.');
  return result;
}

/**
 * Lấy danh mục loại phòng công khai theo homestay.
 * @param {number|string} homestayId
 * @returns {Promise<Array>}
 */
export async function fetchHomestayRoomTypes(homestayId) {
  const res = await apiClient.get(`/public/homestays/${homestayId}/room-types`);
  const result = res.data?.data;
  if (!Array.isArray(result)) throw new Error('Máy chủ trả về danh mục loại phòng không hợp lệ.');
  return result;
}
