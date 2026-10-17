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
