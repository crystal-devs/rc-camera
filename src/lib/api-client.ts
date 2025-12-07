// src/lib/api-client.ts - Centralized API Client with Interceptors
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { buildApiUrl } from './api-routes';
import { authManager } from './auth-manager';

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

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const storedTokens = localStorage.getItem('rc-tokens');
      if (!storedTokens) return false;

      const tokens = JSON.parse(storedTokens);
      if (!tokens.refreshToken) return false;

      // Import refresh function dynamically to avoid circular imports
      const { refreshAccessToken } = await import('@/services/apis/auth.api');
      const newTokens = await refreshAccessToken();

      return !!newTokens;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
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