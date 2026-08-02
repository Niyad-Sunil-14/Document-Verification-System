import axios from 'axios';
import Swal from 'sweetalert2';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/',
  headers: { 'Content-Type': 'application/json' }
});

const cache = new Map();

// Define all public endpoints that should NEVER send a token or trigger session expiration
const PUBLIC_ENDPOINTS = [
  'auth/login',
  'auth/register',
  'auth/forgot-password',
  'auth/reset-password',
  'auth/admin-login',
];

export const invalidateCache = (url) => {
  if (url) {
    cache.delete(url);
  } else {
    cache.clear();
  }
};

// Request Interceptor
axiosInstance.interceptors.request.use((config) => {
  // Check if the current request is for a public endpoint
  const isPublicEndpoint = PUBLIC_ENDPOINTS.some((endpoint) =>
    config.url?.includes(endpoint)
  );

  const token = localStorage.getItem('access_token');
  
  // 🛑 FIX 1: Only attach Authorization header if it's NOT a public endpoint
  if (token && !isPublicEndpoint) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
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
    // Check if the error came from a public endpoint
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some((endpoint) =>
      error.config?.url?.includes(endpoint)
    );

    // 🚀 FIX 2: Only trigger Session Expired if 401 occurs AND it's NOT a public endpoint
    if (error.response && error.response.status === 401 && !isPublicEndpoint) {
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

    // Always reject the error so individual catch blocks (e.g., Login.jsx) can display specific error messages
    return Promise.reject(error);
  }
);

export default axiosInstance;