// lib/auth.ts - Production-ready authentication utilities

import { AuthTokens, UserData } from '@/services/apis/auth.api';

export class AuthManager {
  private static instance: AuthManager;
  private refreshPromise: Promise<AuthTokens | null> | null = null;
  private isRefreshing = false;

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  // Check if access token is expired or will expire soon (within 5 minutes)
  isTokenExpired(): boolean {
    try {
      const storedTokens = localStorage.getItem("rc-tokens");
      if (!storedTokens) return true;

      const tokens: AuthTokens = JSON.parse(storedTokens);
      const now = Date.now();
      const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

      return (tokens.expiresAt * 1000) - now < bufferTime;
    } catch {
      return true;
    }
  }

  // Get current access token
  getAccessToken(): string | null {
    try {
      const storedTokens = localStorage.getItem("rc-tokens");
      if (!storedTokens) return null;

      const tokens: AuthTokens = JSON.parse(storedTokens);
      return tokens.accessToken;
    } catch {
      return null;
    }
  }

  // Get stored tokens
  getStoredTokens(): AuthTokens | null {
    try {
      const storedTokens = localStorage.getItem("rc-tokens");
      return storedTokens ? JSON.parse(storedTokens) : null;
    } catch {
      return null;
    }
  }

  // Update stored tokens
  updateTokens(tokens: AuthTokens): void {
    localStorage.setItem("rc-tokens", JSON.stringify(tokens));
    localStorage.setItem("rc-token", tokens.accessToken); // Keep for backward compatibility
  }

  // Clear all auth data
  clearAuthData(): void {
    localStorage.removeItem("rc-tokens");
    localStorage.removeItem("rc-token");
    localStorage.removeItem("userData");
    localStorage.removeItem("csrf-token");
  }

  // Get current user data
  getCurrentUser(): UserData | null {
    try {
      const userDataString = localStorage.getItem("userData");
      if (!userDataString) return null;

      const userData = JSON.parse(userDataString);
      return {
        id: userData.id,
        name: userData.name || 'User',
        email: userData.email || '',
        avatar: userData.avatar || userData.profile_pic,
        provider: userData.provider || 'email'
      };
    } catch (error) {
      console.error("Error retrieving user data:", error);
      return null;
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const hasValidToken = !this.isTokenExpired() && !!this.getAccessToken();
    const hasUser = !!this.getCurrentUser();
    console.log('Auth check:', { hasValidToken, hasUser, tokenExpired: this.isTokenExpired() });
    return hasValidToken && hasUser;
  }

  // Handle token refresh with deduplication
  async refreshTokenIfNeeded(): Promise<AuthTokens | null> {
    if (this.isRefreshing && this.refreshPromise) {
      // Return existing refresh promise if already refreshing
      return this.refreshPromise;
    }

    if (!this.isTokenExpired()) {
      return this.getStoredTokens();
    }

    this.isRefreshing = true;

    // Import refreshAccessToken dynamically to avoid circular dependencies
    const { refreshAccessToken } = await import('@/services/apis/auth.api');

    this.refreshPromise = refreshAccessToken().finally(() => {
      this.isRefreshing = false;
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  // Validate token format and basic structure
  validateToken(token: string): boolean {
    if (!token || typeof token !== 'string') return false;

    try {
      // Basic JWT structure validation (header.payload.signature)
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      // Try to decode payload to check expiration
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);

      return payload.exp > now;
    } catch {
      return false;
    }
  }
}

// Utility functions
export const authManager = AuthManager.getInstance();

export const isTokenExpired = () => authManager.isTokenExpired();
export const getAccessToken = () => authManager.getAccessToken();
export const getCurrentUser = () => authManager.getCurrentUser();
export const isAuthenticated = () => authManager.isAuthenticated();
export const refreshTokenIfNeeded = () => authManager.refreshTokenIfNeeded();

// Token validation utilities
export const validateTokenFormat = (token: string): boolean => {
  return authManager.validateToken(token);
};

// Security utilities
export const sanitizeAuthData = (data: any): any => {
  // Remove sensitive information from auth responses
  const sensitiveFields = ['password', 'refreshToken', 'accessToken'];
  const sanitized = { ...data };

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      delete sanitized[field];
    }
  });

  return sanitized;
};