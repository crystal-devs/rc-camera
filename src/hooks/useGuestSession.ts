// hooks/useGuestSession.ts - Guest Session Hooks
'use client';

import { useCallback, useMemo } from 'react';
import { useGuestContext } from '@/lib/guest/GuestContext';
import { GuestSession, GuestIdentity, GuestSessionStatus } from '@/types/guest';
import { logger } from '@/lib/logger/Logger';

/**
 * Main hook to access guest session
 */
export function useGuestSession() {
    const {
        session,
        isLoading,
        error,
        isGuest,
        initializeSession,
        updateActivity,
        invalidateSession,
        getIdentity,
    } = useGuestContext();

    return {
        session,
        isLoading,
        error,
        isGuest,
        initializeSession,
        updateActivity,
        invalidateSession,
        getIdentity,
    };
}

/**
 * Hook to get guest identity for API calls
 */
export function useGuestIdentity(): GuestIdentity | null {
    const { getIdentity } = useGuestContext();
    return useMemo(() => getIdentity(), [getIdentity]);
}

/**
 * Hook to check if current user is a guest
 */
export function useIsGuest(): {
    isGuest: boolean;
    isAuthenticated: boolean;
    isLoading: boolean;
} {
    const { isGuest, isLoading } = useGuestContext();

    // Check if user is authenticated (has auth token)
    const hasAuthToken = typeof window !== 'undefined' && !!localStorage.getItem('rc-token');

    return {
        isGuest,
        isAuthenticated: hasAuthToken,
        isLoading,
    };
}

/**
 * Hook for guest session expiration warnings
 */
export function useSessionExpiration(): {
    isExpiringSoon: boolean;
    timeRemaining: number | null;
    expiresAt: Date | null;
} {
    const { session } = useGuestContext();

    return useMemo(() => {
        if (!session || session.status !== GuestSessionStatus.ACTIVE) {
            return {
                isExpiringSoon: false,
                timeRemaining: null,
                expiresAt: null,
            };
        }

        const now = Date.now();
        const expiresAt = session.expiresAt;
        const timeRemaining = expiresAt.getTime() - now;

        // Warn if less than 24 hours remaining
        const isExpiringSoon = timeRemaining < 24 * 60 * 60 * 1000;

        return {
            isExpiringSoon,
            timeRemaining,
            expiresAt,
        };
    }, [session]);
}

/**
 * Hook to ensure guest session for event
 * Automatically initializes session if not present
 */
export function useEnsureGuestSession(
    eventId: string,
    guestName?: string
): {
    session: GuestSession | null;
    isReady: boolean;
    isLoading: boolean;
    error: Error | null;
} {
    const { session, isLoading, error, initializeSession } = useGuestContext();

    // Initialize session if needed
    useMemo(() => {
        if (!isLoading && !session && eventId) {
            initializeSession(eventId, guestName).catch((err) => {
                logger.error('Failed to ensure guest session', { eventId }, err);
            });
        }
    }, [session, isLoading, eventId, guestName, initializeSession]);

    return {
        session,
        isReady: !!session && session.status === GuestSessionStatus.ACTIVE,
        isLoading,
        error,
    };
}

/**
 * Hook for guest session info display
 */
export function useGuestSessionInfo() {
    const { session } = useGuestContext();

    return useMemo(() => {
        if (!session) {
            return {
                hasSession: false,
                guestName: null,
                sessionAge: null,
                isActive: false,
            };
        }

        const sessionAge = Date.now() - session.createdAt.getTime();

        return {
            hasSession: true,
            guestName: session.guestName || 'Guest',
            sessionAge,
            isActive: session.status === GuestSessionStatus.ACTIVE,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            lastActivityAt: session.lastActivityAt,
        };
    }, [session]);
}

/**
 * Hook to manually update session activity
 * Useful for long-running operations
 */
export function useUpdateSessionActivity() {
    const { updateActivity } = useGuestContext();

    return useCallback(() => {
        updateActivity();
        logger.debug('Session activity updated manually');
    }, [updateActivity]);
}

/**
 * Hook for guest session actions
 */
export function useGuestSessionActions() {
    const { initializeSession, invalidateSession } = useGuestContext();

    const createSession = useCallback(async (eventId: string, guestName?: string) => {
        logger.info('Creating new guest session', { eventId, guestName });
        return initializeSession(eventId, guestName);
    }, [initializeSession]);

    const endSession = useCallback(() => {
        logger.info('Ending guest session');
        invalidateSession();
    }, [invalidateSession]);

    return {
        createSession,
        endSession,
    };
}
