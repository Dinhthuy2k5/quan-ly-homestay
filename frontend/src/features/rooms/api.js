import apiClient from '../../lib/api/client';

/**
 * Xem chi tiết thông tin phòng và giá cơ bản (API-PUB-06).
 * @param {number|string} roomId
 * @returns {Promise<any>}
 */
export async function fetchRoomDetail(roomId) {
  const res = await apiClient.get(`/public/rooms/${roomId}`);
  const result = res.data?.data;
  if (!result) throw new Error('Máy chủ không trả về thông tin phòng.');
  return result;
}

/** Lấy các đêm đã giữ để đánh dấu ngày bận trên lịch phòng công khai. */
export async function fetchRoomAvailability(roomId, { fromDate, toDate }) {
  const res = await apiClient.get(`/public/rooms/${roomId}/availability`, { params: { fromDate, toDate } });
  const result = res.data?.data;
  if (!result || !Array.isArray(result.unavailableDates)) throw new Error('Máy chủ trả về lịch phòng không hợp lệ.');
  return result;
}
