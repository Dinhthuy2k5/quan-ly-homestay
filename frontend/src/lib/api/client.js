import axios from 'axios';
import { clearAccessToken, getAccessToken, setAccessToken } from './accessTokenStore';
import { clearRefreshToken, getRefreshToken, setRefreshToken } from './refreshTokenStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

/**
 * Axios instance chuẩn cho toàn bộ dự án gọi Backend Spring Boot.
 * Endpoint trong code viết rút gọn sau /api/v1 (ví dụ /public/homestays, /auth/login).
 */
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let refreshPromise = null;

/** Share refresh calls between startup hydration and concurrent 401 responses. */
export function refreshSessionTokens() {
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return Promise.reject(new Error('Không tìm thấy refresh token.'));
  }

  refreshPromise = axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
    .then((response) => {
      const data = response.data?.data;
      if (!data?.accessToken || !data?.refreshToken) {
        throw new Error('Dữ liệu làm mới token không hợp lệ.');
      }

      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      return data.accessToken;
    })
    .catch((error) => {
      clearAccessToken();
      localStorage.removeItem('accessToken');
      clearRefreshToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:session-expired'));
      }
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

// Request interceptor: tự động đính kèm accessToken nếu có
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    const url = config.url || '';
    const isPublicEndpoint = url.startsWith('/public/') ||
      url === '/health' ||
      ['/auth/login', '/auth/register', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password']
        .some((path) => url.startsWith(path));

    if (token && !isPublicEndpoint) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (isPublicEndpoint) {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: xử lý 401 và tự động refresh token một lần.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // Public authentication endpoints do not need automatic refresh.
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/forgot-password') ||
      originalRequest.url?.includes('/auth/reset-password');

    const requestHadAccessToken = Boolean(originalRequest.headers?.Authorization || getAccessToken());
    if (error.response?.status === 401 && requestHadAccessToken && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshSessionTokens();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  },
);

/**
 * Ghép đường dẫn ảnh do server trả (/files/...) với origin của backend.
 * @param {string|null|undefined} path
 * @returns {string} URL đầy đủ hoặc rỗng
 */
export function fileUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const origin = import.meta.env.VITE_SERVER_ORIGIN || 'http://localhost:8080';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${cleanPath}`;
}

export default apiClient;
