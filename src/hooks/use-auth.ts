"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authManager } from '@/lib/auth-manager';
import logger from '@/lib/logger';

export const useAuth = () => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      try {
        await authManager.init();

        if (authManager.isAuthenticated()) {
          const token = authManager.getAuthToken();
          const userId = authManager.getUserId();

          setAuthToken(token);
          setCurrentUserId(userId || '');
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setAuthToken(null);
          setCurrentUserId('');
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [router]);

  return {
    authToken,
    currentUserId,
    isAuthenticated,
    isLoading
  };
};

export const useAuthToken = () => {
  // Initialize with null to prevent SSR/hydration issues
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const tokenRef = useRef<string | null>(null); // Track current token

  // Initialize token after component mounts to avoid hydration mismatch
  useEffect(() => {
    if (isInitialized) return;

    const initToken = async () => {
      try {
        // Initialize auth manager
        await authManager.init();
        const currentToken = authManager.getAuthToken();

        logger.debug('useAuthToken: Initial token check', {
          hasToken: !!currentToken,
          mode: authManager.getCurrentState().mode
        });

        setToken(currentToken);
        tokenRef.current = currentToken; // Store in ref
        setIsInitialized(true);

        // Listen for storage events from other tabs
        const handleStorageChange = (e: StorageEvent) => {
          if (e.key === 'auth_event') {
            logger.debug('useAuthToken: Auth changed in another tab');
            // Re-initialize to get updated token
            authManager.init().then(() => {
              const newToken = authManager.getAuthToken();
              if (newToken !== tokenRef.current) {
                setToken(newToken);
                tokenRef.current = newToken;
              }
            });
          }
        };

        // Poll for auth changes (fallback) - use ref to avoid re-creating interval
        const intervalId = setInterval(async () => {
          try {
            const currentToken = authManager.getAuthToken();
            // Only update if actually changed
            if (currentToken !== tokenRef.current) {
              logger.debug('useAuthToken: Token updated via polling');
              setToken(currentToken);
              tokenRef.current = currentToken;
            }
          } catch (e) {
            logger.error('Error polling for token', e);
          }
        }, 3000);

        // Listen for storage events
        window.addEventListener('storage', handleStorageChange);

        return () => {
          window.removeEventListener('storage', handleStorageChange);
          clearInterval(intervalId);
        };
      } catch (e) {
        logger.error('Error in useAuthToken initialization', e);
        return () => { };
      }
    };

    initToken();
  }, [isInitialized]); // Only depend on isInitialized, not token!

  return token;
};
