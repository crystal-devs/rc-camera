// src/lib/api-client.ts - Centralized API Client with Interceptors
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { buildApiUrl } from './api-routes';

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
      (error) => {
        if (error.response?.status === 401) {
          this.handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  }

  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  }

  private handleUnauthorized() {
    // Clear token and redirect to login
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
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