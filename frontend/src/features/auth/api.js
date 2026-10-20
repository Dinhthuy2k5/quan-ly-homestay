import apiClient from '../../lib/api/client';

/**
 * API-AUTH-01: Đăng ký tài khoản Customer
 */
export async function registerApi({ email, password, fullName, phone }) {
  const res = await apiClient.post('/auth/register', {
    email,
    password,
    fullName,
    phone,
  });
  return res.data?.data;
}

/**
 * API-AUTH-02: Đăng nhập
 */
export async function loginApi({ email, password }) {
  const res = await apiClient.post('/auth/login', {
    email,
    password,
  });
  return res.data?.data;
}

/**
 * API-AUTH-03: Refresh token
 */
export async function refreshTokenApi(refreshToken) {
  const res = await apiClient.post('/auth/refresh', { refreshToken });
  return res.data?.data;
}

/**
 * API-AUTH-04: Đăng xuất
 */
export async function logoutApi(refreshToken) {
  const res = await apiClient.post('/auth/logout', { refreshToken });
  return res.data?.data;
}

/**
 * API-AUTH-05: Yêu cầu đặt lại mật khẩu
 */
export async function forgotPasswordApi(email) {
  const res = await apiClient.post('/auth/forgot-password', { email });
  return res.data?.data;
}

/**
 * API-AUTH-06: Đặt lại mật khẩu
 */
export async function resetPasswordApi({ token, newPassword }) {
  const res = await apiClient.post('/auth/reset-password', {
    token,
    newPassword,
  });
  return res.data?.data;
}

/**
 * API-USER-01: Xem hồ sơ tài khoản hiện tại
 */
export async function getProfileApi() {
  const res = await apiClient.get('/me');
  return res.data?.data;
}

/**
 * API-USER-02: Cập nhật hồ sơ
 */
export async function updateProfileApi({ fullName, phone }) {
  const res = await apiClient.patch('/me', {
    fullName,
    phone,
  });
  return res.data?.data;
}

/**
 * API-USER-03: Đổi mật khẩu
 */
export async function changePasswordApi({ currentPassword, newPassword }) {
  const res = await apiClient.patch('/me/password', {
    currentPassword,
    newPassword,
  });
  return res.data?.data;
}
