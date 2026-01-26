"use client";
import { useSecureAuth } from '@/contexts/SecureAuthContext';

/**
 * Legacy hook for auth state - Refactored to use SecureAuthContext
 * @deprecated Use useSecureAuth() directly instead
 */
export const useAuth = () => {
  const { getAccessToken, user, isAuthenticated, isLoading } = useSecureAuth();

  return {
    authToken: getAccessToken(),
    currentUserId: user?.id || '',
    isAuthenticated,
    isLoading
  };
};

/**
 * Legacy hook for token - Refactored to use SecureAuthContext
 * @deprecated Use useSecureAuth() directly instead
 */
export const useAuthToken = () => {
  const { getAccessToken } = useSecureAuth();
  return getAccessToken();
};

