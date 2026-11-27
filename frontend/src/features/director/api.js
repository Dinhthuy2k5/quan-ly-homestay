import apiClient from '../../lib/api/client';

/**
 * API-DIR-HS-01 (GET): Danh sách toàn bộ homestay của công ty cho Giám đốc.
 */
export async function getDirectorHomestaysApi({
  status,
  province,
  keyword,
  page = 0,
  size = 20,
  signal,
} = {}) {
  const params = { page, size };
  if (status) params.status = status;
  if (province?.trim()) params.province = province.trim();
  if (keyword?.trim()) params.keyword = keyword.trim();

  const res = await apiClient.get('/director/homestays', { params, signal });
  return {
    items: Array.isArray(res.data?.data) ? res.data.data : [],
    meta: res.data?.meta || {
      page,
      size,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    },
  };
}

/**
 * API-DIR-HS-01 (POST): Tạo cơ sở homestay mới (bắt buộc hotlinePhone, mặc định ACTIVE).
 */
export async function createDirectorHomestayApi({
  name,
  province,
  address,
  hotlinePhone,
  description,
}) {
  const res = await apiClient.post('/director/homestays', {
    name: name?.trim(),
    province: province?.trim(),
    address: address?.trim(),
    hotlinePhone: hotlinePhone?.trim(),
    description: description?.trim() ? description.trim() : null,
  });
  return res.data?.data || null;
}

/**
 * API-DIR-HS-02 (PATCH): Cập nhật từng phần thông tin cơ sở, hotline hoặc trạng thái ACTIVE/INACTIVE.
 * Chỉ gửi các trường khác undefined để giữ đúng ngữ nghĩa partial update.
 */
export async function updateDirectorHomestayApi(homestayId, patchPayload) {
  const payload = {};
  if (patchPayload.name !== undefined) payload.name = patchPayload.name;
  if (patchPayload.province !== undefined) payload.province = patchPayload.province;
  if (patchPayload.address !== undefined) payload.address = patchPayload.address;
  if (patchPayload.hotlinePhone !== undefined) payload.hotlinePhone = patchPayload.hotlinePhone;
  if (patchPayload.description !== undefined) payload.description = patchPayload.description;
  if (patchPayload.status !== undefined) payload.status = patchPayload.status;

  const res = await apiClient.patch(`/director/homestays/${homestayId}`, payload);
  return res.data?.data || null;
}

/**
 * API phụ trợ chỉ đọc: Danh sách tài khoản MANAGER toàn công ty để Giám đốc phân công cơ sở.
 */
export async function getDirectorManagersApi({
  status,
  unassignedOnly,
  keyword,
  signal,
} = {}) {
  const params = {};
  if (status) params.status = status;
  if (unassignedOnly) params.unassignedOnly = true;
  if (keyword?.trim()) params.keyword = keyword.trim();

  const res = await apiClient.get('/director/managers', { params, signal });
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

/**
 * API-DIR-HS-03 (PUT): Gán, thay thế hoặc gỡ Manager phụ trách homestay (managerId = null để gỡ).
 */
export async function assignHomestayManagerApi(homestayId, managerId) {
  const res = await apiClient.put(`/director/homestays/${homestayId}/manager`, {
    managerId: managerId ?? null,
  });
  return res.data?.data || null;
}
