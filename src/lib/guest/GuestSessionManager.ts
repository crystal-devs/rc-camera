// lib/guest/GuestSessionManager.ts - Guest Session Management
import { nanoid } from 'nanoid';
import {
    GuestSession,
    GuestSessionStatus,
    GuestIdentity,
    CreateGuestSessionOptions,
    GuestSessionValidation,
    GUEST_SESSION_STORAGE_KEY,
    GUEST_SESSION_COOKIE_NAME,
    DEFAULT_SESSION_DURATION,
    SESSION_RENEWAL_THRESHOLD,
} from '@/types/guest';
import { GuestSessionError } from '@/lib/errors/GuestSessionError';
import { logger } from '@/lib/logger/Logger';

/**
 * Guest Session Manager - Singleton
 * Handles creation, validation, and persistence of guest sessions
 */
class GuestSessionManager {
    private static instance: GuestSessionManager;
    private sessions: Map<string, GuestSession> = new Map();

    private constructor() {
        this.loadSessionsFromStorage();
    }

    /**
     * Get singleton instance
     */
    static getInstance(): GuestSessionManager {
        if (!GuestSessionManager.instance) {
            GuestSessionManager.instance = new GuestSessionManager();
        }
        return GuestSessionManager.instance;
    }

    /**
     * Create a new guest session
     */
    async createSession(options: CreateGuestSessionOptions): Promise<GuestSession> {
        const { eventId, guestName, duration = DEFAULT_SESSION_DURATION, metadata } = options;

        // Check if storage is available
        if (!this.isStorageAvailable()) {
            throw GuestSessionError.storageUnavailable(
                'LocalStorage is not available',
                { eventId }
            );
        }

        // Generate session ID
        const sessionId = nanoid(32);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + duration);

        // Generate device fingerprint
        const fingerprint = await this.generateFingerprint();

        const session: GuestSession = {
            id: sessionId,
            eventId,
            guestName,
            createdAt: now,
            expiresAt,
            lastActivityAt: now,
            status: GuestSessionStatus.ACTIVE,
            fingerprint,
            metadata,
        };

        // Store session
        this.sessions.set(sessionId, session);
        this.persistSession(session);
        this.setSessionCookie(sessionId, expiresAt);

        logger.info('Guest session created', {
            sessionId,
            eventId,
            expiresAt: expiresAt.toISOString(),
        });

