/**
 * CSRF Token Service
 * Industry-standard CSRF protection using HMAC-signed tokens
 * 
 * Token format: timestamp:randomBytes:signature
 * - Server generates signed token with expiry
 * - Client stores in memory/sessionStorage
 * - Client sends in X-CSRF-Token header
 * - Server validates signature and expiry
 */

import logger from '@/lib/logger';

const CSRF_TOKEN_KEY = 'csrf-token';
const CSRF_EXPIRY_KEY = 'csrf-token-expiry';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export class CSRFService {
    private static instance: CSRFService;
    private csrfToken: string | null = null;
    private tokenExpiresAt: number = 0;

    static getInstance(): CSRFService {
        if (!CSRFService.instance) {
            CSRFService.instance = new CSRFService();
        }
        return CSRFService.instance;
    }

    /**
     * Get CSRF token - fetches new one if expired or missing
     */
    async getToken(): Promise<string> {
        // Check if we have a valid cached token (in memory)
        if (this.csrfToken && this.isTokenValid()) {
            return this.csrfToken;
        }

        // Try to get from sessionStorage
        if (typeof window !== 'undefined') {
            const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
            const storedExpiry = sessionStorage.getItem(CSRF_EXPIRY_KEY);

            if (storedToken && storedExpiry) {
                const expiryTime = parseInt(storedExpiry, 10);
                if (Date.now() < expiryTime) {
                    this.csrfToken = storedToken;
                    this.tokenExpiresAt = expiryTime;
                    return storedToken;
                }
            }
        }

        // Fetch new token from server
        return await this.fetchNewToken();
    }

    /**
     * Fetch a new CSRF token from the server
     */
    private async fetchNewToken(): Promise<string> {
        try {
            logger.debug('Fetching new CSRF token');

            const response = await fetch(`${API_BASE_URL}/api/v1/auth/csrf-token`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch CSRF token: ${response.status}`);
            }

            const data = await response.json();

            if (!data.status || !data.csrfToken) {
                throw new Error('Invalid CSRF token response');
            }

            this.csrfToken = data.csrfToken;

            // Parse expiry from response or default to 1 hour
            if (data.expiresAt) {
                this.tokenExpiresAt = new Date(data.expiresAt).getTime();
            } else {
                this.tokenExpiresAt = Date.now() + 3600000; // 1 hour default
            }

            // Store in sessionStorage for page refresh persistence
            if (typeof window !== 'undefined') {
                sessionStorage.setItem(CSRF_TOKEN_KEY, data.csrfToken);
                sessionStorage.setItem(CSRF_EXPIRY_KEY, this.tokenExpiresAt.toString());
            }

            logger.debug('CSRF token fetched successfully');
            return data.csrfToken;
        } catch (error) {
            logger.error('Failed to fetch CSRF token', error);
            throw error;
        }
    }

    /**
     * Check if current token is still valid
     */
    private isTokenValid(): boolean {
        if (!this.tokenExpiresAt) return false;
        // Refresh 5 minutes before expiry for safety margin
        const buffer = 5 * 60 * 1000;
        return Date.now() < (this.tokenExpiresAt - buffer);
    }

    /**
     * Force refresh of CSRF token
     */
    async refreshToken(): Promise<string> {
        this.csrfToken = null;
        this.tokenExpiresAt = 0;

        if (typeof window !== 'undefined') {
            sessionStorage.removeItem(CSRF_TOKEN_KEY);
            sessionStorage.removeItem(CSRF_EXPIRY_KEY);
        }

        return await this.fetchNewToken();
    }

    /**
     * Clear CSRF token (e.g., on logout)
     */
    clearToken(): void {
        this.csrfToken = null;
        this.tokenExpiresAt = 0;

        if (typeof window !== 'undefined') {
            sessionStorage.removeItem(CSRF_TOKEN_KEY);
            sessionStorage.removeItem(CSRF_EXPIRY_KEY);
        }

        logger.debug('CSRF token cleared');
    }

    /**
     * Get CSRF headers for API requests
     */
    async getHeaders(): Promise<Record<string, string>> {
        const token = await this.getToken();
        return {
            'x-csrf-token': token
        };
    }
}

export const csrfService = CSRFService.getInstance();

/**
 * Initialize CSRF token on app load
 * Call this in your app layout or root component
 */
export async function initializeCSRF(): Promise<void> {
    try {
        await csrfService.getToken();
        logger.info('CSRF protection initialized');
    } catch (error) {
        logger.error('Failed to initialize CSRF protection', error);
    }
}

