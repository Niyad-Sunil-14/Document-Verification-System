import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
  headers: { 'Content-Type': 'application/json' }
});

// Automatically inject the Bearer token before the request flies out
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token'); // Or wherever you stash your token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;   