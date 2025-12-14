// contexts/AuthContext.tsx - Production-ready authentication context

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { UserData, AuthTokens, LoginCredentials, RegisterCredentials, getUserData } from '@/services/apis/auth.api';
import { authManager } from '@/lib/auth-manager';

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

  // Initialize auth state on mount and listen for updates
  useEffect(() => {
    checkAuth();

    const handleAuthUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      // Check if detail exists (it might be a storage event or custom event)
      if (!customEvent.detail) return;

      const { state } = customEvent.detail;

      if (state && state.mode === 'authenticated') {
        setIsAuthenticated(true);
        const userData = getUserData();
        setUser(userData);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    };

    window.addEventListener('rc-auth-update', handleAuthUpdate);
    return () => window.removeEventListener('rc-auth-update', handleAuthUpdate);
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);

      const state = await authManager.init();

      if (state.mode === 'authenticated') {
        const userData = getUserData();
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
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
      const { user: userData } = await loginUser(credentials);

      // authManager.loginUser is called internally by loginUser api function via authManager instance import there
      // or we can call it explicitly if needed, but loginUser in auth.api.ts line 60 calls authManager.loginUser already.

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
      // Registration successful

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

      // Call API first (clears cookie)
      await logoutUser();

      // Then clear local state manager
      await authManager.logout();

      // Redundant safety: Clear localStorage manually
      if (typeof window !== 'undefined') {
        localStorage.removeItem('rc-tokens');
        localStorage.removeItem('rc-token');
        localStorage.removeItem('userData');
        localStorage.removeItem('event-app-storage'); // Clean up store persistence too if needed
      }

      // Sync with global store
      try {
        const { useStore } = await import('@/lib/store');
        useStore.getState().logout();
      } catch (e) {
        console.warn('Failed to sync logout with store', e);
      }

      // Clear state
      setUser(null);
      setIsAuthenticated(false);

      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }

    } catch (error) {
      console.error('Logout failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      await authManager.logout();

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
        const userData = getUserData();
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
        }
      } else {
        // Refresh failed - ensure cleanup
        setUser(null);
        setIsAuthenticated(false);
        await authManager.logout();

        // Redirect if needed?
        // Usually handled by router or intercepted requests
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      await authManager.logout();
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