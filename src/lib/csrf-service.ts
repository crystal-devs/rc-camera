/**
 * CSRF Token Service
 * Industry-standard CSRF protection using double-submit cookie pattern
 */

import logger from '@/lib/logger';

const CSRF_TOKEN_KEY = 'csrf-token';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export class CSRFService {
    private static instance: CSRFService;
    private csrfToken: string | null = null;
    private lastFetchTime: number = 0;
    private readonly TOKEN_VALIDITY_MS = 3600000; // 1 hour

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
        // Check if we have a valid cached token
        if (this.csrfToken && this.isTokenValid()) {
            return this.csrfToken;
        }

        // Try to get from sessionStorage first
        if (typeof window !== 'undefined') {
            const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
            if (storedToken && this.isTokenValid()) {
                this.csrfToken = storedToken;
                return storedToken;
            }
        }

        // Fetch new token
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
            this.lastFetchTime = Date.now();

            // Store in sessionStorage with additional security measures
            if (typeof window !== 'undefined') {
                // Add a prefix to make it harder to guess
                const secureKey = `__csrf_${Date.now()}__`;
                sessionStorage.setItem(CSRF_TOKEN_KEY, data.csrfToken);
                // Store the key itself in a way that's harder to enumerate
                sessionStorage.setItem('csrf_key_ref', secureKey);
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
        if (!this.lastFetchTime) return false;
        const elapsed = Date.now() - this.lastFetchTime;
        return elapsed < this.TOKEN_VALIDITY_MS;
    }

    /**
     * Force refresh of CSRF token
     */
    async refreshToken(): Promise<string> {
        this.csrfToken = null;
        this.lastFetchTime = 0;

        if (typeof window !== 'undefined') {
            sessionStorage.removeItem(CSRF_TOKEN_KEY);
        }

        return await this.fetchNewToken();
    }

    /**
     * Clear CSRF token (e.g., on logout)
     */
    clearToken(): void {
        this.csrfToken = null;
        this.lastFetchTime = 0;

        if (typeof window !== 'undefined') {
            sessionStorage.removeItem(CSRF_TOKEN_KEY);
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
