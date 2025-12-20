/**
 * Secure Authentication Context - Industry Standard Implementation
 * 
 * Security Features:
 * - Access tokens stored in-memory ONLY (not localStorage)
 * - Automatic token refresh before expiry
 * - Silent refresh on page load using HttpOnly cookie
 * - XSS protection: tokens inaccessible to malicious scripts
 * 
 * @see https://owasp.org/www-chapter-vancouver/assets/presentations/2020-01_Improving_Your_Web_App_Security.pdf
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { UserData, LoginCredentials, RegisterCredentials } from '@/services/apis/auth.api';
import logger from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

interface SecureAuthContextType {
    // State
    accessToken: string | null;
    user: UserData | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // Actions
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (credentials: RegisterCredentials) => Promise<void>;
    logout: () => Promise<void>;
    setAuthFromResult: (userData: UserData, tokens: { accessToken: string; refreshToken?: string; expiresAt: number }) => void;

    // Utilities
    getAccessToken: () => string | null;
    refreshAuth: () => Promise<boolean>;
}

// ============================================================================
// Context
// ============================================================================

const SecureAuthContext = createContext<SecureAuthContextType | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface SecureAuthProviderProps {
    children: ReactNode;
}

export const SecureAuthProvider: React.FC<SecureAuthProviderProps> = ({ children }) => {
    // ========== State ==========
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [user, setUser] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [tokenExpiresAt, setTokenExpiresAt] = useState<number>(0);

    // Refs for auto-refresh
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isRefreshingRef = useRef(false);

    // ========== Computed State ==========
    const isAuthenticated = !!accessToken && !!user && Date.now() < tokenExpiresAt;

    // ========== Token Management ==========

    /**
     * Set access token and schedule auto-refresh
     */
    const setAuthToken = useCallback((token: string, expiresAt: number) => {
        setAccessToken(token);
        setTokenExpiresAt(expiresAt);
        setInternalAccessToken(token); // Sync with internal token for API interceptors
        scheduleTokenRefresh(expiresAt);
    }, []);

    /**
     * Clear access token and cancel auto-refresh
     */
    const clearAuthToken = useCallback(() => {
        setAccessToken(null);
        setTokenExpiresAt(0);
        setInternalAccessToken(null); // Clear internal token
        cancelTokenRefresh();
    }, []);

    /**
     * Get current access token (for API calls)
     */
    const getAccessToken = useCallback((): string | null => {
        if (!accessToken) return null;

        // Check if token is expired
        if (Date.now() >= tokenExpiresAt) {
            logger.warn('Access token expired');
            return null;
        }

        return accessToken;
    }, [accessToken, tokenExpiresAt]);

    // ========== Auto-Refresh Logic ==========

    /**
     * Schedule automatic token refresh at 80% of token lifetime
     */
    const scheduleTokenRefresh = (expiresAt: number) => {
        cancelTokenRefresh();

        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;

        if (timeUntilExpiry <= 0) {
            logger.warn('Token already expired, cannot schedule refresh');
            return;
        }

        // Refresh at 80% of lifetime (e.g., 12 min for 15 min token)
        const refreshAt = timeUntilExpiry * 0.8;

        logger.debug('Scheduling token refresh', {
            refreshInMinutes: Math.round(refreshAt / 60000),
            expiresInMinutes: Math.round(timeUntilExpiry / 60000)
        });

        refreshTimerRef.current = setTimeout(async () => {
            await refreshAuth();
        }, refreshAt);
    };

    /**
     * Cancel scheduled token refresh
     */
    const cancelTokenRefresh = () => {
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
    };

    const refreshAuth = useCallback(async (): Promise<boolean> => {
        try {
            logger.debug('Context: Refreshing access token via API');

            const { refreshAccessToken } = await import('@/services/apis/auth.api');
            const result = await refreshAccessToken();

            if (result && result.accessToken) {
                // Update state directly
                setAuthToken(result.accessToken, result.expiresAt);

                // Update authManager state for cross-tab sync
                const { authManager } = await import('@/lib/auth-manager');
                await authManager.loginUser({
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken,
                    expiresAt: result.expiresAt,
                    userId: user?.id || 'unknown'
                });

                return true;
            }

            return false;

        } catch (error) {
            logger.error('Context: Token refresh error', error);
            await handleAuthFailure();
            return false;
        }
    }, [setAuthToken, user?.id]);

    /**
     * Handle authentication failure (logout)
     */
    const handleAuthFailure = async () => {
        clearAuthToken();
        setUser(null);

        // Clear user data from localStorage
        if (typeof window !== 'undefined') {
            localStorage.removeItem('userData');
        }
    };

    // ========== Authentication Actions ==========

    /**
     * Login user
     */
    const login = useCallback(async (credentials: LoginCredentials) => {
        try {
            setIsLoading(true);

            const { loginUser } = await import('@/services/apis/auth.api');
            const { user: userData, tokens } = await loginUser(credentials);

            // Store token in-memory
            setAuthToken(tokens.accessToken, tokens.expiresAt);
            setUser(userData);

            // Store minimal user data in localStorage (only essential fields)
            const minimalUserData = {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                provider: userData.provider
                // Exclude avatar and other potentially sensitive fields
            };
            localStorage.setItem('userData', JSON.stringify(minimalUserData));

            logger.info('User logged in successfully', { userId: userData.id });

        } catch (error) {
            logger.error('Login failed', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [setAuthToken]);

    /**
     * Register user
     */
    const register = useCallback(async (credentials: RegisterCredentials) => {
        try {
            setIsLoading(true);

            const { registerUser } = await import('@/services/apis/auth.api');
            const { user: userData, tokens } = await registerUser(credentials);

            // Store token in-memory
            setAuthToken(tokens.accessToken, tokens.expiresAt);
            setUser(userData);

            // Store non-sensitive user data in localStorage
            localStorage.setItem('userData', JSON.stringify(userData));

            logger.info('User registered successfully', { userId: userData.id });

        } catch (error) {
            logger.error('Registration failed', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [setAuthToken]);

    /**
     * Set auth state from API result (for social login)
     */
    const setAuthFromResult = useCallback((userData: UserData, tokens: { accessToken: string; refreshToken?: string; expiresAt: number }) => {
        // Store token in-memory
        setAuthToken(tokens.accessToken, tokens.expiresAt);
        setUser(userData);

        // Store minimal user data in localStorage (only essential fields)
        const minimalUserData = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            provider: userData.provider
            // Exclude avatar and other potentially sensitive fields
        };
        localStorage.setItem('userData', JSON.stringify(minimalUserData));

        logger.info('Auth state set from result', { userId: userData.id });
    }, [setAuthToken]);

    /**
     * Logout user
     */
    const logout = useCallback(async () => {
        try {
            setIsLoading(true);

            // Call backend to clear cookie
            const { logoutUser } = await import('@/services/apis/auth.api');
            await logoutUser();

            // Clear in-memory state
            clearAuthToken();
            setUser(null);

            // Clear localStorage
            if (typeof window !== 'undefined') {
                localStorage.removeItem('userData');
                localStorage.removeItem('rc-tokens'); // Legacy cleanup
                localStorage.removeItem('rc-token'); // Legacy cleanup
            }

            logger.info('User logged out successfully');

            // Redirect to login
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }

        } catch (error) {
            logger.error('Logout error', error);
            // Force logout even if API call fails
            clearAuthToken();
            setUser(null);
            if (typeof window !== 'undefined') {
                localStorage.clear();
                window.location.href = '/login';
            }
        } finally {
            setIsLoading(false);
        }
    }, [clearAuthToken]);

    // ========== Initialization ==========

    /**
     * Initialize auth state on mount
     * Check authManager first, then attempt silent refresh using HttpOnly cookie
     */
    useEffect(() => {
        const initAuth = async () => {
            try {
                setIsLoading(true);
                logger.debug('Initializing secure auth context');

                // Listen for auth updates from the manager (for cross-tab or interceptor refreshes)
                const handleAuthUpdate = (event: any) => {
                    const { state, type } = event.detail;
                    logger.debug(`Context: Received auth update event (${type})`);

                    if (state.mode === 'authenticated' && state.accessToken) {
                        setAuthToken(state.accessToken, state.expiresAt || 0);
                        // Load user data from localStorage
                        const userDataStr = localStorage.getItem('userData');
                        if (userDataStr) {
                            try {
                                const userData = JSON.parse(userDataStr);
                                setUser(userData);
                            } catch (e) {
                                logger.warn('Failed to parse stored user data');
                            }
                        }
                    } else if (state.mode === 'none') {
                        clearAuthToken();
                        setUser(null);
                    }
                };

                window.addEventListener('rc-auth-update', handleAuthUpdate);

                // Import authManager - its init() runs on import and handles silent refresh
                const { authManager } = await import('@/lib/auth-manager');

                // Wait for authManager to complete initialization
                const authState = await authManager.init();

                // If we have an authenticated session, ensure user data is loaded
                if (authState.mode === 'authenticated' && authState.accessToken) {
                    setAuthToken(authState.accessToken, authState.expiresAt || 0);

                    // Load user data from localStorage
                    const userDataStr = localStorage.getItem('userData');
                    if (userDataStr) {
                        try {
                            const userData = JSON.parse(userDataStr);
                            setUser(userData);
                            logger.info('Auth state restored from localStorage');
                        } catch (e) {
                            logger.warn('Failed to parse stored user data');
                        }
                    }
                } else if (authState.mode === 'none') {
                    // Check if we just logged out to prevent immediate re-login loop
                    if (typeof window !== 'undefined' && localStorage.getItem('logout_complete')) {
                        logger.debug('Context: Logout detected, skipping initialization');
                        localStorage.removeItem('logout_complete');
                    }
                    setUser(null);
                }

                // Cleanup function
                return () => {
                    if (typeof window !== 'undefined') {
                        window.removeEventListener('rc-auth-update', handleAuthUpdate);
                    }
                };

            } catch (error) {
                logger.error('Auth initialization failed', error);
                setUser(null);
            } finally {
                setIsLoading(false);
                logger.debug('Auth initialization complete');
            }
        };

        const cleanup = initAuth();

        // Cleanup on unmount
        return () => {
            cancelTokenRefresh();
            cleanup?.then(cleanupFn => cleanupFn?.());
        };
    }, [setAuthToken, clearAuthToken]);

    // ========== Context Value ==========

    const value: SecureAuthContextType = {
        accessToken,
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        setAuthFromResult,
        getAccessToken,
        refreshAuth,
    };

    return (
        <SecureAuthContext.Provider value={value}>
            {children}
        </SecureAuthContext.Provider>
    );
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Use secure auth context
 * @throws Error if used outside SecureAuthProvider
 */
export const useSecureAuth = (): SecureAuthContextType => {
    const context = useContext(SecureAuthContext);
    if (context === undefined) {
        throw new Error('useSecureAuth must be used within SecureAuthProvider');
    }
    return context;
};

// ============================================================================
// Internal Token Management (not exposed globally)
// ============================================================================

let internalAccessToken: string | null = null;

/**
 * Get access token for internal API use only
 * @internal
 */
export const getInternalAccessToken = (): string | null => {
    return internalAccessToken;
};

/**
 * Set internal access token
 * @internal
 */
const setInternalAccessToken = (token: string | null): void => {
    internalAccessToken = token;
};
