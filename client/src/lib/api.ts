import axios, { AxiosHeaders, type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const REFRESH_URL = `${API_BASE_URL.replace(/\/+$/, '')}/api/auth/refresh`;

export const AUTH_EXPIRED_EVENT = 'gitzone:auth-expired';

type RefreshResponse = {
  success: boolean;
  data?: {
    accessToken?: string;
  };
};

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const AUTH_ENDPOINTS_WITHOUT_REFRESH = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/auth/2fa/login/verify',
  '/api/auth/2fa/login/recovery',
];

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/*
 * A separate raw Axios request is intentional:
 * the refresh request must not pass through this
 * instance's response interceptor.
 */
const refreshAccessToken = async (): Promise<string> => {
  const response = await axios.post<RefreshResponse>(
    REFRESH_URL,
    {},
    {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15_000,
    },
  );

  const accessToken = response.data?.data?.accessToken;

  if (!accessToken) {
    throw new Error('Refresh response did not contain an access token');
  }

  localStorage.setItem('accessToken', accessToken);

  return accessToken;
};

let refreshPromise: Promise<string> | null = null;

const shouldSkipRefresh = (url?: string): boolean => {
  if (!url) {
    return false;
  }

  const normalizedUrl = url.split('?')[0]?.replace(/\/+$/, '') ?? url;

  return AUTH_ENDPOINTS_WITHOUT_REFRESH.some((endpoint) => normalizedUrl === endpoint);
};

const expireAuthentication = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');

  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
};

/*
 * Request interceptor:
 * attach the latest access token to every API request.
 */
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');

    if (token) {
      config.headers = AxiosHeaders.from(config.headers);
      config.headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return config;
});

/*
 * Response interceptor:
 * refresh an expired access token once and retry
 * the original request.
 *
 * Concurrent 401 responses share a single refresh request.
 */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      typeof window === 'undefined' ||
      shouldSkipRefresh(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    /*
     * A retried request must never enter another
     * refresh cycle.
     */
    if (originalRequest._retry) {
      expireAuthentication();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const accessToken = await refreshPromise;

      originalRequest.headers = AxiosHeaders.from(originalRequest.headers);
      originalRequest.headers.set('Authorization', `Bearer ${accessToken}`);

      return api.request(originalRequest);
    } catch (refreshError) {
      /*
       * Clear the session only when the server confirms
       * the refresh session is no longer valid.
       * Network errors and temporary server failures
       * should not silently destroy a valid session.
       */
      if (
        axios.isAxiosError(refreshError) &&
        [401, 403].includes(refreshError.response?.status ?? 0)
      ) {
        expireAuthentication();
      }

      return Promise.reject(refreshError);
    }
  },
);
