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
 * API-MGR-POLICY-01: Lấy chính sách & quy định áp dụng cho cơ sở của quản lý
 */
export async function getManagerHomestayPoliciesApi() {
  const res = await apiClient.get('/manager/homestay/policies');
  return res.data?.data;
}

/**
 * API-MGR-03: Danh sách phòng thuộc homestay của Manager
 */
export async function getManagerRoomsApi({ status, roomTypeId, keyword, page = 0, size = 20, signal } = {}) {
  const params = {};
  if (status) params.status = status;
  if (roomTypeId) params.roomTypeId = roomTypeId;
  if (keyword) params.keyword = keyword;
  params.page = page;
  params.size = size;

  const res = await apiClient.get('/manager/rooms', { params, signal });
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

/**
 * API-MGR-BOOK-01: Danh sách booking cơ sở thuộc homestay được giao cho Manager
 */
export async function getManagerBookingsApi({
  status,
  fromDate,
  toDate,
  keyword,
  page = 0,
  size = 10,
  sort = 'createdAt,desc',
  signal,
} = {}) {
  const params = { page, size, sort };
  if (status) params.status = status;
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;
  if (keyword?.trim()) params.keyword = keyword.trim();

  const res = await apiClient.get('/manager/bookings', { params, signal });
  return {
    items: res.data?.data || [],
    meta: res.data?.meta || { page: 0, size, totalElements: 0, totalPages: 0 },
  };
}

/**
 * Tra cứu tài khoản khách hàng theo SĐT hoặc Email
 * GET /api/v1/manager/bookings/customer-lookup
 */
export async function lookupManagerCustomerApi({ phone, email } = {}) {
  const params = {};
  if (phone) params.phone = phone.trim();
  if (email) params.email = email.trim();
  const res = await apiClient.get('/manager/bookings/customer-lookup', { params });
  return res.data?.data;
}

/**
 * API-MGR-BOOK-02: Đặt phòng hộ khách
 */
export async function createManagerBookingApi({
  contactName,
  contactPhone,
  contactEmail,
  roomIds,
  checkInDate,
  checkOutDate,
  guestCount,
  note,
  customerId,
  services,
}) {
  const payload = {
    contactName: contactName?.trim(),
    contactPhone: contactPhone?.trim(),
    contactEmail: contactEmail?.trim() || null,
    roomIds: (roomIds || []).map(Number),
    checkInDate,
    checkOutDate,
    guestCount: Number(guestCount),
    note: note?.trim() || null,
    customerId: customerId ? Number(customerId) : null,
    services: (services || []).map((item) => ({
      roomId: Number(item.roomId),
      serviceId: Number(item.serviceId),
      quantity: Number(item.quantity),
      serviceDate: item.serviceDate || null,
      note: item.note?.trim() || null,
    })),
  };
  const res = await apiClient.post('/manager/bookings', payload);
  return res.data?.data;
}

/**
 * API-MGR-BOOK-03: Chi tiết đơn đặt phòng cho Manager
 */
export async function fetchManagerBookingDetailApi(bookingId) {
  const res = await apiClient.get(`/manager/bookings/${bookingId}`);
  return res.data?.data;
}

/**
 * API-MGR-BOOK-04: Điều chỉnh booking (ngày nhận/trả, số khách hoặc phòng)
 */
export async function adjustManagerBookingApi(bookingId, { checkInDate, checkOutDate, roomIds, guestCount, reason }) {
  const payload = {};
  if (checkInDate) payload.checkInDate = checkInDate;
  if (checkOutDate) payload.checkOutDate = checkOutDate;
  if (roomIds) payload.roomIds = roomIds;
  if (guestCount != null) payload.guestCount = Number(guestCount);
  if (reason) payload.reason = reason.trim();

  const res = await apiClient.patch(`/manager/bookings/${bookingId}`, payload);
  return res.data?.data;
}

/** API-MGR-BOOK-05: Duyệt hoặc từ chối một khoản DEPOSIT đang chờ xác minh. */
export async function reviewManagerDepositApi(bookingId, { paymentId, decision, reason }) {
  const res = await apiClient.post(`/manager/bookings/${bookingId}/deposit-review`, {
    paymentId: Number(paymentId),
    decision,
    reason: reason?.trim() || null,
  });
  return res.data?.data || null;
}

/** API-PAY-04: Xác nhận khoản REFUND (tự động qua VNPay hoặc hoàn thủ công / dự phòng thủ công khi cổng VNPay lỗi). */
export async function confirmManagerRefundApi(
  paymentId,
  { referenceCode, note, manualFallback = false, fallbackMethod = null } = {},
) {
  const payload = {
    referenceCode: referenceCode?.trim() || null,
    note: note?.trim() || null,
  };
  if (manualFallback) {
    payload.manualFallback = true;
    payload.fallbackMethod = fallbackMethod || 'BANK_TRANSFER';
  }
  const res = await apiClient.post(`/manager/payments/${paymentId}/confirm`, payload);
  return res.data?.data || null;
}

/** API-PAY-02: Ghi nhận khoản đặt cọc cho đơn do quản lý đặt hộ (tiền mặt hoặc chuyển khoản). */
export async function recordManagerDirectDepositApi(bookingId, { amount, method = 'CASH', referenceCode, note }) {
  const payload = {
    type: 'DEPOSIT',
    amount: Number(amount),
    method,
    note: note?.trim() || null,
  };
  if (referenceCode?.trim()) {
    payload.referenceCode = referenceCode.trim();
  }
  const res = await apiClient.post(`/manager/bookings/${bookingId}/payments`, payload);
  return res.data?.data || null;
}

/** API-MGR-BOOK-06: Cancel a booking and calculate any refund from its cancellation policy. */
export async function cancelManagerBookingApi(bookingId, { reason, requestedByCustomer, bankName, bankAccountNumber, bankAccountHolder } = {}) {
  const payload = {
    reason: reason?.trim(),
    requestedByCustomer: Boolean(requestedByCustomer),
    ...(bankName?.trim() ? { bankName: bankName.trim() } : {}),
    ...(bankAccountNumber?.trim() ? { bankAccountNumber: bankAccountNumber.trim() } : {}),
    ...(bankAccountHolder?.trim() ? { bankAccountHolder: bankAccountHolder.trim().toUpperCase() } : {}),
  };
  const res = await apiClient.post(`/manager/bookings/${bookingId}/cancel`, payload);
  return res.data?.data || null;
}

/**
 * API-MGR-STAY-01: Ghi nhận khách check-in (nhận phòng).
 * Chỉ áp dụng cho đơn ở trạng thái CONFIRMED thuộc homestay do Manager phụ trách.
 */
export async function checkInManagerBookingApi(bookingId, { actualGuestCount, note } = {}) {
  const payload = {};
  if (actualGuestCount !== undefined && actualGuestCount !== null && actualGuestCount !== '') {
    payload.actualGuestCount = Number(actualGuestCount);
  }
  if (note && note.trim()) {
    payload.note = note.trim();
  }
  const res = await apiClient.post(`/manager/bookings/${bookingId}/check-in`, payload);
  return res.data?.data || null;
}

/**
 * API-MGR-STAY-02: Ghi nhận khách check-out (trả phòng) và quyết toán tài chính.
 * Chỉ áp dụng cho đơn ở trạng thái CHECKED_IN thuộc homestay do Manager phụ trách.
 */
export async function checkOutManagerBookingApi(bookingId, {
  usedBookingServiceIds = [],
  unusedBookingServiceIds = [],
  payment = null,
  note = null,
} = {}) {
  const payload = {
    usedBookingServiceIds: (usedBookingServiceIds || []).map(Number),
    unusedBookingServiceIds: (unusedBookingServiceIds || []).map(Number),
    payment: payment
      ? {
          amount: Number(payment.amount),
          method: payment.method || 'CASH',
          referenceCode: payment.referenceCode?.trim() || null,
          note: payment.note?.trim() || null,
        }
      : null,
    note: note?.trim() || null,
  };
  const res = await apiClient.post(`/manager/bookings/${bookingId}/check-out`, payload);
  return res.data?.data || null;
}

/**
 * API-MGR-BOOK-07: Xem cán cân tài chính hiện tại của đơn đặt phòng.
 */
export async function getManagerBookingBalanceApi(bookingId) {
  const res = await apiClient.get(`/manager/bookings/${bookingId}/balance`);
  return res.data?.data || null;
}

/** API-EXP-05 (phần danh sách): danh mục chi phí của homestay Manager đang quản lý. */
export async function getManagerExpenseCategoriesApi() {
  const res = await apiClient.get('/manager/expense-categories');
  return res.data?.data || [];
}

/** API-REPORT-MGR-01: Tổng quan hoạt động cơ sở theo ngày. */
export async function getManagerReportOverviewApi({ fromDate, toDate, signal } = {}) {
  const params = {};
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;
  const res = await apiClient.get('/manager/reports/overview', { params, signal });
  return res.data?.data || null;
}

/** API-REPORT-MGR-02: Báo cáo tài chính cơ sở (thực thu ròng, chi phí, lợi nhuận). */
export async function getManagerReportFinanceApi({
  fromDate,
  toDate,
  categoryId,
  paymentMethod,
  signal,
} = {}) {
  const params = {};
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;
  if (categoryId) params.categoryId = Number(categoryId);
  if (paymentMethod) params.paymentMethod = paymentMethod;
  const res = await apiClient.get('/manager/reports/finance', { params, signal });
  return res.data?.data || null;
}

/** API-REPORT-MGR-03: Báo cáo công suất phòng cơ sở theo kỳ (chi tiết từng phòng & theo ngày). */
export async function getManagerReportOccupancyApi({
  fromDate,
  toDate,
  roomTypeId,
  signal,
} = {}) {
  const params = {};
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;
  if (roomTypeId) params.roomTypeId = Number(roomTypeId);
  const res = await apiClient.get('/manager/reports/occupancy', { params, signal });
  return res.data?.data || null;
}

/** API-EXP-05: CRUD danh mục chi phí của homestay đang quản lý. */
export async function createManagerExpenseCategoryApi(name) {
  const res = await apiClient.post('/manager/expense-categories', { name });
  return res.data?.data || null;
}

export async function updateManagerExpenseCategoryApi(categoryId, name) {
  const res = await apiClient.patch(`/manager/expense-categories/${categoryId}`, { name });
  return res.data?.data || null;
}

export async function deleteManagerExpenseCategoryApi(categoryId) {
  await apiClient.delete(`/manager/expense-categories/${categoryId}`);
}

/** API-EXP-01: danh sách khoản chi, lọc theo ngày, danh mục, phương thức, nhà cung cấp và phân trang. */
export async function getManagerExpensesApi({ fromDate, toDate, categoryId, paymentMethod, supplierName, page = 0, size = 20 } = {}) {
  const params = { page, size };
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;
  if (categoryId) params.categoryId = categoryId;
  if (paymentMethod) params.paymentMethod = paymentMethod;
  if (supplierName?.trim()) params.supplierName = supplierName.trim();
  const res = await apiClient.get('/manager/expenses', { params });
  const payload = res.data?.data;
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.content)
      ? payload.content
      : Array.isArray(payload?.items)
        ? payload.items
        : [];
  const responseMeta = res.data?.meta || payload?.meta || payload?.page || payload;
  const pageInfo = responseMeta?.page && typeof responseMeta.page === 'object'
    ? responseMeta.page
    : responseMeta;
  const totalElements = Number(responseMeta?.totalElements ?? pageInfo?.totalElements ?? items.length);
  return {
    items,
    meta: {
      page: Number(pageInfo?.page ?? pageInfo?.number ?? page),
      size: Number(pageInfo?.size ?? size),
      totalElements,
      totalPages: Number(pageInfo?.totalPages ?? Math.ceil(totalElements / size)),
    },
  };
}

