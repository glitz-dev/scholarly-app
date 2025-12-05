// app/api/instance.js
import axios from 'axios';
import store from '@/store/store';
import { refreshAccessToken, logout } from '@/store/auth-slice'; // FIXED: Import logout

const api = axios.create({
    withCredentials: true,
});

// Request interceptor: Attach token if authenticated
api.interceptors.request.use(
  (config) => {
    const { token } = store.getState().auth;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('📤 Request to', config.url, '- Using token preview:', token?.substring(0, 20) + '...'); // TEMP: Log attached token
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Refresh on 401
const failedQueue = []; // Kept for potential future use

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue.length = 0;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      store.getState().auth.refreshToken
    ) {
      originalRequest._retry = true;

      try {
        console.log('🔒 401 on', originalRequest.url, '- Attempting refresh'); // TEMP
        await store.dispatch(refreshAccessToken()).unwrap();

        // FIXED: Log & use new token
        const { token } = store.getState().auth;
        console.log('🔄 Post-refresh: New token preview:', token?.substring(0, 20) + '...'); // TEMP
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.log('❌ Refresh failed in interceptor:', refreshError); // TEMP
        processQueue(refreshError, null);
        store.dispatch(logout()); // FIXED: Use action creator
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;