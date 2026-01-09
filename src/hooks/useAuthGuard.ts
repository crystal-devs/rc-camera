// hooks/useAuthGuard.ts - Client-side auth protection hook
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthGuardProps } from '@/components/auth/AuthGuard';

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

    const { isAuthenticated, isLoading } = useSecureAuth();
    const router = useRouter();
    const pathname = usePathname();
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
            // Re-check auth would be here if needed
        };

        window.addEventListener('popstate', handlePopState);
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('focus', handleFocus);
        };
    }, [isAuthenticated, requireAuth]);

    useEffect(() => {
        if (!isLoading) {
            const authorized = requireAuth ? isAuthenticated : !isAuthenticated;

            setIsAuthorized(authorized);
            onAuthCheck?.(isAuthenticated);

            if (!authorized) {
                console.log(`🔒 AuthGuard Hook: Redirecting to ${redirectTo} (requireAuth: ${requireAuth}, isAuthenticated: ${isAuthenticated})`);
                router.replace(redirectTo);
            }
        }
    }, [isAuthenticated, isLoading, requireAuth, redirectTo, router, onAuthCheck]);

    return {
        isAuthorized,
        isLoading: isLoading,
        isAuthenticated,
        hasChecked: !isLoading
    };
};