/** API-EXP-02: tạo khoản chi và tải chứng từ tùy chọn bằng multipart/form-data. */
export async function createManagerExpenseApi(fields, proofFile) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, String(value));
  });
  if (proofFile) formData.append('proofFile', proofFile);

  const res = await apiClient.post('/manager/expenses', formData);
  return res.data?.data || null;
}

/** API-EXP-03: cập nhật một phần khoản chi; trường không gửi được backend giữ nguyên. */
export async function updateManagerExpenseApi(expenseId, fields, proofFile) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, String(value));
  });
  if (proofFile) formData.append('proofFile', proofFile);

  const res = await apiClient.patch(`/manager/expenses/${expenseId}`, formData);
  return res.data?.data || null;
}

/** API-EXP-04: hủy khoản chi và lưu lý do vào nhật ký kiểm toán. */
export async function cancelManagerExpenseApi(expenseId, reason) {
  const res = await apiClient.post(`/manager/expenses/${expenseId}/cancel`, { reason });
  return res.data?.data || null;
}

/** Tải riêng tư chứng từ đặt cọc để Manager đối chiếu giao dịch. */
export async function fetchManagerDepositProofApi(bookingId, paymentId) {
  const res = await apiClient.get(`/manager/bookings/${bookingId}/payments/${paymentId}/proof`, {
    responseType: 'blob',
  });
  return res.data;
}

