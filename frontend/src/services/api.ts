// import axios from 'axios';

// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
// });

// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('sgs_token');
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

// api.interceptors.response.use(
//   (r) => r,
//   (err) => {
//     if (err.response?.status === 401) {
//       localStorage.removeItem('sgs_token');
//       if (!window.location.pathname.includes('/login')) {
//         window.location.href = '/login';
//       }
//     }
//     return Promise.reject(err);
//   },
// );

// export default api;

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

const api: AxiosInstance = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string) ?? "http://localhost:4000/api/auth",
});

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const onRrefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const originalRequest = err.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (err.response && err.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        // no refresh token -> logout client-side
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(err);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          addRefreshSubscriber((token: string) => {
            if (!originalRequest.headers) originalRequest.headers = {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const { data } = await api.post('/refresh', { refreshToken });
        const newToken = data.accessToken;
        localStorage.setItem('token', newToken);
        onRrefreshed(newToken);
        if (!originalRequest.headers) originalRequest.headers = {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default api;