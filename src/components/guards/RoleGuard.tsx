// components/guards/RoleGuard.tsx - Route-Level Role Guard
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { UserRole } from '@/types/roles';
import { usePermissions } from '@/hooks/usePermissions';
import { useIsGuest } from '@/hooks/useGuestSession';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger/Logger';

interface RoleGuardProps {
    children: React.ReactNode;
    /** Allowed roles for this route */
    allowedRoles: UserRole[];
    /** Redirect path for unauthorized access */
    redirectTo?: string;
    /** Fallback UI while checking */
    fallback?: React.ReactNode;
}

/**
 * Route Guard Component
 * Restricts access to routes based on user role
 * 
 * @example
 * // Only allow creators and co-hosts
 * <RoleGuard allowedRoles={[UserRole.CREATOR, UserRole.CO_HOST]}>
 *   <AdminPanel />
 * </RoleGuard>
 * 
 * @example
 * // Only allow guests
 * <RoleGuard allowedRoles={[UserRole.GUEST]} redirectTo="/login">
 *   <GuestView />
 * </RoleGuard>
 */
export function RoleGuard({
    children,
    allowedRoles,
    redirectTo,
    fallback,
}: RoleGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { role: currentRole, isLoading } = usePermissions();
    const { isGuest } = useIsGuest();

    useEffect(() => {
        if (isLoading) return;

        // Check if user has any of the allowed roles
        const hasAccess = currentRole ? allowedRoles.includes(currentRole) : false;

        if (!hasAccess) {
            logger.warn('Route access denied', {
                pathname,
                currentRole,
                allowedRoles,
                isGuest,
            });

            // Determine redirect path
            let redirectPath = redirectTo || '/';

            // If user is a guest trying to access admin routes, redirect to guest view
            if (isGuest && !allowedRoles.includes(UserRole.GUEST)) {
                redirectPath = '/guest'; // Or wherever your guest view is
            }

            // If user is NOT a guest trying to access guest-only routes, redirect to login
            if (!isGuest && allowedRoles.length === 1 && allowedRoles[0] === UserRole.GUEST) {
                redirectPath = '/login';
            }

            router.replace(redirectPath);
        }
    }, [isLoading, currentRole, allowedRoles, pathname, redirectTo, isGuest, router]);

    // Show loading fallback
    if (isLoading) {
        return <>{fallback || <Skeleton className="h-screen w-full" />}</>;
    }

    // Check if user has access (for render decision)
    const hasAccess = currentRole ? allowedRoles.includes(currentRole) : false;

    // Don't render if no access (redirect will happen in useEffect)
    if (!hasAccess) {
        return null;
    }

    return <>{children}</>;
}

/**
 * Guest-Only Guard
 * Restricts access to guest users only
 * Redirects authenticated users away from guest screens
 */
export function GuestOnlyGuard({
    children,
    redirectTo = '/',
}: {
    children: React.ReactNode;
    redirectTo?: string;
}) {
    return (
        <RoleGuard allowedRoles={[UserRole.GUEST]} redirectTo={redirectTo}>
            {children}
        </RoleGuard>
    );
}

/**
 * Admin Guard (Creators and Co-Hosts only)
 * Prevents guests from accessing admin/management screens
 */
export function AdminGuard({
    children,
    redirectTo,
}: {
    children: React.ReactNode;
    redirectTo?: string;
}) {
    return (
        <RoleGuard
            allowedRoles={[UserRole.CREATOR, UserRole.CO_HOST]}
            redirectTo={redirectTo}
        >
            {children}
        </RoleGuard>
    );
}

/**
 * Creator-Only Guard
 * Restricts access to event creators only
 */
export function CreatorOnlyGuard({
    children,
    redirectTo,
}: {
    children: React.ReactNode;
    redirectTo?: string;
}) {
    return (
        <RoleGuard allowedRoles={[UserRole.CREATOR]} redirectTo={redirectTo}>
            {children}
        </RoleGuard>
    );
}
