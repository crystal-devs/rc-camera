/**
 * Utility functions for guest token management with versioning and expiration.
 * Follows Vercel best practice: client-localstorage-schema
 */

const GUEST_TOKEN_VERSION = 1;
const TOKEN_EXPIRY_DAYS = 30;

interface GuestTokenData {
    version: number;
    token: string;
    eventId: string;
    expiresAt: number;
    createdAt: number;
}

/**
 * Save a guest token to localStorage with version and expiration metadata
 */
export function saveGuestToken(eventId: string, token: string): void {
    if (typeof window === 'undefined') return;

    try {
        const data: GuestTokenData = {
            version: GUEST_TOKEN_VERSION,
            token,
            eventId,
            createdAt: Date.now(),
            expiresAt: Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        };

        const key = `guest_token_${eventId}`;
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save guest token:', error);
    }
}

/**
 * Load a guest token from localStorage with validation
 */
export function loadGuestToken(eventId: string): string | null {
    if (typeof window === 'undefined') return null;

    try {
        const key = `guest_token_${eventId}`;
        const raw = localStorage.getItem(key);

        if (!raw) return null;

        const data = JSON.parse(raw) as GuestTokenData;

        // Version check
        if (data.version !== GUEST_TOKEN_VERSION) {
            console.warn('Guest token version mismatch, clearing old token');
            localStorage.removeItem(key);
            return null;
        }

        // Event ID check
        if (data.eventId !== eventId) {
            return null;
        }

        // Expiration check
        if (data.expiresAt < Date.now()) {
            console.info('Guest token expired, clearing');
            localStorage.removeItem(key);
            return null;
        }

        return data.token;
    } catch (error) {
        console.error('Failed to load guest token:', error);
        return null;
    }
}

/**
 * Remove a guest token from localStorage
 */
export function removeGuestToken(eventId: string): void {
    if (typeof window === 'undefined') return;

    try {
        const key = `guest_token_${eventId}`;
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Failed to remove guest token:', error);
    }
}

/**
 * Check if a guest token exists and is valid
 */
export function hasValidGuestToken(eventId: string): boolean {
    return loadGuestToken(eventId) !== null;
}
