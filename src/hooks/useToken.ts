/**
 * Migration Helper Hook
 * 
 * Provides backward-compatible access to tokens during migration
 * Use this to quickly update components, then migrate to useSecureAuth
 */

import { useSecureAuth } from '@/contexts/SecureAuthContext';

/**
 * Get access token (backward-compatible)
 * 
 * @example
 * // Quick migration from localStorage
 * const token = useToken(); // Instead of localStorage.getItem('rc-token')
 * 
 * @example
 * // Better: Use useSecureAuth directly
 * const { getAccessToken, user, isAuthenticated } = useSecureAuth();
 * const token = getAccessToken();
 */
export const useToken = (): string | null => {
    const { getAccessToken } = useSecureAuth();
    return getAccessToken();
};

/**
 * Get user data (backward-compatible)
 */
export const useUser = () => {
    const { user, isAuthenticated, isLoading } = useSecureAuth();
    return { user, isAuthenticated, isLoading };
};

/**
 * Get auth actions (backward-compatible)
 */
export const useAuthActions = () => {
    const { login, register, logout } = useSecureAuth();
    return { login, register, logout };
};
