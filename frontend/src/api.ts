import axios from 'axios';

const runtimeDefaultApiUrl = `${window.location.protocol}//${window.location.hostname}:3000`;
const apiBaseUrl = import.meta.env.VITE_API_URL || runtimeDefaultApiUrl;

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — clear session and redirect to login
// Only redirect for actual auth failures (not when dashboard API calls fail silently)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      // If we're already on login or the request URL is not the login endpoint,
      // only redirect if the token itself is invalid/expired (not API-specific auth)
      const requestUrl = error.config?.url || '';
      const isLoginRequest = requestUrl.includes('/api/auth/login');
      if (!isLoginRequest && path !== '/login') {
        localStorage.clear();
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
  const token = localStorage.getItem('token');
  if (!token) return null;
  return parseToken(token);
}
