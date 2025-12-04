/**
 * Unified auth manager for both authenticated users and guests
 * PWA-compatible with offline support using encrypted IndexedDB
 * MIGRATION: Auto-migrates localStorage tokens to IndexedDB
 */

import { secureStorage } from './secure-storage';
import logger from './logger';

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
    private refreshTimer: NodeJS.Timeout | null = null;
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
            // STEP 1: Check IndexedDB for new storage
            let userTokens = await secureStorage.get('user_tokens');

            // STEP 2: MIGRATION - Check localStorage for old tokens
            if (!userTokens && typeof window !== 'undefined') {
                const oldToken = localStorage.getItem('rc-token');
                const oldTokensStr = localStorage.getItem('rc-tokens');

                if (oldToken || oldTokensStr) {
                    logger.info('Migrating tokens from localStorage to IndexedDB');

                    try {
                        // Try new format first (rc-tokens)
                        if (oldTokensStr) {
                            const oldTokens = JSON.parse(oldTokensStr);
                            userTokens = {
                                accessToken: oldTokens.accessToken,
                                refreshToken: oldTokens.refreshToken,
                                expiresAt: oldTokens.expiresAt,
                                userId: oldTokens.userId || 'unknown'
                            };
                        }
                        // Fallback to old format (single rc-token)
                        else if (oldToken) {
                            // Decode JWT to get expiry and userId
                            try {
                                const payload = JSON.parse(atob(oldToken.split('.')[1]));
                                userTokens = {
                                    accessToken: oldToken,
                                    refreshToken: '', // Will need to refresh
                                    expiresAt: (payload.exp * 1000) || (Date.now() + 3600000), // 1 hour
                                    userId: payload.userId || payload.user_id || payload.id || 'unknown'
                                };
                            } catch (e) {
                                logger.warn('Could not decode old token, using default expiry');
                                userTokens = {
                                    accessToken: oldToken,
                                    refreshToken: '',
                                    expiresAt: Date.now() + 3600000, // 1 hour
                                    userId: 'unknown'
                                };
                            }
                        }

                        // Save to IndexedDB
                        if (userTokens) {
                            await secureStorage.set('user_tokens', userTokens, userTokens.expiresAt);
                            logger.info('Successfully migrated tokens to IndexedDB');

                            // Clean up old storage (optional - keep for now for safety)
                            // localStorage.removeItem('rc-token');
                            // localStorage.removeItem('rc-tokens');
                        }
                    } catch (migrationError) {
                        logger.error('Token migration failed', migrationError);
                    }
                }
            }

            // STEP 3: Use migrated or existing tokens
            if (userTokens && !this.isTokenExpired(userTokens.expiresAt)) {
                this.currentState = {
                    mode: 'authenticated',
                    userId: userTokens.userId,
                    accessToken: userTokens.accessToken,
                    expiresAt: userTokens.expiresAt
                };

                logger.info('Authenticated user session restored', { userId: userTokens.userId });
                logger.authEvent('login', userTokens.userId);
                this.startAutoRefresh();
                this.isInitialized = true;
                return this.currentState;
            }

            // STEP 4: Check for guest session
            const guestSession = await secureStorage.get('guest_session');
            if (guestSession && !this.isTokenExpired(guestSession.expiresAt)) {
                this.currentState = {
                    mode: 'guest',
                    guestSessionId: guestSession.sessionId,
                    shareToken: guestSession.shareToken,
                    eventId: guestSession.eventId,
                    expiresAt: guestSession.expiresAt
                };

                logger.debug('Guest session restored');
                logger.authEvent('guest_start');
                this.isInitialized = true;
                return this.currentState;
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
     */
    async loginUser(tokens: UserTokens): Promise<void> {
        try {
            await secureStorage.set('user_tokens', tokens, tokens.expiresAt);

            this.currentState = {
                mode: 'authenticated',
                userId: tokens.userId,
                accessToken: tokens.accessToken,
                expiresAt: tokens.expiresAt
            };

            // Clear any guest session if upgrading
            await secureStorage.delete('guest_session');

            this.startAutoRefresh();
            logger.authEvent('login', tokens.userId);

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
            logger.authEvent('guest_start');

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
                logger.authEvent('guest_upgrade', tokens.userId);
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
            headers['Authorization'] = `jwt ${this.currentState.accessToken}`;
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
     * Start automatic token refresh for authenticated users
     */
    private startAutoRefresh(): void {
        // Only for authenticated users
        if (this.currentState.mode !== 'authenticated') return;

        this.stopAutoRefresh();

        const expiresAt = this.currentState.expiresAt || 0;
        const timeUntilExpiry = expiresAt - Date.now();

        if (timeUntilExpiry <= 0) {
            logger.warn('Token already expired');
            return;
        }

        //Refresh at 80% of lifetime
        const refreshAt = timeUntilExpiry * 0.8;

        logger.debug('Scheduling token refresh', {
            refreshIn: Math.round(refreshAt / 1000) + 's',
            expiresIn: Math.round(timeUntilExpiry / 1000) + 's'
        });

        this.refreshTimer = setTimeout(async () => {
            try {
                await this.refreshToken();
                this.startAutoRefresh(); // Schedule next
            } catch (error) {
                logger.error('Automatic token refresh failed', error);
            }
        }, refreshAt);
    }

    /**
     * Stop automatic refresh
     */
    private stopAutoRefresh(): void {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    /**
     * Refresh access token
     */
    private async refreshToken(): Promise<void> {
        const tokens = await secureStorage.get('user_tokens');
        if (!tokens?.refreshToken) {
            throw new Error('No refresh token available');
        }

        logger.debug('Refreshing access token');

        // Import dynamically to avoid circular dependency
        const { refreshAccessToken } = await import('@/services/apis/auth.api');
        const newTokens = await refreshAccessToken();

        if (newTokens) {
            await this.loginUser(newTokens as any);
            logger.authEvent('refresh');
        } else {
            throw new Error('Token refresh failed');
        }
    }

    /**
     * Logout and clear all auth data
     */
    async logout(): Promise<void> {
        try {
            this.stopAutoRefresh();
            await secureStorage.clear();

            const userId = this.currentState.userId;
            this.currentState = { mode: 'none' };
            this.isInitialized = false;

            logger.authEvent('logout', userId);

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
            const event = {
                type: `auth_${type}`,
                state,
                timestamp: Date.now()
            };

            localStorage.setItem('auth_event', JSON.stringify(event));
            localStorage.removeItem('auth_event'); // Trigger storage event
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

// Auto-init on import (browser only)
if (typeof window !== 'undefined') {
    authManager.init().catch(err =>
        logger.error('Auth init failed', err)
    );
    authManager.setupCrossTabSync();
}
