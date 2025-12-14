import axios, { AxiosHeaders, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { authManager } from '@/lib/auth-manager'
import logger from '@/lib/logger'

//- rcaxiosconfig is the custom config according to our needs, in future we can add more of this fields
interface RcAxiosConfig extends AxiosRequestConfig {
  skidErrorHandling?: boolean,
  cacheDuration?: boolean,
}


// you can change this naming and also move to types folder if you want, i prefer putting this here tho.
export type ServiceResponse<T> = {
  status: boolean;
  code: number;
  message: string;
  data: T | null;
  other?: any;
  error: { message: string; stack?: string } | null;
  stack?: any,
}

export const apiFetch = async <T = any>(config: RcAxiosConfig): Promise<ServiceResponse<T>> => {
  try {
    const { data } = await axios(config)
    if (data.errors || !data) return Promise.reject(data.errors || 'nothing found')
    return Promise.resolve(data)
  } catch (error) {
    logger.error('API fetch error', error)
    return Promise.reject(error)
  }
}

export type AuthHeader = {
  authorization: string;
  'Content-Type': string;
  'x-csrf-token'?: string;
}

// Request queue for handling concurrent requests during token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });

  failedQueue = [];
};

// Axios response interceptor for automatic token refresh
axios.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue the request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.authorization = `jwt ${token}`;
          return axios(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        logger.info('Starting token refresh due to 401 error');
        const newTokens = await authManager.refreshTokenIfNeeded();

        if (newTokens) {
          logger.info('Token refresh successful, retrying request');
          // Update the authorization header
          originalRequest.headers.authorization = `jwt ${newTokens.accessToken}`;

          // Process queued requests
          processQueue(null, newTokens.accessToken);

          // Retry the original request
          return axios(originalRequest);
        } else {
          logger.warn('Token refresh failed, redirecting to login');
          // Refresh failed, redirect to login
          authManager.logout();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }
      } catch (refreshError) {
        logger.error('Token refresh error', refreshError);
        // Refresh failed, redirect to login
        processQueue(refreshError, null);
        authManager.logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 403 Forbidden - user doesn't have permission
    if (error.response?.status === 403) {
      logger.warn('403 Forbidden - User does not have permission for this resource');
      // Don't redirect, let the component handle the error
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export const setHeader = (
  token?: string,
  contentType: string = "application/json",
  includeCsrf: boolean = false
): AuthHeader => {
  try {
    // Use provided token or get from auth manager
    const authToken = token || authManager.getAuthToken() || "";

    const headers: AuthHeader = {
      authorization: `jwt ${authToken}`,
      'Content-Type': contentType,
    };

    if (includeCsrf) {
      const csrfToken = typeof window !== 'undefined' ? sessionStorage?.getItem("csrf-token") || "" : "";
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }
    }

    return headers;
  } catch (err: unknown) {
    logger.error('Error setting auth headers', err);
    return {
      authorization: "jwt error_happened_in_front_end",
      'Content-Type': contentType,
    };
  }
}