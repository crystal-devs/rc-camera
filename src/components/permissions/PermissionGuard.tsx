// components/permissions/PermissionGuard.tsx - Permission Guard Component
'use client';

import React, { ReactNode } from 'react';
import { PermissionAction } from '@/constants/permissions';
import { usePermissionCheck, useMultiplePermissions } from '@/hooks/usePermissions';
import { PermissionDeniedInline } from '@/components/errors/PermissionDenied';
import { Skeleton } from '@/components/ui/skeleton';

interface PermissionGuardProps {
    /** Required permission action(s) */
    requires: PermissionAction | PermissionAction[];
    /** Logic for multiple permissions: 'AND' (all required) or 'OR' (at least one) */
    logic?: 'AND' | 'OR';
    /** Content to render if permission granted */
    children: ReactNode;
    /** Fallback UI if permission denied */
    fallback?: ReactNode;
    /** Loading fallback */
    loadingFallback?: ReactNode;
    /** Show default denial message */
    showDenialMessage?: boolean;
    /** Custom denial message */
    denialMessage?: string;
}

/**
 * Permission Guard Component
 * Conditionally renders children based on permission check
 */
export function PermissionGuard({
    requires,
    logic = 'AND',
    children,
    fallback,
    loadingFallback,
    showDenialMessage = true,
    denialMessage,
}: PermissionGuardProps) {
    const isSinglePermission = !Array.isArray(requires);

    // Single permission check
    const singleCheck = usePermissionCheck(
        isSinglePermission ? requires : PermissionAction.VIEW_EVENT,
        { loadingFallback: false }
    );

    // Multiple permissions check
    const multiCheck = useMultiplePermissions(
        Array.isArray(requires) ? requires : [requires],
        logic
    );

    const { allowed, isLoading } = isSinglePermission ? singleCheck : multiCheck;

    // Loading state
    if (isLoading) {
        return <>{loadingFallback || <Skeleton className="h-20 w-full" />}</>;
    }

    // Permission granted
    if (allowed) {
        return <>{children}</>;
    }

    // Permission denied - show fallback or default message
    if (fallback) {
        return <>{fallback}</>;
    }

    if (showDenialMessage) {
        return <PermissionDeniedInline message={denialMessage} />;
    }

    // Don't render anything
    return null;
}

/**
 * Inline Permission Check Component
 * For inline conditional rendering without full guard UI
 */
export function If({
    can,
    children,
    fallback,
}: {
    can: PermissionAction;
    children: ReactNode;
    fallback?: ReactNode;
}) {
    const { allowed, isLoading } = usePermissionCheck(can);

    if (isLoading) return null;

    return <>{allowed ? children : fallback}</>;
}

/**
 * Unless Permission Component
 * Renders children unless user has permission (inverse of If)
 */
export function Unless({
    can,
    children,
}: {
    can: PermissionAction;
    children: ReactNode;
}) {
    const { allowed, isLoading } = usePermissionCheck(can);

    if (isLoading) return null;

    return <>{!allowed ? children : null}</>;
}
