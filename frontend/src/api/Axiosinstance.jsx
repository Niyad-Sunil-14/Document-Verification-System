import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/',
  headers: { 'Content-Type': 'application/json' }
});

const cache = new Map();

// 💡 Helper to manually invalidate specific URLs from anywhere in your app
export const invalidateCache = (url) => {
  if (url) {
    cache.delete(url);
  } else {
    cache.clear(); // Clear all if no URL provided
  }
};

// Request Interceptor
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Serve from cache if useCache is enabled
  if (config.method === 'get' && config.useCache) {
    const cachedResponse = cache.get(config.url);
    if (cachedResponse) {
      config.adapter = () => Promise.resolve(cachedResponse);
    }
  }

  return config;
});

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    const method = response.config.method.toLowerCase();

    // 1. Save to cache on GET if useCache is set
    if (method === 'get' && response.config.useCache) {
      cache.set(response.config.url, response);
    }

    // 2. 🚀 AUTOMATIC INVALIDATION:
    // If a POST/PUT/PATCH/DELETE request succeeds, purge the cached GET entry for that endpoint
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      cache.delete(response.config.url);
    }

    return response;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;