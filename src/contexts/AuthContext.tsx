// contexts/AuthContext.tsx - Production-ready authentication context

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { UserData, AuthTokens, LoginCredentials, RegisterCredentials } from '@/services/apis/auth.api';
import { authManager } from '@/lib/auth';

interface AuthContextType {
  // State
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRefreshing: boolean;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  initiateGoogleOAuth: () => void;

  // Utilities
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize auth state on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Listen for storage changes (multi-tab support)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'rc-tokens' || e.key === 'userData') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);

      if (authManager.isAuthenticated()) {
        const currentUser = authManager.getCurrentUser();
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        // Try to refresh token if expired
        if (authManager.isTokenExpired() && authManager.getStoredTokens()) {
          setIsRefreshing(true);
          const newTokens = await authManager.refreshTokenIfNeeded();
          if (newTokens) {
            const currentUser = authManager.getCurrentUser();
            setUser(currentUser);
            setIsAuthenticated(true);
          } else {
            // Refresh failed, clear auth
            setUser(null);
            setIsAuthenticated(false);
            authManager.clearAuthData();
          }
          setIsRefreshing(false);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);

      // Import dynamically to avoid circular dependencies
      const { loginUser } = await import('@/services/apis/auth.api');
      const { user: userData, tokens } = await loginUser(credentials);

      // Update auth manager
      authManager.updateTokens(tokens);

      // Update state
      setUser(userData);
      setIsAuthenticated(true);

    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    try {
      setIsLoading(true);

      // Import dynamically to avoid circular dependencies
      const { registerUser } = await import('@/services/apis/auth.api');
      const { user: userData } = await registerUser(credentials);

      // Update state
      setUser(userData);
      // Registration successful, but user needs to login to get tokens

    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);

      // Import dynamically to avoid circular dependencies
      const { logoutUser } = await import('@/services/apis/auth.api');
      await logoutUser();

      // Clear state
      setUser(null);
      setIsAuthenticated(false);

      // Clear all cached data and force page reload to prevent back button access
      authManager.clearAuthData();

      // Clear React Query cache
      if (typeof window !== 'undefined') {
        // Clear localStorage/sessionStorage
        localStorage.clear();
        sessionStorage.clear();

        // Set flag to prevent back button navigation
        sessionStorage.setItem('auth_invalidated', 'true');

        // Force a hard navigation to login (not router.push)
        window.location.href = '/login';
      }

    } catch (error) {
      console.error('Logout failed:', error);
      // Clear state anyway
      setUser(null);
      setIsAuthenticated(false);
      authManager.clearAuthData();

      // Still force redirect
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const newTokens = await authManager.refreshTokenIfNeeded();

      if (newTokens) {
        // Update state if user data changed
        const currentUser = authManager.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
        }
      } else {
        // Refresh failed
        setUser(null);
        setIsAuthenticated(false);
        authManager.clearAuthData();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      authManager.clearAuthData();
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const initiateGoogleOAuth = useCallback(() => {
    // Import dynamically to avoid circular dependencies
    import('@/services/apis/auth.api').then(({ initiateGoogleOAuth }) => {
      initiateGoogleOAuth();
    });
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    isRefreshing,
    login,
    register,
    logout,
    refreshToken,
    initiateGoogleOAuth,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for protecting routes
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return (props: P) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return <div>Loading...</div>; // Replace with your loading component
    }

    if (!isAuthenticated) {
      // Redirect to login or show unauthorized message
      return <div>Please log in to access this page.</div>;
    }

    return <Component {...props} />;
  };
};