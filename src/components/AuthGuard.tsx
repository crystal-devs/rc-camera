// components/AuthGuard.tsx - Production-ready route protection
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authManager } from '@/lib/auth-manager';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function AuthGuard({
  children,
  requireAuth = true,
  redirectTo = '/login',
  fallback
}: AuthGuardProps) {
  const { isAuthenticated, isLoading, checkAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasChecked, setHasChecked] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Prevent browser back button navigation after logout
    const handleBeforeUnload = () => {
      // Clear any cached auth state on page unload
      if (!authManager.isAuthenticated()) {
        sessionStorage.setItem('auth_invalidated', 'true');
      }
    };

    const handleFocus = () => {
      // Check auth when user returns to tab
      const authInvalidated = sessionStorage.getItem('auth_invalidated');
      if (authInvalidated === 'true') {
        sessionStorage.removeItem('auth_invalidated');
        checkAuth();
      }
    };

    // Prevent back navigation if auth is invalidated
    const handlePopState = (event: PopStateEvent) => {
      const authInvalidated = sessionStorage.getItem('auth_invalidated');
      if (authInvalidated === 'true' && requireAuth) {
        event.preventDefault();
        // Force redirect to login
        window.location.href = redirectTo;
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      // If page is restored from bfcache, we must re-check auth
      if (event.persisted) {
        checkAuth();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [checkAuth, requireAuth, redirectTo]);

  useEffect(() => {
    const performAuthCheck = async () => {
      if (hasChecked) return;

      try {
        await checkAuth();
        setHasChecked(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        setHasChecked(true);
      }
    };

    performAuthCheck();
  }, [checkAuth, hasChecked]);

  useEffect(() => {
    if (hasChecked && !isLoading && !isRedirecting) {
      if (requireAuth && !isAuthenticated) {
        console.log('🔒 Redirecting to login - user not authenticated');
        setIsRedirecting(true);
        // Use window.location.href for hard redirect to prevent infinite loops
        window.location.href = redirectTo;
      } else if (!requireAuth && isAuthenticated) {
        // If on auth page but already authenticated, redirect to dashboard
        if (pathname === '/login' || pathname === '/register') {
          console.log('🔄 User authenticated on auth page, redirecting to home');
          setIsRedirecting(true);
          window.location.href = '/';
        }
      }
    }
  }, [isAuthenticated, isLoading, hasChecked, requireAuth, redirectTo, pathname, isRedirecting]);

  // Show loading state
  if (isLoading || !hasChecked) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If auth is required but user is not authenticated, don't render children
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

// Higher-order component for protecting entire pages
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<AuthGuardProps, 'children'> = {}
) {
  return function ProtectedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}