/**
 * API-MEDIA-01: upload một file media; để Axios tự tạo multipart boundary.
 */
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

/**
 * API-MGR-SVC-01: Danh sách dịch vụ cơ sở của Manager
 */
export async function getManagerServicesApi({ status, categoryId, page = 0, size = 20, sort = 'name,asc' } = {}) {
  const params = {};
  if (status) params.status = status;
  if (categoryId) params.categoryId = categoryId;
  if (sort) params.sort = sort;
  params.page = page;
  params.size = size;

  const res = await apiClient.get('/manager/services', { params });
  return {
    items: res.data?.data || [],
    meta: res.data?.meta || { page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true },
  };
}

/**
 * Lấy danh mục dịch vụ thuộc homestay để Manager xem và phân loại dịch vụ
 * API-MGR-CAT-01
 */
export async function getManagerServiceCategoriesApi() {
  const res = await apiClient.get('/manager/service-categories');
  return res.data?.data || [];
}

/**
 * API-MGR-CAT-02: Tạo danh mục dịch vụ mới
 */
export async function createManagerServiceCategoryApi(name) {
  const res = await apiClient.post('/manager/service-categories', { name: name.trim() });
  return res.data?.data;
}

/**
 * API-MGR-CAT-03: Đổi tên danh mục dịch vụ
 */