        return session;
    }

    /**
     * Get session by ID
     */
    getSession(sessionId: string): GuestSession | null {
        // Try memory first
        let session = this.sessions.get(sessionId);

        // Try storage if not in memory
        if (!session) {
            session = this.loadSessionFromStorage(sessionId);
            if (session) {
                this.sessions.set(sessionId, session);
            }
        }

        return session || null;
    }

    /**
     * Get session for an event
     */
    getSessionForEvent(eventId: string): GuestSession | null {
        // Check memory
        for (const session of this.sessions.values()) {
            if (session.eventId === eventId && session.status === GuestSessionStatus.ACTIVE) {
                return session;
            }
        }

        // Check storage
        const storedSession = this.loadSessionForEventFromStorage(eventId);
        if (storedSession) {
            this.sessions.set(storedSession.id, storedSession);
            return storedSession;
        }

        return null;
    }

    /**
     * Validate a session
     */
    validateSession(sessionId: string): GuestSessionValidation {
        const session = this.getSession(sessionId);

        if (!session) {
            return {
                valid: false,
                reason: 'Session not found',
            };
        }

        // Check expiration
        if (new Date() > session.expiresAt) {
            session.status = GuestSessionStatus.EXPIRED;
            this.persistSession(session);
            return {
                valid: false,
                reason: 'Session expired',
                session,
            };
        }

        // Check status
        if (session.status !== GuestSessionStatus.ACTIVE) {
            return {
                valid: false,
                reason: `Session is ${session.status}`,
                session,
            };
        }

        // Verify fingerprint if available
        if (session.fingerprint) {
            this.generateFingerprint().then((currentFingerprint) => {
                if (currentFingerprint !== session.fingerprint) {
                    logger.warn('Session fingerprint mismatch', {
                        sessionId: session.id,
                        eventId: session.eventId,
                    });
                }
            });
        }

        return {
            valid: true,
            session,
        };
    }

    /**
     * Update session activity
     */
    updateActivity(sessionId: string): void {
        const session = this.getSession(sessionId);
        if (!session) return;

        session.lastActivityAt = new Date();
        this.persistSession(session);

        // Check if session needs renewal
        const timeUntilExpiry = session.expiresAt.getTime() - Date.now();
        if (timeUntilExpiry < SESSION_RENEWAL_THRESHOLD) {
            this.renewSession(sessionId);
        }
    }

    /**
     * Renew session (extend expiration)
     */
    async renewSession(sessionId: string): Promise<GuestSession> {
        const session = this.getSession(sessionId);

        if (!session) {
            throw GuestSessionError.notFound({ sessionId });
        }

        // Extend expiration
        const newExpiresAt = new Date(Date.now() + DEFAULT_SESSION_DURATION);
        session.expiresAt = newExpiresAt;
        session.lastActivityAt = new Date();

        this.persistSession(session);
        this.setSessionCookie(sessionId, newExpiresAt);

        logger.info('Guest session renewed', {
            sessionId,
            eventId: session.eventId,
            newExpiresAt: newExpiresAt.toISOString(),
        });

        return session;
    }

    /**
     * Invalidate a session
     */
    invalidateSession(sessionId: string): void {
        const session = this.getSession(sessionId);
        if (!session) return;

        session.status = GuestSessionStatus.INVALID;
        this.persistSession(session);
        this.sessions.delete(sessionId);
        this.removeSessionCookie();

        logger.info('Guest session invalidated', {
            sessionId,
            eventId: session.eventId,
        });
    }

    /**
     * Get guest identity for API calls
     */
    getGuestIdentity(sessionId: string): GuestIdentity | null {
        const session = this.getSession(sessionId);
        if (!session) return null;

        return {
            sessionId: session.id,
            guestName: session.guestName,
            fingerprint: session.fingerprint,
        };
    }

    /**
     * Get or create session for event
     */
    async getOrCreateSession(eventId: string, guestName?: string): Promise<GuestSession> {
        // Try to get existing session
        const existingSession = this.getSessionForEvent(eventId);

        if (existingSession) {
            const validation = this.validateSession(existingSession.id);
            if (validation.valid) {
                return existingSession;
            }
        }

        // Create new session
        return this.createSession({ eventId, guestName });
    }

    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions(): void {
        const now = new Date();
        let cleanedCount = 0;

        // Clean from memory
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now > session.expiresAt) {
                this.sessions.delete(sessionId);
                cleanedCount++;
            }
        }

        // Clean from storage
        this.cleanExpiredFromStorage();

        if (cleanedCount > 0) {
            logger.info(`Cleaned up ${cleanedCount} expired guest sessions`);
        }
    }

    /**
     * Generate device fingerprint for guest identification
     */
    private async generateFingerprint(): Promise<string> {
        if (typeof window === 'undefined') return 'server';

        const components = [
            navigator.userAgent,
            navigator.language,
            new Date().getTimezoneOffset().toString(),
            screen.colorDepth.toString(),
            screen.width.toString(),
            screen.height.toString(),
        ];

        const data = components.join('|');

        // Simple hash function (for production, use a proper hash library)
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }

        return hash.toString(36);
    }

    /**
     * Check if localStorage is available
     */
    private isStorageAvailable(): boolean {
        if (typeof window === 'undefined') return false;

        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Persist session to localStorage
     */
    private persistSession(session: GuestSession): void {
        if (!this.isStorageAvailable()) return;

        try {
            const key = `${GUEST_SESSION_STORAGE_KEY}_${session.id}`;
            const data = {
                ...session,
                createdAt: session.createdAt.toISOString(),
                expiresAt: session.expiresAt.toISOString(),
                lastActivityAt: session.lastActivityAt.toISOString(),
            };
            localStorage.setItem(key, JSON.stringify(data));

            // Also store event-to-session mapping
            localStorage.setItem(
                `${GUEST_SESSION_STORAGE_KEY}_event_${session.eventId}`,
                session.id
            );
        } catch (error) {
            logger.error('Failed to persist guest session', { sessionId: session.id }, error as Error);
        }
    }

    /**
     * Load session from localStorage
     */
    private loadSessionFromStorage(sessionId: string): GuestSession | null {
        if (!this.isStorageAvailable()) return null;

        try {
            const key = `${GUEST_SESSION_STORAGE_KEY}_${sessionId}`;
            const data = localStorage.getItem(key);
            if (!data) return null;

            const parsed = JSON.parse(data);
            return {
                ...parsed,
                createdAt: new Date(parsed.createdAt),
                expiresAt: new Date(parsed.expiresAt),
                lastActivityAt: new Date(parsed.lastActivityAt),
            };
        } catch (error) {
            logger.error('Failed to load guest session', { sessionId }, error as Error);
            return null;
        }
    }

    /**
     * Load session for event from storage
     */
    private loadSessionForEventFromStorage(eventId: string): GuestSession | null {
        if (!this.isStorageAvailable()) return null;

        try {
            const sessionId = localStorage.getItem(`${GUEST_SESSION_STORAGE_KEY}_event_${eventId}`);
            if (!sessionId) return null;

            return this.loadSessionFromStorage(sessionId);
        } catch (error) {
            logger.error('Failed to load session for event', { eventId }, error as Error);
            return null;
        }
    }

    /**
     * Load all sessions from localStorage on initialization
     */
    private loadSessionsFromStorage(): void {
        if (!this.isStorageAvailable()) return;

        try {
            const keys = Object.keys(localStorage);
            for (const key of keys) {
                if (key.startsWith(GUEST_SESSION_STORAGE_KEY) && !key.includes('_event_')) {
                    const sessionId = key.replace(`${GUEST_SESSION_STORAGE_KEY}_`, '');
                    const session = this.loadSessionFromStorage(sessionId);
                    if (session) {
                        this.sessions.set(sessionId, session);
                    }
                }
            }

            logger.debug(`Loaded ${this.sessions.size} guest sessions from storage`);
        } catch (error) {
            logger.error('Failed to load sessions from storage', {}, error as Error);
        }
    }

    /**
     * Clean expired sessions from storage
     */
    private cleanExpiredFromStorage(): void {
        if (!this.isStorageAvailable()) return;

        try {
            const now = new Date();
            const keys = Object.keys(localStorage);

            for (const key of keys) {
                if (key.startsWith(GUEST_SESSION_STORAGE_KEY) && !key.includes('_event_')) {
                    const sessionId = key.replace(`${GUEST_SESSION_STORAGE_KEY}_`, '');
                    const session = this.loadSessionFromStorage(sessionId);

                    if (session && now > session.expiresAt) {
                        localStorage.removeItem(key);
                        localStorage.removeItem(`${GUEST_SESSION_STORAGE_KEY}_event_${session.eventId}`);
                    }
                }
            }
        } catch (error) {
            logger.error('Failed to clean expired sessions from storage', {}, error as Error);
        }
    }

    /**
     * Set session cookie
     */
    private setSessionCookie(sessionId: string, expiresAt: Date): void {
        if (typeof document === 'undefined') return;

        try {
            document.cookie = `${GUEST_SESSION_COOKIE_NAME}=${sessionId}; expires=${expiresAt.toUTCString()}; path=/; SameSite=Lax`;
        } catch (error) {
            logger.warn('Failed to set session cookie', { sessionId }, error as Error);
        }
    }

    /**
     * Remove session cookie
     */
    private removeSessionCookie(): void {
        if (typeof document === 'undefined') return;

        try {
            document.cookie = `${GUEST_SESSION_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        } catch (error) {
            logger.warn('Failed to remove session cookie', {}, error as Error);
        }
    }
}

// Export singleton instance
export const guestSessionManager = GuestSessionManager.getInstance();

// Export class for testing
export { GuestSessionManager };
