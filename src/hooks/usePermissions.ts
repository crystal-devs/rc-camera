// hooks/usePermissions.ts - Permission Hooks for Components
'use client';

import { useCallback, useMemo } from 'react';
import { usePermissionContext } from '@/lib/permissions/PermissionContext';
import { PermissionAction } from '@/constants/permissions';
import { PermissionManager } from '@/lib/permissions/PermissionManager';
import { UserRole } from '@/types/roles';
import { PermissionError } from '@/lib/errors/PermissionError';
import { logger } from '@/lib/logger/Logger';

/**
 * Main hook to access permission manager
 * @returns Permission manager instance and loading state
 */
export function usePermissions() {
    const { permissionManager, isLoading, error, reloadPermissions, role, eventId } = usePermissionContext();

    return {
        permissionManager,
        isLoading,
        error,
        reloadPermissions,
        role,
        eventId,
    };
}

/**
 * Hook to check if user has a specific permission
 * @param action - Permission action to check
 * @param options - Configuration options
 * @returns Boolean indicating if user has permission
 */
export function usePermissionCheck(
    action: PermissionAction,
    options: {
        /** Fallback value while loading */
        loadingFallback?: boolean;
        /** Log check results */
        logChecks?: boolean;
    } = {}
): {
    allowed: boolean;
    isLoading: boolean;
    permissionManager: PermissionManager | null;
} {
    const { permissionManager, isLoading } = usePermissionContext();
    const { loadingFallback = false, logChecks = false } = options;

    const allowed = useMemo(() => {
        if (isLoading) return loadingFallback;
        if (!permissionManager) return false;

        const result = permissionManager.can(action);

        if (logChecks) {
            logger.debug('Permission check', {
                action,
                allowed: result,
                role: permissionManager.getRole(),
            });
        }

        return result;
    }, [permissionManager, action, isLoading, loadingFallback, logChecks]);

    return {
        allowed,
        isLoading,
        permissionManager,
    };
}

/**
 * Hook that throws an error if permission is not granted
 * Useful for guarding components/routes
 * @param action - Required permission action
 * @param errorMessage - Custom error message
 */
export function useRequirePermission(
    action: PermissionAction,
    errorMessage?: string
): void {
    const { permissionManager, isLoading } = usePermissionContext();

    if (isLoading) return;

    if (!permissionManager) {
        throw new Error('Permission manager not initialized');
    }

    if (!permissionManager.can(action)) {
        throw PermissionError.denied(action, {
            userRole: permissionManager.getRole(),
            action,
        });
    }
}

/**
 * Hook for permission-based conditional rendering
 * @param action - Permission action to check
 * @returns Object with permission check results and helper functions
 */
export function usePermissionGate(action: PermissionAction) {
    const { allowed, isLoading, permissionManager } = usePermissionCheck(action);

    const renderIfAllowed = useCallback(
        (content: React.ReactNode, fallback?: React.ReactNode) => {
            if (isLoading) return fallback || null;
            return allowed ? content : (fallback || null);
        },
        [allowed, isLoading]
    );

    const renderIfDenied = useCallback(
        (content: React.ReactNode) => {
            if (isLoading) return null;
            return !allowed ? content : null;
        },
        [allowed, isLoading]
    );

    return {
        allowed,
        denied: !allowed && !isLoading,
        isLoading,
        permissionManager,
        renderIfAllowed,
        renderIfDenied,
    };
}

/**
 * Hook to check multiple permissions at once and
 * @param actions - Array of permissions to check
 * @param logic - 'AND' (all required) or 'OR' (at least one required)
 * @returns Object with combined permission check results
 */
export function useMultiplePermissions(
    actions: PermissionAction[],
    logic: 'AND' | 'OR' = 'AND'
) {
    const { permissionManager, isLoading } = usePermissionContext();

    const result = useMemo(() => {
        if (isLoading || !permissionManager) {
            return {
                allowed: false,
                isLoading: true,
                deniedActions: [],
                allowedActions: [],
            };
        }

        const allowedActions = actions.filter((action) => permissionManager.can(action));
        const deniedActions = actions.filter((action) => !permissionManager.can(action));

        const allowed = logic === 'AND'
            ? allowedActions.length === actions.length
            : allowedActions.length > 0;

        return {
            allowed,
            isLoading: false,
            allowedActions,
            deniedActions,
        };
    }, [permissionManager, actions, logic, isLoading]);

    return result;
}

