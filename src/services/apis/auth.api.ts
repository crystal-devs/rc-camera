import axios from "axios"
import { LOGIN_ROUTE, REGISTER_ROUTE, REFRESH_TOKEN_ROUTE, LOGOUT_ROUTE, VERIFY_USER_ROUTE, CSRF_TOKEN_ROUTE, GOOGLE_OAUTH_ROUTE } from "./z.all-routes"
import { setHeader } from "../common/api.fetch";
import { csrfService } from '@/lib/csrf-service';
import logger from '@/lib/logger';
import { getInternalAccessToken } from '@/contexts/SecureAuthContext';

// Create a dedicated axios instance for auth to avoid global interceptors (like in api.fetch.ts)
// interfering with auth flow (especially 401 handling on login/refresh)
const authAxios = axios.create();

// Ensure we still support withCredentials for cookies
authAxios.defaults.withCredentials = true;

export interface UserData {
    id?: string;
    name: string;
    email: string;
    avatar?: string;
    provider: "google" | "email";
    profile_pic?: string;
    phone_number?: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

export interface LoginCredentials {
    email: string;
    password?: string; // Optional for social login
    provider?: "google" | "email";
    googleAccessToken?: string; // For Google OAuth verification
}

export interface RegisterCredentials {
    name: string;
    email: string;
    password?: string; // Optional for social login
    provider?: "google" | "email";
    googleAccessToken?: string; // For Google OAuth verification
}

export const loginUser = async (credentials: LoginCredentials): Promise<{ user: UserData; tokens: AuthTokens }> => {
    try {
        // Get CSRF token first
        const csrfHeaders = await csrfService.getHeaders();

        const { data } = await authAxios.post(LOGIN_ROUTE, credentials, {
            headers: {
                ...setHeader(undefined, "application/json", false),
                ...csrfHeaders
            }
        });

        logger.debug('Login API response received');

        // Check if the response indicates success (status: true)
        if (data.status === true) {
            // Handle both response formats: with data wrapper or direct response
            const responseData = data.data || data;
            const { user, token: accessToken, refreshToken, expiresAt } = responseData;

            // Handle expiresAt format (API returns ISO string, we need timestamp)
            const expiresAtTimestamp = typeof expiresAt === 'string'
                ? new Date(expiresAt).getTime()
                : (typeof expiresAt === 'number' ? expiresAt : Date.now() + 3600000); // Default 1 hour if invalid

            // Return tokens to SecureAuthContext (in-memory storage)
            const tokens: AuthTokens = {
                accessToken,
                refreshToken,
                expiresAt: expiresAtTimestamp
            };

            // Prepare user data (non-sensitive, can be in localStorage)
            const userDataToStore: UserData = {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                provider: (user.provider || 'email') as "google" | "email"
            };

            // Refresh CSRF token after successful login
            await csrfService.refreshToken();
            logger.info('User logged in successfully', { userId: user.id });

            return { user: userDataToStore, tokens };
        }

        // If status is not true, treat it as an error
        logger.warn('Login failed', { message: data.message });
        throw new Error(data.message || "Login failed");
    } catch (err: any) {
        logger.error('Login error', err);
        throw new Error(err.response?.data?.message || "Failed to authenticate user");
    }
}

export const registerUser = async (credentials: RegisterCredentials): Promise<{ user: UserData; tokens: AuthTokens }> => {
    try {
        // Get CSRF token first
        const csrfHeaders = await csrfService.getHeaders();

        const { data } = await authAxios.post(REGISTER_ROUTE, credentials, {
            headers: {
                ...setHeader(undefined, "application/json", false),
                ...csrfHeaders
            }
        });

        logger.debug('Register API response received');

        // Check if the response indicates success (status: true)
        if (data.status === true) {
            // Handle both response formats: with data wrapper or direct response
            const responseData = data.data || data;
            const { user, token: accessToken, refreshToken, expiresAt } = responseData;

            // Handle expiresAt format (API returns ISO string, we need timestamp)
            const expiresAtTimestamp = typeof expiresAt === 'string'
                ? new Date(expiresAt).getTime()
                : (typeof expiresAt === 'number' ? expiresAt : Date.now() + 3600000); // Default 1 hour if invalid

            // Return tokens to SecureAuthContext (in-memory storage)
            const tokens: AuthTokens = {
                accessToken,
                refreshToken,
                expiresAt: expiresAtTimestamp
            };

            // Prepare user data (non-sensitive, can be in localStorage)
            const userDataToStore: UserData = {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                provider: (user.provider || 'email') as "google" | "email"
            };

            // Refresh CSRF token after successful registration
            await csrfService.refreshToken();
            logger.info('User registered successfully', { userId: user.id });

            return { user: userDataToStore, tokens };
        }

        // If status is not true, treat it as an error
        logger.warn('Registration failed', { message: data.message });
        throw new Error(data.message || "Registration failed");
    } catch (err: any) {
        logger.error('Registration error', err);
        throw new Error(err.response?.data?.message || "Failed to register user");
    }
}

export const refreshAccessToken = async (): Promise<AuthTokens | null> => {
    try {
        // Send request with credentials (cookies) and current access token
        // Some APIs require the old access token for refresh validation
        const { data } = await authAxios.post(REFRESH_TOKEN_ROUTE, {}, {
            withCredentials: true,
            headers: {
                'Authorization': `jwt ${getInternalAccessToken() || ''}`
            }
        });

        if (data.status === true && data.token) {
            // API might return ISO string, ensure we have a number
            const apiExpiresAt = data.expiresAt || data.expires_at; // Handle potential casing diffs
            const expiresAtTimestamp = typeof apiExpiresAt === 'string'
                ? new Date(apiExpiresAt).getTime()
                : (typeof apiExpiresAt === 'number' ? apiExpiresAt : Date.now() + 15 * 60 * 1000);

            const newTokens: AuthTokens = {
                accessToken: data.token,
                refreshToken: '', // Opaque/Hidden in cookie
                expiresAt: expiresAtTimestamp
            };

            // Return tokens to SecureAuthContext (in-memory storage)
            // NO localStorage storage for tokens
            return newTokens;
        }

        return null;
    } catch (err) {
        logger.error("Token refresh error", err);
        return null;
    }
}

export const logoutUser = async (): Promise<void> => {
    try {
        await authAxios.post(LOGOUT_ROUTE, {}, {
            headers: setHeader(),
            withCredentials: true // Send cookies
        });
    } catch (err) {
        logger.error("Logout error", err);
    } finally {
        // Clear all stored auth data - explicit cleanup
        localStorage.removeItem("rc-tokens");
        localStorage.removeItem("rc-token");
        localStorage.removeItem("userData");
        localStorage.removeItem("redirectAfterLogin"); // Clear persistence

        // Mark logout as active to prevent immediate silent refresh on redirect
        // This is critical to break the loop where valid cookies restore the session immediately
        localStorage.setItem('logout_complete', 'true');

        sessionStorage.clear();

        try {
            csrfService.clearToken();
        } catch (e) { /* ignore */ }

        // Critical: Use authManager to execute the hard reset and broadcast events
        // This triggers the Providers to clear React Query and Stores
        try {
            const { authManager } = await import('@/lib/auth-manager');
            await authManager.logout();
        } catch (e) {
            console.error('Failed to trigger authManager logout', e);
        }
    }
}

export const initiateGoogleOAuth = (): void => {
    window.location.href = `${GOOGLE_OAUTH_ROUTE}?redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}`;
}

export const handleGoogleOAuthCallback = async (code: string): Promise<{ user: UserData; tokens: AuthTokens }> => {
    try {
        const csrfHeaders = await csrfService.getHeaders();

        const { data } = await authAxios.post(`${GOOGLE_OAUTH_ROUTE}/callback`, {
            code,
            redirectUri: window.location.origin + '/auth/callback'
        }, {
            headers: {
                ...setHeader(undefined, "application/json", false),
                ...csrfHeaders
            }
        });

        if (data.status === true && data.data) {
            const { user, token: accessToken, refreshToken, expiresAt } = data.data;

            const expiresAtTimestamp = typeof expiresAt === 'string'
                ? new Date(expiresAt).getTime()
                : (typeof expiresAt === 'number' ? expiresAt : Date.now() + 3600000); // Default 1 hour if invalid

            // Return tokens to SecureAuthContext (in-memory storage)
            const tokens: AuthTokens = {
                accessToken,
                refreshToken,
                expiresAt: expiresAtTimestamp
            };

            // Prepare user data (non-sensitive, can be in localStorage)
            const userDataToStore: UserData = {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                provider: 'google'
            };

            await csrfService.refreshToken();
            logger.info('Google OAuth successful', { userId: user.id });

            return { user: userDataToStore, tokens };
        }

        throw new Error(data.message || "Google OAuth failed");
    } catch (err: any) {
        logger.error("Google OAuth callback error", err);
        throw new Error(err.response?.data?.message || "Failed to complete Google authentication");
    }
}

export const getUserData = (): UserData | null => {
    try {
        // Get user data from localStorage (non-sensitive data)
        const userDataStr = localStorage.getItem('userData');
        if (!userDataStr) return null;

        const userData = JSON.parse(userDataStr);
        return userData;
    } catch (error) {
        logger.error('Error getting user data', error);
        return null;
    }
};

export const logout = () => {
    logoutUser().catch(err => logger.error("Logout error", err));
}

export const verifyUser = async (): Promise<{ status: boolean; user?: UserData }> => {
    try {
        const { data } = await authAxios.get(VERIFY_USER_ROUTE, {
            headers: {
                ...setHeader(),
                'Authorization': `jwt ${getInternalAccessToken() || ''}`
            }
        });

        if (data.status === true && data.user) {
            return { status: true, user: data.user };
        }
        return { status: false };
    } catch (error) {
        logger.error('Verify user error', error);
        return { status: false };
    }
}

export const verifyUserAndIfNotThenRedirectToLogin = async (router: any) => {
    try {
        const result = await verifyUser();
        if (result.status) return true;

        router.push('/login');
        return false;
    } catch (error) {
        logger.error('Verify user complex error', error);
        router.push('/login');
        return false;
    }
};

// CSRF Token utilities (for backward compatibility)
export const getCsrfToken = async () => {
    try {
        const token = await csrfService.getToken();
        return token;
    } catch (error) {
        logger.error('Failed to get CSRF token', error);
        return null;
    }
};

export const initializeCsrf = async () => {
    try {
        await csrfService.getToken();
        logger.info('CSRF initialized');
    } catch (error) {
        logger.warn('CSRF initialization failed', { error });
    }
};
