// src/lib/api-client.ts - Centralized API Client with Interceptors
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { buildApiUrl } from './api-routes';
import { authManager } from './auth-manager';
import logger from './logger';

export interface ApiResponse<T = any> {
  status: boolean;
  code: number;
  message: string;
  data: T;
  error?: any;
  other?: any;
}

class ApiClient {
  private axiosInstance = axios.create({
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  constructor() {
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor for auth tokens
    this.axiosInstance.interceptors.request.use((config) => {
      const token = this.getAuthToken();
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Try to refresh token first
          const refreshed = await this.tryRefreshToken();
          if (refreshed) {
            // Retry the original request with new token
            const originalRequest = error.config;
            if (originalRequest) {
              originalRequest.headers.Authorization = `Bearer ${this.getAuthToken()}`;
              return this.axiosInstance(originalRequest);
            }
          }
          // If refresh failed, handle unauthorized
          this.handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  }

  private getAuthToken(): string | null {
    return authManager.getAuthToken();
  }

  private refreshPromise: Promise<boolean> | null = null;

  private async tryRefreshToken(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        logger.debug('ApiClient: Token expired, attempting refresh via API');

        // Import refresh function dynamically to avoid circular dependencies
        const { refreshAccessToken } = await import('@/services/apis/auth.api');
        const newTokens = await refreshAccessToken();

        if (newTokens && newTokens.accessToken) {
          // Update authManager state for consistency
          await authManager.loginUser({
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken || '',
            expiresAt: newTokens.expiresAt,
            userId: 'unknown' // Will be updated by context if needed
          });
          return true;
        }

        return false;
      } catch (error) {
        logger.error('ApiClient: Token refresh failed', error);
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private handleUnauthorized() {
    // Clear token and redirect to login
    if (typeof window !== 'undefined') {
      authManager.logout().then(() => {
        // Use hard redirect to prevent infinite loops
        window.location.href = '/login';
      });
    }
  }

  async get<T = any>(path: string, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.get(buildApiUrl(path), config);
  }

  async post<T = any>(path: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.post(buildApiUrl(path), data, config);
  }

  async put<T = any>(path: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.put(buildApiUrl(path), data, config);
  }

  async patch<T = any>(path: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.patch(buildApiUrl(path), data, config);
  }

  async delete<T = any>(path: string, config?: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.delete(buildApiUrl(path), config);
  }

  // Direct axios instance access for advanced use cases
  get instance() {
    return this.axiosInstance;
  }
}

export const apiClient = new ApiClient();