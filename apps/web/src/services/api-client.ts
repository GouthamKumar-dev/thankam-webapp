import axios from 'axios';

type AuthAdapter = {
  getAccessToken: () => string | null;
  setAccessToken: (token: string | null) => void;
  clearAuth: () => void;
};

const authAdapter: AuthAdapter = {
  getAccessToken: () => null,
  setAccessToken: () => undefined,
  clearAuth: () => undefined,
};

export function configureApiClientAuth(adapter: AuthAdapter) {
  authAdapter.getAccessToken = adapter.getAccessToken;
  authAdapter.setAccessToken = adapter.setAccessToken;
  authAdapter.clearAuth = adapter.clearAuth;
}

const fallbackApiBaseUrl =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:4000/api`
    : 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? fallbackApiBaseUrl,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = authAdapter.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const skipRefresh = originalRequest?.headers?.['x-skip-auth-refresh'] === '1';
    const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh');

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !skipRefresh &&
      !isRefreshRequest
    ) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = apiClient
          .post('/auth/refresh', {})
          .then((res) => res.data?.accessToken ?? null)
          .catch(() => null)
          .finally(() => {
            isRefreshing = false;
          });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        authAdapter.setAccessToken(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }

      authAdapter.clearAuth();
    }

    return Promise.reject(error);
  },
);
