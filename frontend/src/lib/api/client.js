import axios from 'axios';

/**
 * Axios instance chuẩn cho toàn bộ dự án gọi Backend Spring Boot.
 * Endpoint trong code viết rút gọn sau /api/v1 (ví dụ /public/homestays).
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor: tự động đính kèm accessToken nếu có
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: xử lý 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
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
