/**
 * Production-safe logger utility
 * Prevents token/data leakage in production console
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    [key: string]: any;
}

class Logger {
    private isDev = process.env.NODE_ENV === 'development';
    private isDebug = process.env.NEXT_PUBLIC_DEBUG === 'true';

    private sanitize(data: any): any {
        if (typeof data !== 'object' || data === null) return data;

        const sensitiveKeys = [
            'token', 'accessToken', 'refreshToken',
            'password', 'authorization', 'cookie',
            'sessionId', 'csrf', 'secret', 'key',
            'shareToken', 'guestSessionId'
        ];

        const sanitized = Array.isArray(data) ? [...data] : { ...data };

        Object.keys(sanitized).forEach(key => {
            if (sensitiveKeys.some(sensitive =>
                key.toLowerCase().includes(sensitive.toLowerCase())
            )) {
                sanitized[key] = '***REDACTED***';
            } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                sanitized[key] = this.sanitize(sanitized[key]);
            }
        });

        return sanitized;
    }

    debug(message: string, context?: LogContext) {
        if (this.isDev || this.isDebug) {
            console.log(`[DEBUG] ${message}`, context ? this.sanitize(context) : '');
        }
    }

    info(message: string, context?: LogContext) {
        if (this.isDev) {
            console.info(`[INFO] ${message}`, context ? this.sanitize(context) : '');
        }
    }

    warn(message: string, context?: LogContext) {
        console.warn(`[WARN] ${message}`, context ? this.sanitize(context) : '');
    }

    error(message: string, error?: Error | any) {
        const sanitizedError = this.sanitize(error);
        console.error(`[ERROR] ${message}`, sanitizedError);

        // TODO: Send to error tracking service (Sentry, etc.)
        if (!this.isDev) {
            // errorTrackingService.captureException(error, { message });
        }
    }

    // Auth-specific logging
    authEvent(event: 'login' | 'logout' | 'refresh' | 'expired' | 'guest_start' | 'guest_upgrade', userId?: string) {
        this.info(`Auth: ${event}`, { userId, timestamp: new Date().toISOString() });
    }

    // API logging
    apiRequest(method: string, url: string, status?: number) {
        if (this.isDev || this.isDebug) {
            this.debug(`API ${method}`, { url, status });
        }
    }

    // WebSocket logging
    wsEvent(event: string, data?: any) {
        if (this.isDev || this.isDebug) {
            this.debug(`WS: ${event}`, data ? this.sanitize(data) : undefined);
        }
    }
}

export const logger = new Logger();
export default logger;
