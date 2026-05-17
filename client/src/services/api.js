import axios from 'axios';

// Prefer an explicit VITE_API_URL. Otherwise build it from VITE_API_HOST (a bare hostname
// supplied by Render's fromService cross-reference). Fall back to same-origin /api for dev.
const apiHost = import.meta.env.VITE_API_HOST;
const baseURL =
  import.meta.env.VITE_API_URL ||
  (apiHost ? `https://${apiHost.replace(/^https?:\/\//, '').replace(/\/$/, '')}/api` : '/api');

export const api = axios.create({ baseURL, withCredentials: true });

let accessToken = localStorage.getItem('accessToken') || null;
let refreshToken = localStorage.getItem('refreshToken') || null;
let onAuthChange = () => {};

export function setAuthTokens(next) {
  accessToken = next.accessToken || null;
  refreshToken = next.refreshToken || null;
  if (accessToken) localStorage.setItem('accessToken', accessToken);
  else localStorage.removeItem('accessToken');
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  else localStorage.removeItem('refreshToken');
  onAuthChange({ accessToken, refreshToken });
}

export function subscribeAuth(fn) {
  onAuthChange = fn;
}

export function getTokens() {
  return { accessToken, refreshToken };
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let isRefreshing = false;
let queue = [];

const flushQueue = (err, token) => {
  queue.forEach((p) => (err ? p.reject(err) : p.resolve(token)));
  queue = [];
};

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && refreshToken) {
      original._retry = true;
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({
            resolve: (token) => {
              original.headers.Authorization = `Bearer ${token}`;
              resolve(api(original));
            },
            reject,
          });
        });
      }
      isRefreshing = true;
      try {
        const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        setAuthTokens(data.data);
        flushQueue(null, data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch (err) {
        flushQueue(err, null);
        setAuthTokens({ accessToken: null, refreshToken: null });
        localStorage.removeItem('user');
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
