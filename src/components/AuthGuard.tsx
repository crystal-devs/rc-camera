// components/AuthGuard.tsx - Production-ready route protection
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSecureAuth } from '@/contexts/SecureAuthContext';

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
  const { isAuthenticated, isLoading, user } = useSecureAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Prevent browser back button navigation after logout
    const handleBeforeUnload = () => {
      // Clear any cached auth state on page unload
      if (!isAuthenticated) {
        sessionStorage.setItem('auth_invalidated', 'true');
      }
    };

    const handleFocus = () => {
      // Re-check auth would be handled by a manual refresh call if needed
      // For now, we rely on the context's auto-refresh
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
      // If page is restored from bfcache, you might want to re-check
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
  }, [isAuthenticated, requireAuth, redirectTo]);

  useEffect(() => {
    // ONLY redirect if we are NOT loading and the auth state is definitive
    if (!isLoading && !isRedirecting) {
      if (requireAuth && !isAuthenticated) {
        console.log('🔒 AuthGuard: Redirecting to login - user not authenticated');
        setIsRedirecting(true);

        // Save current path for redirect after login
        if (typeof window !== 'undefined' && pathname !== '/login') {
          localStorage.setItem('redirectAfterLogin', pathname);
        }

        // Use router.push for client-side navigation if possible, fallback to window.location
        router.push(redirectTo);
      } else if (!requireAuth && isAuthenticated) {
        // If on auth page but already authenticated, redirect to dashboard/events
        if (pathname === '/login' || pathname === '/register') {
          console.log('🔄 AuthGuard: User authenticated on auth page, redirecting to home');
          setIsRedirecting(true);
          router.push('/events');
        }
      }
    }
  }, [isAuthenticated, isLoading, requireAuth, redirectTo, pathname, isRedirecting, router]);

  // Show loading state
  if (isLoading) {
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