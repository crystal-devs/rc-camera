/**
 * Unified auth manager for both authenticated users and guests
 * PWA-compatible with offline support using encrypted IndexedDB
 * MIGRATION: Auto-migrates localStorage tokens to IndexedDB
 */

import { secureStorage } from './secure-storage';
import logger from './logger';
import { useToken } from '@/hooks/useToken';

export type AuthMode = 'authenticated' | 'guest' | 'none';

export interface AuthState {
    mode: AuthMode;
    userId?: string;
    guestSessionId?: string;
    accessToken?: string;
    shareToken?: string;
    eventId?: string;
    expiresAt?: number;
}

export interface UserTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    userId: string;
}

export interface GuestSession {
    sessionId: string;
    shareToken: string;
    eventId: string;
    expiresAt?: number;
}

export class AuthManager {
    private static instance: AuthManager;
    private currentState: AuthState = { mode: 'none' };
    private isInitialized = false;

    static getInstance(): AuthManager {
        if (!AuthManager.instance) {
            AuthManager.instance = new AuthManager();
        }
        return AuthManager.instance;
    }

    /**
     * Initialize auth state from storage
     * Call this on app startup
     * 
     * MIGRATION: Also checks localStorage for old tokens and migrates them
     */
    async init(): Promise<AuthState> {
        if (this.isInitialized) {
            return this.currentState;
        }

        try {
            // STEP 1: Check for authenticated session flag (no tokens stored)
            let authSession = null;
            try {
                authSession = await secureStorage.get('auth_session');
            } catch (error) {
                logger.warn('Failed to retrieve auth_session', { error });
            }

            // STEP 2: MIGRATION - Clean up old token storage (defensive)
            if (typeof window !== 'undefined') {
                try {
                    const oldTokens = await secureStorage.get('user_tokens');
                    if (oldTokens) {
                        logger.info('Cleaning up old token storage for security');
                        await secureStorage.delete('user_tokens');
                    }

                    // Clean up localStorage tokens
                    const oldToken = useToken();
                    const oldTokensStr = localStorage.getItem('rc-tokens');
                    if (oldToken || oldTokensStr) {
                        localStorage.removeItem('rc-token');
                        localStorage.removeItem('rc-tokens');
                        logger.info('Cleaned up old localStorage tokens');
                    }
                } catch (error) {
                    logger.warn('Migration cleanup failed', { error });
                }
            }

            // STEP 3: If we have an auth session, return it (let SecureAuthContext handle refresh)
            if (authSession && authSession.expiresAt && Date.now() < authSession.expiresAt) {
                // Check if we just logged out - if so, don't trust the stored session
                if (typeof window !== 'undefined' && localStorage.getItem('logout_complete')) {
                    logger.info('AuthManager: Logout detected, ignoring stored session to prevent loop');
                    return { mode: 'none' };
                }

                // Set current state from stored session
                this.currentState = {
                    mode: 'authenticated',
                    userId: authSession.userId,
                    accessToken: '', // Will be set by SecureAuthContext
                    expiresAt: authSession.expiresAt
                };

                logger.debug('Auth session found, letting SecureAuthContext handle refresh');
                this.isInitialized = true;
                return this.currentState;
            }

            // STEP 4: Check for guest session
            try {
                const guestSession = await secureStorage.get('guest_session');
                if (guestSession && guestSession.expiresAt && Date.now() < guestSession.expiresAt) {
                    this.currentState = {
                        mode: 'guest',
                        guestSessionId: guestSession.sessionId,
                        shareToken: guestSession.shareToken,
                        eventId: guestSession.eventId,
                        expiresAt: guestSession.expiresAt
                    };

                    logger.debug('Guest session restored');
                    try {
                        logger.authEvent('guest_start');
                    } catch (error) {
                        console.warn('Failed to log guest_start event', error);
                    }
                    this.isInitialized = true;
                    return this.currentState;
                }
            } catch (error) {
                logger.warn('Failed to check guest session', { error });
            }

            // No valid session
            this.currentState = { mode: 'none' };
            this.isInitialized = true;
            logger.debug('No valid session found');
            return this.currentState;
        } catch (error) {
            logger.error('Failed to initialize auth', error);
            this.currentState = { mode: 'none' };
            this.isInitialized = true;
            return this.currentState;
        }
    }

    /**
     * Login as authenticated user
     * SECURITY: Access tokens are stored in memory only, not persisted
     */
    async loginUser(tokens: UserTokens): Promise<void> {
        try {
            // SECURITY: Do NOT store access tokens in IndexedDB
            // Only store a minimal session flag for cross-tab sync
            const sessionFlag = {
                userId: tokens.userId,
                mode: 'authenticated' as const,
                expiresAt: tokens.expiresAt
            };
            await secureStorage.set('auth_session', sessionFlag, tokens.expiresAt);

            this.currentState = {
                mode: 'authenticated',
                userId: tokens.userId,
                accessToken: tokens.accessToken,
                expiresAt: tokens.expiresAt
            };

            // Clear any guest session if upgrading
            await secureStorage.delete('guest_session');

            // NOTE: Auto-refresh is now handled by SecureAuthContext only
            try {
                logger.authEvent('login', tokens.userId);
            } catch (error) {
                console.warn('Failed to log login event', error);
            }

            // Broadcast to other tabs
            this.broadcastAuthEvent('login', this.currentState);
        } catch (error) {
            logger.error('Failed to login user', error);
            throw error;
        }
    }

