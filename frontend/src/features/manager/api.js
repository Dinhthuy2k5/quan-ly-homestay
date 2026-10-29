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
 * API-MGR-04: Thêm phòng mới, gửi multipart nếu có ảnh đính kèm.
 */
export async function createRoomApi({ roomTypeId, name, description, maxGuests, amenities, files = [] }) {
  const payload = {
    roomTypeId,
    name,
    description,
    maxGuests,
    amenities,
  };
  let res;
  if (files.length > 0) {
    const formData = new FormData();
    formData.append('room', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    files.forEach((file) => formData.append('files', file));
    res = await apiClient.post('/manager/rooms', formData, {
      headers: { 'Content-Type': undefined },
    });
  } else {
    res = await apiClient.post('/manager/rooms', payload);
  }
  return res.data?.data;
}

/**
 * API-MGR-05: Xem chi tiết phòng
 */
export async function getRoomDetailApi(roomId) {
  const res = await apiClient.get(`/manager/rooms/${roomId}`);
  return res.data?.data;
}

/** API-PRICE-01: Lấy giá BASE đã được Director duyệt theo đêm của phòng. */
export async function getManagerRoomBasePriceApi(roomId) {
  const res = await apiClient.get(`/manager/rooms/${roomId}/base-price`);
  const result = res.data?.data;
  if (!result || result.roomId == null) {
    throw new Error('Máy chủ trả về giá cơ bản phòng không hợp lệ.');
  }
  return result;
}

/** API-PRICE-02: liệt kê quy tắc giá đã duyệt, có phân trang và bộ lọc. */
export async function getManagerPriceRulesApi({
  roomId,
  ruleType,
  status,
  fromDate,
  toDate,
  page = 0,
  size = 20,
} = {}) {
  const params = { page, size };
  if (roomId) params.roomId = Number(roomId);
  if (ruleType) params.ruleType = ruleType;
  if (status) params.status = status;
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;
  const res = await apiClient.get('/manager/price-rules', { params });
  return {
    items: res.data?.data || [],
    meta: res.data?.meta || { page: 0, size, totalElements: 0, totalPages: 0 },
  };
}

/**
 * API-PRICE-03: Gửi đề xuất thay đổi quy tắc giá (CREATE, UPDATE, DEACTIVATE).
 */
export async function createPriceRuleChangeRequestApi({ requestType, targetRuleId, proposedRule }) {
  const payload = {
    requestType,
    targetRuleId: targetRuleId ? Number(targetRuleId) : null,
    proposedRule: proposedRule || null,
  };
  const res = await apiClient.post('/manager/price-rule-change-requests', payload);
  return res.data?.data;
}

/** API-PRICE-04: Lịch sử yêu cầu thay đổi giá của homestay manager được giao. */
export async function getManagerPriceRuleChangeRequestsApi({
  status,
  page = 0,
  size = 10,
  sort = 'requestedAt,desc',
} = {}) {
  const params = { page, size, sort };
  if (status) params.status = status;
  const res = await apiClient.get('/manager/price-rule-change-requests', { params });
  return {
    items: res.data?.data || [],
    meta: res.data?.meta || { page: 0, size, totalElements: 0, totalPages: 0 },
  };
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

/** CRUD loại phòng thuộc homestay của Manager. */
export async function createManagerRoomTypeApi(payload) {
  const res = await apiClient.post('/manager/room-types', payload);
  return res.data?.data;
}

export async function updateManagerRoomTypeApi(roomTypeId, payload) {
  const res = await apiClient.patch(`/manager/room-types/${roomTypeId}`, payload);
  return res.data?.data;
}

export async function deleteManagerRoomTypeApi(roomTypeId) {
  const res = await apiClient.delete(`/manager/room-types/${roomTypeId}`);
  return res.data?.data;
}

/** API-MEDIA-01: upload một file media; để Axios tự tạo multipart boundary. */
export async function uploadManagerMediaApi({ ownerType, ownerId, file, caption, sortOrder }) {
  const formData = new FormData();
  formData.append('ownerType', ownerType);
  formData.append('ownerId', String(ownerId));
  formData.append('file', file);
  if (caption) formData.append('caption', caption);
  formData.append('sortOrder', String(sortOrder ?? 0));
  const res = await apiClient.post('/manager/media', formData, {
    // Clear the Axios JSON default so the browser can add the multipart boundary.
    headers: { 'Content-Type': undefined },
  });
  return res.data?.data;
}

/** API-MEDIA-02: xóa media thuộc homestay của Manager. */
export async function deleteManagerMediaApi(mediaId) {
  const res = await apiClient.delete(`/manager/media/${mediaId}`);
  return res.data?.data;
}
