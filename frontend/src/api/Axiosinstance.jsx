// Axiosinstance.jsx
import axios from 'axios';
import Swal from 'sweetalert2';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/',
  headers: { 'Content-Type': 'application/json' }
});

const cache = new Map();

export const invalidateCache = (url) => {
  if (url) {
    cache.delete(url);
  } else {
    cache.clear();
  }
};

// Request Interceptor
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.method === 'get' && config.useCache) {
    const cachedResponse = cache.get(config.url);
    if (cachedResponse) {
      config.adapter = () => Promise.resolve(cachedResponse);
    }
  }

  return config;
});

// Flag to prevent multiple simultaneous popups if 3 API requests fail at once
let isSessionExpiredAlertShowing = false;

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    const method = response.config.method.toLowerCase();

    if (method === 'get' && response.config.useCache) {
      cache.set(response.config.url, response);
    }

    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      cache.delete(response.config.url);
    }

    return response;
  },
  (error) => {
    // 🚀 Catch 401 Unauthorized on ANY API call from the SAME PAGE
    if (error.response && error.response.status === 401) {
      if (!isSessionExpiredAlertShowing) {
        isSessionExpiredAlertShowing = true;

        // Clear stored tokens
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');

        Swal.fire({
          title: 'Session Expired',
          text: 'Your session has timed out. Please log in again to continue.',
          icon: 'warning',
          confirmButtonText: 'Go to Login',
          confirmButtonColor: '#4f46e5',
          allowOutsideClick: false,
          allowEscapeKey: false,
        }).then((result) => {
          if (result.isConfirmed) {
            isSessionExpiredAlertShowing = false;
            window.location.href = '/login';
          }
        });
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;