export async function updateManagerServiceCategoryApi(categoryId, name) {
  const res = await apiClient.patch(`/manager/service-categories/${categoryId}`, { name: name.trim() });
  return res.data?.data;
}

/**
 * API-MGR-CAT-04: Xóa danh mục dịch vụ
 */
export async function deleteManagerServiceCategoryApi(categoryId) {
  await apiClient.delete(`/manager/service-categories/${categoryId}`);
}

/**
 * API-MGR-SVC-02: Khai báo dịch vụ mới thuộc homestay của Manager
 */
export async function createManagerServiceApi({ categoryId, name, unit, unitPrice, description }) {
  const payload = {
    categoryId: Number(categoryId),
    name: name?.trim(),
    unit: unit?.trim(),
    unitPrice: Number(unitPrice),
    ...(description?.trim() ? { description: description.trim() } : {}),
  };
  const res = await apiClient.post('/manager/services', payload);
  return res.data?.data;
}

/**
 * Lấy chi tiết một dịch vụ thuộc homestay của Manager
 */
export async function getManagerServiceDetailApi(serviceId) {
  const res = await apiClient.get(`/manager/services/${serviceId}`);
  return res.data?.data;
}

/**
 * API-MGR-SVC-03: Cập nhật dịch vụ
 */
export async function updateManagerServiceApi(serviceId, { categoryId, name, unit, unitPrice, description, status }) {
  const payload = {};
  if (categoryId !== undefined && categoryId !== null && categoryId !== '') payload.categoryId = Number(categoryId);
  if (name !== undefined) payload.name = name.trim();
  if (unit !== undefined) payload.unit = unit.trim();
  if (unitPrice !== undefined && unitPrice !== null && unitPrice !== '') payload.unitPrice = Number(unitPrice);
  if (description !== undefined) payload.description = description.trim();
  if (status !== undefined) payload.status = status;

  const res = await apiClient.patch(`/manager/services/${serviceId}`, payload);
  return res.data?.data;
}

/**
 * API-MGR-SVC-05: Đặt dịch vụ hộ khách
 * POST /api/v1/manager/bookings/{bookingId}/services
 */
export async function bookManagerServiceApi(bookingId, { roomId, serviceId, quantity, serviceDate, note }) {
  const payload = {
    roomId: Number(roomId),
    serviceId: Number(serviceId),
    quantity: Number(quantity),
    serviceDate: serviceDate || null,
    note: note ? note.trim() : null,
  };
  const res = await apiClient.post(`/manager/bookings/${bookingId}/services`, payload);
  return res.data?.data;
}

/**
 * API-MGR-SVC-06: Hủy dịch vụ hộ khách
 * DELETE /api/v1/manager/bookings/{bookingId}/services/{bookingServiceId}
 */
export async function cancelManagerServiceApi(bookingId, bookingServiceId) {
  const res = await apiClient.delete(`/manager/bookings/${bookingId}/services/${bookingServiceId}`);
  return res.data?.data;
}