    /**
     * Start guest session
     */
    async startGuestSession(config: GuestSession): Promise<void> {
        try {
            const expiresAt = config.expiresAt || Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days

            const sessionData = {
                ...config,
                expiresAt
            };

            await secureStorage.set('guest_session', sessionData, expiresAt);

            this.currentState = {
                mode: 'guest',
                guestSessionId: config.sessionId,
                shareToken: config.shareToken,
                eventId: config.eventId,
                expiresAt
            };

            logger.debug('Guest session started', { eventId: config.eventId });
            try {
                logger.authEvent('guest_start');
            } catch (error) {
                console.warn('Failed to log guest_start event', error);
            }

            // Broadcast to other tabs
            this.broadcastAuthEvent('guest_start', this.currentState);
        } catch (error) {
            logger.error('Failed to start guest session', error);
            throw error;
        }
    }

    /**
     * Upgrade guest to authenticated user
     * Preserves guest session ID for migration
     */
    async upgradeGuestToUser(tokens: UserTokens): Promise<string | null> {
        try {
            // Preserve guest session ID for migration
            const guestSession = await secureStorage.get('guest_session');
            const guestSessionId = guestSession?.sessionId || null;

            await this.loginUser(tokens);

            if (guestSessionId) {
                logger.info('Guest upgraded to authenticated', {
                    guestSessionId,
                    userId: tokens.userId
                });
                try {
                    logger.authEvent('guest_upgrade', tokens.userId);
                } catch (error) {
                    console.warn('Failed to log guest_upgrade event', error);
                }
            }

            return guestSessionId;
        } catch (error) {
            logger.error('Failed to upgrade guest', error);
            throw error;
        }
    }

    /**
     * Get current auth token (works for both modes)
     */
    getAuthToken(): string | null {
        if (this.currentState.mode === 'authenticated') {
            return this.currentState.accessToken || null;
        }
        if (this.currentState.mode === 'guest') {
            return this.currentState.shareToken || null;
        }
        return null;
    }

    /**
     * Get auth headers for API calls
     * Returns headers object ready to merge with axios config
     */
    getAuthHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (this.currentState.mode === 'authenticated' && this.currentState.accessToken) {
            headers['Authorization'] = `Bearer ${this.currentState.accessToken}`;
        } else if (this.currentState.mode === 'guest' && this.currentState.shareToken) {
            headers['X-Share-Token'] = this.currentState.shareToken;
            if (this.currentState.guestSessionId) {
                headers['X-Guest-Session-Id'] = this.currentState.guestSessionId;
            }
        }

        return headers;
    }

    /**
     * Get current auth state
     */
    getCurrentState(): AuthState {
        return { ...this.currentState };
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return this.currentState.mode === 'authenticated' &&
            !!this.currentState.accessToken &&
            !this.isTokenExpired(this.currentState.expiresAt);
    }

    /**
     * Check if in guest mode
     */
    isGuest(): boolean {
        return this.currentState.mode === 'guest' &&
            !!this.currentState.shareToken;
    }

    /**
     * Get user ID (only for authenticated users)
     */
    getUserId(): string | null {
        return this.currentState.userId || null;
    }

    /**
     * Get event ID (for guests)
     */
    getEventId(): string | null {
        return this.currentState.eventId || null;
    }

    /**
     * Check if token is expired
     */
    private isTokenExpired(expiresAt?: number): boolean {
        if (!expiresAt) return true;
        const buffer = 5 * 60 * 1000; // 5 min buffer
        return Date.now() > (expiresAt - buffer);
    }


    /**
     * Logout and clear all auth data
     */
    async logout(): Promise<void> {
        try {
            // Clear all auth-related storage
            await secureStorage.delete('auth_session');
            await secureStorage.delete('guest_session');
            // Keep other non-auth data

            const userId = this.currentState.userId;
            this.currentState = { mode: 'none' };
            this.isInitialized = false;

            try {
                logger.authEvent('logout', userId);
            } catch (error) {
                console.warn('Failed to log logout event', error);
            }

            // Broadcast to other tabs
            this.broadcastAuthEvent('logout', this.currentState);
        } catch (error) {
            logger.error('Logout error', error);
        }
    }

    /**
     * Broadcast auth events to other tabs
     */
    private broadcastAuthEvent(type: string, state: AuthState): void {
        if (typeof window === 'undefined') return;

        try {
            // 1. Storage event for OTHER tabs
            const event = {
                type: `auth_${type}`,
                state,
                timestamp: Date.now()
            };

            localStorage.setItem('auth_event', JSON.stringify(event));
            localStorage.removeItem('auth_event'); // Trigger storage event

            // 2. Custom event for THIS tab
            window.dispatchEvent(new CustomEvent('rc-auth-update', {
                detail: { type: `auth_${type}`, state }
            }));

        } catch (error) {
            logger.error('Failed to broadcast auth event', error);
        }
    }

    /**
     * Listen for auth events from other tabs
     */
    setupCrossTabSync(): void {
        if (typeof window === 'undefined') return;

        window.addEventListener('storage', async (e: StorageEvent) => {
            if (e.key === 'auth_event' && e.newValue) {
                try {
                    const event = JSON.parse(e.newValue);

                    switch (event.type) {
                        case 'auth_logout':
                            // Another tab logged out - sync this tab
                            await this.logout();
                            break;
                        case 'auth_login':
                        case 'auth_guest_start':
                            // Another tab logged in - re-init
                            await this.init();
                            break;
                    }
                } catch (error) {
                    logger.error('Cross-tab sync error', error);
                }
            }
        });
    }
}

export const authManager = AuthManager.getInstance();

// Setup cross-tab sync on import (browser only)
// Init is called explicitly by SecureAuthContext
if (typeof window !== 'undefined') {
    authManager.setupCrossTabSync();
}