/**
 * Hook to check if user has minimum role level
 * @param minimumRole - Minimum required role
 * @returns Boolean indicating if user meets role requirement
 */
export function useRoleCheck(minimumRole: UserRole): {
    hasRole: boolean;
    currentRole: UserRole | null;
    isLoading: boolean;
} {
    const { permissionManager, isLoading, role } = usePermissionContext();

    const hasRole = useMemo(() => {
        if (isLoading || !permissionManager) return false;
        return permissionManager.hasMinimumRole(minimumRole);
    }, [permissionManager, minimumRole, isLoading]);

    return {
        hasRole,
        currentRole: role,
        isLoading,
    };
}

/**
 * Hook to get all allowed actions for current user
 * @returns Array of allowed permission actions
 */
export function useAllowedActions(): {
    allowedActions: PermissionAction[];
    deniedActions: PermissionAction[];
    isLoading: boolean;
} {
    const { permissionManager, isLoading } = usePermissionContext();

    const result = useMemo(() => {
        if (isLoading || !permissionManager) {
            return {
                allowedActions: [],
                deniedActions: [],
                isLoading: true,
            };
        }

        return {
            allowedActions: permissionManager.getAllowedActions(),
            deniedActions: permissionManager.getDeniedActions(),
            isLoading: false,
        };
    }, [permissionManager, isLoading]);

    return result;
}

/**
 * Hook for permission-based button disable state
 * @param action - Permission action required for button
 * @param additionalDisabled - Additional disabled condition
 * @returns Disabled state and tooltip message
 */
export function usePermissionDisabled(
    action: PermissionAction,
    additionalDisabled: boolean = false
): {
    disabled: boolean;
    tooltip?: string;
} {
    const { allowed, isLoading } = usePermissionCheck(action);

    return useMemo(() => {
        if (isLoading) {
            return {
                disabled: true,
                tooltip: 'Loading permissions...',
            };
        }

        if (!allowed) {
            return {
                disabled: true,
                tooltip: `You don't have permission to ${action.replace(/_/g, ' ').toLowerCase()}`,
            };
        }

        if (additionalDisabled) {
            return {
                disabled: true,
            };
        }

        return {
            disabled: false,
        };
    }, [allowed, isLoading, additionalDisabled, action]);
}

/**
 * Hook to execute action with permission check
 * @param action - Permission action required
 * @param callback - Function to execute if permitted
 * @param onDenied - Optional callback when permission is denied
 * @returns Wrapped function that checks permission before executing
 */
export function usePermissionAction<T extends (...args: any[]) => any>(
    action: PermissionAction,
    callback: T,
    options: {
        onDenied?: () => void;
        throwOnDenied?: boolean;
    } = {}
): T {
    const { permissionManager } = usePermissionContext();
    const { onDenied, throwOnDenied = false } = options;

    return useCallback(
        ((...args: Parameters<T>) => {
            if (!permissionManager) {
                logger.warn('Permission manager not available');
                if (throwOnDenied) {
                    throw new Error('Permission manager not initialized');
                }
                onDenied?.();
                return;
            }

            if (!permissionManager.can(action)) {
                logger.warn('Permission denied for action', { action });

                if (throwOnDenied) {
                    throw PermissionError.denied(action, {
                        userRole: permissionManager.getRole(),
                        action,
                    });
                }

                onDenied?.();
                return;
            }

            return callback(...args);
        }) as T,
        [permissionManager, action, callback, onDenied, throwOnDenied]
    );
}

/**
 * Hook for optimistic permission checking (doesn't wait for loading)
 * Useful for UI that should show by default and hide only if explicitly denied
 * @param action - Permission action to check
 * @returns Boolean indicating if permission is explicitly denied
 */
export function useIsExplicitlyDenied(action: PermissionAction): boolean {
    const { permissionManager, isLoading } = usePermissionContext();

    return useMemo(() => {
        // While loading, assume allowed (optimistic)
        if (isLoading || !permissionManager) return false;

        // Only return true if we know for sure permission is denied
        return !permissionManager.can(action);
    }, [permissionManager, action, isLoading]);
}
