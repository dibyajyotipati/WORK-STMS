import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor:
// 1. Unwrap { success, data } envelope from vehicle/driver endpoints
// 2. On 401 — clear session and redirect to login
// 3. On token expired — show clear message
api.interceptors.response.use(
  (response) => {
    // If the backend returns { success: true, data: [...] }, unwrap it
    // so all existing page code using `const { data } = await api.get(...)`
    // continues to work without any changes
    if (
      response.data &&
      typeof response.data === 'object' &&
      'success' in response.data &&
      'data' in response.data
    ) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    const status  = error.response?.status;
    const message = error.response?.data?.message || '';

    if (status === 401) {
      const onAuthPage = window.location.pathname === '/login';
      if (!onAuthPage) {
        localStorage.removeItem('stms_token');
        localStorage.removeItem('stms_user');
        // Show message before redirect if token expired
        if (message.toLowerCase().includes('expired')) {
          alert('Your session has expired. Please log in again.');
        }
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;