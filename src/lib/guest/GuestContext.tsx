// lib/guest/GuestContext.tsx - React Context for Guest Sessions
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { guestSessionManager } from './GuestSessionManager';
import { GuestSession, GuestSessionStatus, GuestIdentity } from '@/types/guest';
import { logger } from '@/lib/logger/Logger';
import { errorHandler } from '@/lib/errors/ErrorHandler';
import { GuestSessionError } from '@/lib/errors/GuestSessionError';

/**
 * Guest context value
 */
interface GuestContextValue {
    /** Current guest session */
    session: GuestSession | null;
    /** Is session loading */
    isLoading: boolean;
    /** Session error */
    error: Error | null;
    /** Is user a guest (has active session) */
    isGuest: boolean;
    /** Create or get session for event */
    initializeSession: (eventId: string, guestName?: string) => Promise<GuestSession | null>;
    /** Update session activity */
    updateActivity: () => void;
    /** Invalidate current session */
    invalidateSession: () => void;
    /** Get guest identity for API calls */
    getIdentity: () => GuestIdentity | null;
}

/**
 * Guest context
 */
const GuestContext = createContext<GuestContextValue | undefined>(undefined);

/**
 * Provider props
 */
interface GuestProviderProps {
    children: ReactNode;
    /** Event ID to auto-initialize session for */
    eventId?: string;
    /** Auto-initialize session on mount */
    autoInitialize?: boolean;
}

/**
 * Guest Provider Component
 * Manages guest session state
 */
export function GuestProvider({
    children,
    eventId,
    autoInitialize = false,
}: GuestProviderProps) {
    const [session, setSession] = useState<GuestSession | null>(null);
    const [isLoading, setIsLoading] = useState(autoInitialize);
    const [error, setError] = useState<Error | null>(null);

    /**
     * Initialize session for event
     */
    const initializeSession = useCallback(async (
        targetEventId: string,
        guestName?: string
    ): Promise<GuestSession | null> => {
        setIsLoading(true);
        setError(null);

        try {
            logger.debug('Initializing guest session', { eventId: targetEventId, guestName });

            const newSession = await guestSessionManager.getOrCreateSession(targetEventId, guestName);

            // Validate the session
            const validation = guestSessionManager.validateSession(newSession.id);

            if (!validation.valid) {
                throw GuestSessionError.invalid(newSession.id, {
                    eventId: targetEventId,
                });
            }

            setSession(newSession);

            logger.info('Guest session initialized', {
                sessionId: newSession.id,
                eventId: targetEventId,
                expiresAt: newSession.expiresAt.toISOString(),
            });

            return newSession;
        } catch (err) {
            logger.error('Failed to initialize guest session', { eventId: targetEventId }, err as Error);
            setError(err as Error);
            errorHandler.handleGuestSessionError(err as GuestSessionError, {
                showToast: true,
            });
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Update session activity
     */
    const updateActivity = useCallback(() => {
        if (!session) return;

        try {
            guestSessionManager.updateActivity(session.id);

            // Update local state with latest session
            const updatedSession = guestSessionManager.getSession(session.id);
            if (updatedSession) {
                setSession(updatedSession);
            }
        } catch (err) {
            logger.error('Failed to update session activity', { sessionId: session.id }, err as Error);
        }
    }, [session]);

    /**
     * Invalidate current session
     */
    const invalidateSession = useCallback(() => {
        if (!session) return;

        try {
            guestSessionManager.invalidateSession(session.id);
            setSession(null);

            logger.info('Guest session invalidated', { sessionId: session.id });
        } catch (err) {
            logger.error('Failed to invalidate session', { sessionId: session.id }, err as Error);
        }
    }, [session]);

    /**
     * Get guest identity for API calls
     */
    const getIdentity = useCallback((): GuestIdentity | null => {
        if (!session) return null;
        return guestSessionManager.getGuestIdentity(session.id);
    }, [session]);

    /**
     * Auto-initialize session on mount
     */
    useEffect(() => {
        if (autoInitialize && eventId && !session) {
            initializeSession(eventId);
        }
    }, [autoInitialize, eventId, session, initializeSession]);

    /**
     * Set up activity tracking
     */
    useEffect(() => {
        if (!session) return;

        // Update activity every 5 minutes
        const interval = setInterval(() => {
            updateActivity();
        }, 5 * 60 * 1000);

        // Update activity on user interaction
        const handleActivity = () => updateActivity();
        window.addEventListener('click', handleActivity);
        window.addEventListener('keypress', handleActivity);
        window.addEventListener('scroll', handleActivity);

        return () => {
            clearInterval(interval);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('keypress', handleActivity);
            window.removeEventListener('scroll', handleActivity);
        };
    }, [session, updateActivity]);

    /**
     * Clean up expired sessions periodically
     */
    useEffect(() => {
        // Clean up on mount
        guestSessionManager.cleanupExpiredSessions();

        // Clean up every hour
        const interval = setInterval(() => {
            guestSessionManager.cleanupExpiredSessions();
        }, 60 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    /**
     * Check session validity periodically
     */
    useEffect(() => {
        if (!session) return;

        const checkValidity = () => {
            const validation = guestSessionManager.validateSession(session.id);

            if (!validation.valid) {
                logger.warn('Guest session became invalid', {
                    sessionId: session.id,
                    reason: validation.reason,
                });

                setSession(null);
                setError(GuestSessionError.invalid(session.id, {
                    eventId: session.eventId,
                }));
            }
        };

        // Check every minute
        const interval = setInterval(checkValidity, 60 * 1000);

        return () => clearInterval(interval);
    }, [session]);

    const value: GuestContextValue = {
        session,
        isLoading,
        error,
        isGuest: session?.status === GuestSessionStatus.ACTIVE,
        initializeSession,
        updateActivity,
        invalidateSession,
        getIdentity,
    };

    return (
        <GuestContext.Provider value={value}>
            {children}
        </GuestContext.Provider>
    );
}

/**
 * Hook to access guest context
 */
export function useGuestContext(): GuestContextValue {
    const context = useContext(GuestContext);

    if (context === undefined) {
        throw new Error('useGuestContext must be used within GuestProvider');
    }

    return context;
}

/**
 * HOC to wrap components with GuestProvider
 */
export function withGuest<P extends object>(
    Component: React.ComponentType<P>,
    options: {
        eventIdExtractor?: (props: P) => string;
        autoInitialize?: boolean;
    } = {}
) {
    return function WithGuestWrapper(props: P) {
        const eventId = options.eventIdExtractor?.(props);

        return (
            <GuestProvider eventId={eventId} autoInitialize={options.autoInitialize}>
                <Component {...props} />
            </GuestProvider>
        );
    };
}
