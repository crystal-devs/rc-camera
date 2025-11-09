// hooks/useAuthGuard.ts - Client-side auth protection hook
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface UseAuthGuardOptions {
    requireAuth?: boolean;
    redirectTo?: string;
    onAuthCheck?: (isAuthenticated: boolean) => void;
}

export const useAuthGuard = (options: UseAuthGuardOptions = {}) => {
    const {
        requireAuth = true,
        redirectTo = '/login',
        onAuthCheck
    } = options;

    const { isAuthenticated, isLoading, checkAuth } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [hasChecked, setHasChecked] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        // Prevent browser back button navigation after logout
        const handlePopState = (event: PopStateEvent) => {
            const authInvalidated = sessionStorage.getItem('auth_invalidated');
            if (authInvalidated === 'true' && requireAuth) {
                // Prevent the back navigation
                event.preventDefault();
                // Redirect to login instead
                window.location.href = '/login';
            }
        };

        // Listen for browser navigation events
        const handleBeforeUnload = () => {
            if (!isAuthenticated && requireAuth) {
                sessionStorage.setItem('auth_invalidated', 'true');
            }
        };

        const handleFocus = () => {
            // Re-check auth when user returns to tab
            const authInvalidated = sessionStorage.getItem('auth_invalidated');
            if (authInvalidated === 'true') {
                sessionStorage.removeItem('auth_invalidated');
                checkAuth();
            }
        };

        window.addEventListener('popstate', handlePopState);
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('focus', handleFocus);
        };
    }, [isAuthenticated, requireAuth, checkAuth]);

    useEffect(() => {
        const performAuthCheck = async () => {
            if (hasChecked) return;

            try {
                await checkAuth();
                setHasChecked(true);
            } catch (error) {
                console.error('Auth guard check failed:', error);
                setHasChecked(true);
            }
        };

        performAuthCheck();
    }, [checkAuth, hasChecked]);

    useEffect(() => {
        if (hasChecked && !isLoading) {
            const authorized = requireAuth ? isAuthenticated : !isAuthenticated;

            setIsAuthorized(authorized);
            onAuthCheck?.(isAuthenticated);

            if (!authorized) {
                console.log(`🔒 Auth guard redirecting to ${redirectTo} (requireAuth: ${requireAuth}, isAuthenticated: ${isAuthenticated})`);
                router.replace(redirectTo);
            }
        }
    }, [isAuthenticated, isLoading, hasChecked, requireAuth, redirectTo, router, onAuthCheck]);

    return {
        isAuthorized,
        isLoading: isLoading || !hasChecked,
        isAuthenticated,
        hasChecked
    };
};