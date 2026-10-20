import apiClient from '../../lib/api/client';

/**
 * API-MGR-01: Xem homestay được giao cho Manager
 */
export async function getAssignedHomestayApi() {
  const res = await apiClient.get('/manager/homestay');
  return res.data?.data;
}

/**
 * API-MGR-02: Cập nhật thông tin homestay
 */
export async function updateAssignedHomestayApi({ name, address, hotlinePhone, description }) {
  const res = await apiClient.patch('/manager/homestay', {
    name,
    address,
    hotlinePhone,
    description,
  });
  return res.data?.data;
}

/**
 * API-MGR-03: Danh sách phòng thuộc homestay của Manager
 */
export async function getManagerRoomsApi({ status, roomTypeId, keyword, page = 0, size = 20 } = {}) {
  const params = {};
  if (status) params.status = status;
  if (roomTypeId) params.roomTypeId = roomTypeId;
  if (keyword) params.keyword = keyword;
  params.page = page;
  params.size = size;

  const res = await apiClient.get('/manager/rooms', { params });
  return {
    items: res.data?.data || [],
    meta: res.data?.meta || { page: 0, size: 20, totalElements: 0, totalPages: 0 },
  };
}

/**
 * API-MGR-04: Thêm phòng mới
 */
export async function createRoomApi({ roomTypeId, name, description, maxGuests, amenities }) {
  const res = await apiClient.post('/manager/rooms', {
    roomTypeId,
    name,
    description,
    maxGuests,
    amenities,
  });
  return res.data?.data;
}

/**
 * API-MGR-05: Xem chi tiết phòng
 */
export async function getRoomDetailApi(roomId) {
  const res = await apiClient.get(`/manager/rooms/${roomId}`);
  return res.data?.data;
}

/**
 * API-MGR-06: Cập nhật thông tin phòng
 */
export async function updateRoomApi(roomId, { roomTypeId, name, description, maxGuests, amenities }) {
  const res = await apiClient.patch(`/manager/rooms/${roomId}`, {
    roomTypeId,
    name,
    description,
    maxGuests,
    amenities,
  });
  return res.data?.data;
}

/**
 * API-MGR-07: Khóa / mở / ngừng hoạt động phòng
 */
export async function updateRoomStatusApi(roomId, { status, reason }) {
  const res = await apiClient.patch(`/manager/rooms/${roomId}/status`, {
    status,
    reason,
  });
  return res.data?.data;
}

/**
 * Helper: Lấy danh sách loại phòng của homestay cho dropdown
 */
export async function getManagerRoomTypesApi() {
  const res = await apiClient.get('/manager/room-types');
  return res.data?.data;
}
