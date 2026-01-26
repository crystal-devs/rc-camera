// lib/errors/ErrorHandler.ts - Centralized Error Handling
import { PermissionError } from './PermissionError';
import { GuestSessionError } from './GuestSessionError';
import { logger } from '../logger/Logger';
import { toast } from 'sonner';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
    /** Low severity - user can continue */
    LOW = 'low',
    /** Medium severity - some functionality affected */
    MEDIUM = 'medium',
    /** High severity - major functionality broken */
    HIGH = 'high',
    /** Critical - app may be unusable */
    CRITICAL = 'critical',
}

/**
 * Error handling options
 */
export interface ErrorHandlingOptions {
    /** Show toast notification to user */
    showToast?: boolean;
    /** Toast duration in ms */
    toastDuration?: number;
    /** Log to console/remote */
    log?: boolean;
    /** Report to error monitoring service */
    report?: boolean;
    /** Severity level */
    severity?: ErrorSeverity;
    /** Custom user message */
    userMessage?: string;
    /** Context for logging */
    context?: Record<string, any>;
    /** Callback after handling */
    onHandled?: () => void;
}

/**
 * Default error handling options
 */
const DEFAULT_OPTIONS: ErrorHandlingOptions = {
    showToast: true,
    toastDuration: 5000,
    log: true,
    report: true,
    severity: ErrorSeverity.MEDIUM,
};

/**
 * Centralized error handler
 */
class ErrorHandler {
    /**
     * Handle any error with appropriate response
     */
    handle(error: unknown, options: ErrorHandlingOptions = {}): void {
        const opts = { ...DEFAULT_OPTIONS, ...options };

        // Determine error type and extract information
        const errorInfo = this.analyzeError(error);

        // Log the error
        if (opts.log) {
            this.logError(error, opts.context);
        }

        // Report to monitoring service
        if (opts.report && this.shouldReport(opts.severity)) {
            this.reportError(error, opts.context);
        }

        // Show user notification
        if (opts.showToast) {
            this.showUserNotification(errorInfo, opts);
        }

        // Execute callback
        if (opts.onHandled) {
            opts.onHandled();
        }
    }

    /**
     * Handle permission errors specifically
     */
    handlePermissionError(error: PermissionError, options: ErrorHandlingOptions = {}): void {
        logger.warn('Permission denied', {
            code: error.code,
            action: error.context.action,
            userRole: error.context.userRole,
            eventId: error.context.eventId,
        });

        const opts: ErrorHandlingOptions = {
            ...DEFAULT_OPTIONS,
            ...options,
            severity: ErrorSeverity.LOW, // Permission errors are usually low severity
        };

        if (opts.showToast) {
            toast.error(error.userMessage, {
                description: error.recoverySuggestion,
                duration: opts.toastDuration,
            });
        }

        if (opts.onHandled) {
            opts.onHandled();
        }
    }

    /**
     * Handle guest session errors specifically
     */
    handleGuestSessionError(error: GuestSessionError, options: ErrorHandlingOptions = {}): void {
        logger.error('Guest session error', {
            code: error.code,
            sessionId: error.context.sessionId,
            eventId: error.context.eventId,
        });

        const opts: ErrorHandlingOptions = {
            ...DEFAULT_OPTIONS,
            ...options,
            severity: ErrorSeverity.MEDIUM,
        };

        if (opts.showToast) {
            toast.error(error.userMessage, {
                description: error.recoverySuggestion,
                duration: opts.toastDuration,
            });
        }

        if (opts.onHandled) {
            opts.onHandled();
        }
    }

