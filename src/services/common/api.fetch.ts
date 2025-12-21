/**
 * Centralized API Configuration with Secure Token Management
 * 
 * This file configures axios with:
 * - Automatic token injection from in-memory storage
 * - Automatic token refresh on 401 errors
 * - Request queuing during refresh
 * - CSRF protection
 */

import axios, { AxiosHeaders, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getInternalAccessToken } from '@/contexts/SecureAuthContext';
import logger from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

interface RcAxiosConfig extends AxiosRequestConfig {
  skipErrorHandling?: boolean;
  cacheDuration?: boolean;
}

export type ServiceResponse<T> = {
  status: boolean;
  code: number;
  message: string;
  data: T | null;
  other?: any;
  error: { message: string; stack?: string } | null;
  stack?: any;
};

export type AuthHeader = {
  authorization: string;
  'Content-Type': string;
  'x-csrf-token'?: string;
};

// ============================================================================
// Token Refresh Queue
// ============================================================================

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

// ============================================================================
// Axios Interceptors
// ============================================================================

/**
 * Response interceptor for automatic token refresh
 */
axios.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.authorization = `Bearer ${token}`;
            return axios(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        logger.info('Token expired, attempting refresh');

        // Dynamically import to avoid circular dependency
        const { refreshAccessToken } = await import('@/services/apis/auth.api');
        const newTokens = await refreshAccessToken();

        if (newTokens && newTokens.accessToken) {
          logger.info('Token refresh successful');

          // Update authorization header
          originalRequest.headers.authorization = `Bearer ${newTokens.accessToken}`;

          // Process queued requests
          processQueue(null, newTokens.accessToken);

          // Retry original request
          return axios(originalRequest);
        } else {
          logger.warn('Token refresh failed, redirecting to login');
          handleAuthFailure();
          return Promise.reject(error);
        }
      } catch (refreshError) {
        logger.error('Token refresh error', refreshError);
        processQueue(refreshError, null);
        handleAuthFailure();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 403 Forbidden - insufficient permissions
    if (error.response?.status === 403) {
      logger.warn('403 Forbidden - insufficient permissions');
      // Don't redirect, let component handle
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

/**
 * Handle authentication failure
 */
const handleAuthFailure = () => {
  // Clear any stored data
  if (typeof window !== 'undefined') {
    localStorage.removeItem('userData');
    localStorage.removeItem('rc-tokens'); // Legacy cleanup
    localStorage.removeItem('rc-token'); // Legacy cleanup

    // Redirect to login
    window.location.href = '/login';
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generic API fetch wrapper
 */
export const apiFetch = async <T = any>(config: RcAxiosConfig): Promise<ServiceResponse<T>> => {
  try {
    const { data } = await axios(config);
    if (data.errors || !data) {
      return Promise.reject(data.errors || 'nothing found');
    }
    return Promise.resolve(data);
  } catch (error) {
    logger.error('API fetch error', error);
    return Promise.reject(error);
  }
};

/**
 * Set authorization headers for API requests
 * Uses in-memory token from SecureAuthContext
 */
export const setHeader = (
  token?: string,
  contentType: string = "application/json",
  includeCsrf: boolean = false
): AuthHeader => {
  try {
    // Use provided token or get from global in-memory storage
    const authToken = token || getInternalAccessToken() || "";

    const headers: AuthHeader = {
      authorization: `Bearer ${authToken}`,
      'Content-Type': contentType,
    };

    if (includeCsrf) {
      const csrfToken = typeof window !== 'undefined'
        ? sessionStorage?.getItem("csrf-token") || ""
        : "";
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }
    }

    return headers;
  } catch (err: unknown) {
    logger.error('Error setting auth headers', err);
    return {
      authorization: "Bearer error_happened_in_front_end",
      'Content-Type': contentType,
    };
  }
};