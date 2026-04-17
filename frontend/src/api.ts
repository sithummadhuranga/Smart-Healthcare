import axios from 'axios';

const runtimeDefaultApiUrl = `${window.location.protocol}//${window.location.hostname}:3000`;
const apiBaseUrl = import.meta.env.VITE_API_URL || runtimeDefaultApiUrl;
const tokenStorageKey = 'token';

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

export function getStoredToken(): string | null {
  return localStorage.getItem(tokenStorageKey);
}

export function persistToken(token: string): void {
  localStorage.setItem(tokenStorageKey, token);
}

export function clearSession(): void {
  localStorage.removeItem(tokenStorageKey);
}

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally using the documented refresh flow.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401) {
      const path = window.location.pathname;
      const requestUrl = originalRequest?.url || '';
      const isLoginRequest = requestUrl.includes('/api/auth/login');

      if (!isLoginRequest && !requestUrl.includes('/api/auth/refresh') && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshResponse = await refreshClient.post('/api/auth/refresh');
          const nextToken = refreshResponse.data?.accessToken;

          if (typeof nextToken === 'string' && nextToken.length > 0) {
            persistToken(nextToken);
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${nextToken}`;
            return api(originalRequest);
          }
        } catch {
          // Fall through to local session cleanup below.
        }
      }

      if (path !== '/login') {
        clearSession();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;

// ── JWT helpers (client-side only, no verification) ────────────────────────────
export interface JwtClaims {
  userId: string;
  role: 'patient' | 'doctor' | 'admin';
  email: string;
  name: string;
  exp: number;
}

export function parseToken(token: string): JwtClaims | null {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as JwtClaims;
  } catch {
    return null;
  }
}

export function getCurrentUser(): JwtClaims | null {
  const token = getStoredToken();
  if (!token) return null;
  return parseToken(token);
}