    /**
     * Analyze error and extract information
     */
    private analyzeError(error: unknown): {
        type: string;
        message: string;
        userMessage: string;
        severity: ErrorSeverity;
    } {
        if (error instanceof PermissionError) {
            return {
                type: 'PermissionError',
                message: error.message,
                userMessage: error.userMessage,
                severity: ErrorSeverity.LOW,
            };
        }

        if (error instanceof GuestSessionError) {
            return {
                type: 'GuestSessionError',
                message: error.message,
                userMessage: error.userMessage,
                severity: ErrorSeverity.MEDIUM,
            };
        }

        if (error instanceof TypeError) {
            return {
                type: 'TypeError',
                message: error.message,
                userMessage: 'A technical error occurred. Please try again.',
                severity: ErrorSeverity.HIGH,
            };
        }

        if (error instanceof Error) {
            return {
                type: error.name,
                message: error.message,
                userMessage: 'An unexpected error occurred. Please try again.',
                severity: ErrorSeverity.MEDIUM,
            };
        }

        return {
            type: 'Unknown',
            message: String(error),
            userMessage: 'An unexpected error occurred. Please try again.',
            severity: ErrorSeverity.MEDIUM,
        };
    }

    /**
     * Log error with context
     */
    private logError(error: unknown, context?: Record<string, any>): void {
        if (error instanceof PermissionError || error instanceof GuestSessionError) {
            logger.warn(error.message, {
                ...context,
                errorType: error.name,
                errorCode: error.code,
                errorContext: error.context,
            });
        } else if (error instanceof Error) {
            logger.error(error.message, {
                ...context,
                errorType: error.name,
                stack: error.stack,
            }, error);
        } else {
            logger.error('Unknown error', {
                ...context,
                error: String(error),
            });
        }
    }

    /**
     * Report error to monitoring service
     * TODO: Integrate with Sentry, LogRocket, or similar
     */
    private reportError(error: unknown, context?: Record<string, any>): void {
        // Only report in production
        if (process.env.NODE_ENV !== 'production') {
            return;
        }

        // TODO: Implement error reporting service integration
        // Example: Sentry.captureException(error, { extra: context });

        logger.info('Error reported to monitoring service', {
            ...context,
            error: error instanceof Error ? error.message : String(error),
        });
    }

    /**
     * Determine if error should be reported based on severity
     */
    private shouldReport(severity?: ErrorSeverity): boolean {
        if (!severity) return true;

        // Don't report low severity errors
        return severity !== ErrorSeverity.LOW;
    }

    /**
     * Show user notification
     */
    private showUserNotification(
        errorInfo: ReturnType<typeof this.analyzeError>,
        options: ErrorHandlingOptions
    ): void {
        const userMessage = options.userMessage || errorInfo.userMessage;
        const duration = options.toastDuration || 5000;

        switch (errorInfo.severity) {
            case ErrorSeverity.CRITICAL:
            case ErrorSeverity.HIGH:
                toast.error(userMessage, {
                    description: 'Please contact support if this persists.',
                    duration: 8000,
                });
                break;

            case ErrorSeverity.MEDIUM:
                toast.error(userMessage, {
                    duration,
                });
                break;

            case ErrorSeverity.LOW:
                toast.warning(userMessage, {
                    duration,
                });
                break;
        }
    }

    /**
     * Handle async errors and convert to proper responses
     */
    async handleAsync<T>(
        operation: () => Promise<T>,
        options: ErrorHandlingOptions = {}
    ): Promise<T | null> {
        try {
            return await operation();
        } catch (error) {
            this.handle(error, options);
            return null;
        }
    }

    /**
     * Wrap function with error handling
     */
    wrap<T extends (...args: any[]) => any>(
        fn: T,
        options: ErrorHandlingOptions = {}
    ): T {
        return ((...args: Parameters<T>) => {
            try {
                const result = fn(...args);
                // Handle async functions
                if (result instanceof Promise) {
                    return result.catch((error) => {
                        this.handle(error, options);
                        throw error;
                    });
                }
                return result;
            } catch (error) {
                this.handle(error, options);
                throw error;
            }
        }) as T;
    }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Export class for testing
export { ErrorHandler };
