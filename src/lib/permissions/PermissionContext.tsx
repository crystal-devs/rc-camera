// lib/permissions/PermissionContext.tsx - React Context for Permissions
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { PermissionManager, createPermissionManager } from './PermissionManager';
import { UserRole, parseRole } from '@/types/roles';
import { PermissionAction } from '@/constants/permissions';
import { getMyAccess } from '@/services/apis/events.api';
import { logger } from '@/lib/logger/Logger';
import { errorHandler } from '@/lib/errors/ErrorHandler';
import { useAuthToken } from '@/hooks/use-auth';
import { useWebSocketStore } from '@/stores/webSocketStore';

/**
 * Permission context value
 */
interface PermissionContextValue {
    /** Permission manager instance */
    permissionManager: PermissionManager | null;
    /** Loading state */
    isLoading: boolean;
    /** Error state */
    error: Error | null;
    /** Reload permissions from server */
    reloadPermissions: () => Promise<void>;
    /** User role */
    role: UserRole | null;
    /** Event ID  */
    eventId: string | null;
}

/**
 * Permission context
 */
const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

/**
 * Provider props
 */
interface PermissionProviderProps {
    children: ReactNode;
    eventId: string;
    /** Initial role (if known) */
    initialRole?: UserRole;
    /** Initial permission set (if known) */
    initialPermissions?: PermissionAction[];
    /** Skip automatic loading (for manual control) */
    skipAutoLoad?: boolean;
}

/**
 * Permission Provider Component
 * Manages permission state for an event
 */
export function PermissionProvider({
    children,
    eventId,
    initialRole,
    initialPermissions,
    skipAutoLoad = false,
}: PermissionProviderProps) {
    const [permissionManager, setPermissionManager] = useState<PermissionManager | null>(() => {
        // Initialize with initial values if provided
        if (initialRole) {
            return createPermissionManager(initialRole, initialPermissions);
        }
        return null;
    });
    const [isLoading, setIsLoading] = useState(!initialRole && !skipAutoLoad);
    const [error, setError] = useState<Error | null>(null);
    const [role, setRole] = useState<UserRole | null>(initialRole || null);

    const token = useAuthToken();
    const webSocketStore = useWebSocketStore();

    /**
     * Fetch permissions from API
     */
    const fetchPermissions = useCallback(async () => {
        if (!eventId) {
            logger.warn('Cannot fetch permissions without eventId');
            return;
        }

        if (!token) {
            logger.debug('Deferring permission fetch until auth token is available', { eventId });
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            logger.debug('Fetching permissions', { eventId });

            // Server-computed role + permission set — the single source of
            // truth, resolved by the same policy the API enforces.
            const access = await getMyAccess(eventId, token);

            const userRole = parseRole(access.role);
            const manager = PermissionManager.fromAPI(access);

            setPermissionManager(manager);
            setRole(userRole);

            logger.info('Permissions loaded successfully', {
                eventId,
                role: userRole,
                allowedCount: manager.getAllowedActions().length,
            });
        } catch (err) {
            logger.error('Failed to load permissions', { eventId }, err as Error);
            setError(err as Error);
            errorHandler.handle(err, {
                context: { eventId, component: 'PermissionProvider' },
                showToast: true,
                userMessage: 'Failed to load permissions. Some features may be unavailable.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [eventId, token]);

    /**
     * Handle permission updates from WebSocket
     */
    useEffect(() => {
        const socket = webSocketStore.socket;
        if (!socket || !eventId) return;

        const handlePermissionUpdate = (data: { eventId: string; userId?: string }) => {
            // Only update if it's for this event
            if (data.eventId !== eventId) return;

            logger.info('Permission update received via WebSocket — refetching', {
                eventId: data.eventId,
            });

            // Re-resolve from the server rather than trusting the socket payload
            fetchPermissions();

            errorHandler.handle(new Error('Permissions updated'), {
                showToast: true,
                log: false,
                report: false,
                userMessage: 'Your permissions have been updated.',
            });
        };

        socket.on('permission_updated', handlePermissionUpdate);
        socket.on('permissions_updated', handlePermissionUpdate); // Handle both event names

        return () => {
            socket.off('permission_updated', handlePermissionUpdate);
            socket.off('permissions_updated', handlePermissionUpdate);
        };
    }, [webSocketStore.socket, eventId, fetchPermissions]);

    /**
     * Load permissions on mount
     */
    useEffect(() => {
        if (!skipAutoLoad && !permissionManager && eventId) {
            fetchPermissions();
        }
    }, [skipAutoLoad, permissionManager, eventId, fetchPermissions]);

    /**
     * Reload permissions (public API)
     */
    const reloadPermissions = useCallback(async () => {
        await fetchPermissions();
    }, [fetchPermissions]);

    const value: PermissionContextValue = {
        permissionManager,
        isLoading,
        error,
        reloadPermissions,
        role,
        eventId,
    };

    return (
        <PermissionContext.Provider value={value}>
            {children}
        </PermissionContext.Provider>
    );
}

/**
 * Hook to access permission context
 */
export function usePermissionContext(): PermissionContextValue {
    const context = useContext(PermissionContext);

    if (context === undefined) {
        throw new Error('usePermissionContext must be used within PermissionProvider');
    }

    return context;
}

/**
 * HOC to wrap components with PermissionProvider
 */
export function withPermissions<P extends object>(
    Component: React.ComponentType<P>,
    eventIdExtractor: (props: P) => string
) {
    return function WithPermissionsWrapper(props: P) {
        const eventId = eventIdExtractor(props);

        return (
            <PermissionProvider eventId={eventId}>
                <Component {...props} />
            </PermissionProvider>
        );
    };
}
