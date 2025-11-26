// lib/errors/GuestSessionError.ts - Custom Guest Session Error Class

/**
 * Error codes for guest session-related errors
 */
export enum GuestSessionErrorCode {
    /** Session could not be created */
    SESSION_CREATION_FAILED = 'SESSION_CREATION_FAILED',
    /** Session has expired */
    SESSION_EXPIRED = 'SESSION_EXPIRED',
    /** Session validation failed */
    SESSION_INVALID = 'SESSION_INVALID',
    /** Session not found */
    SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
    /** Session storage is unavailable */
    STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',
    /** Session limit reached */
    SESSION_LIMIT_REACHED = 'SESSION_LIMIT_REACHED',
    /** Event does not allow anonymous guests */
    ANONYMOUS_NOT_ALLOWED = 'ANONYMOUS_NOT_ALLOWED',
}

/**
 * Context for guest session errors
 */
export interface GuestSessionErrorContext {
    sessionId?: string;
    eventId?: string;
    expiresAt?: Date;
    attemptCount?: number;
    additionalInfo?: Record<string, any>;
}

/**
 * Custom error class for guest session-related errors
 */
export class GuestSessionError extends Error {
    public readonly code: GuestSessionErrorCode;
    public readonly context: GuestSessionErrorContext;
    public readonly userMessage: string;
    public readonly recoverySuggestion?: string;
    public readonly timestamp: Date;

    constructor(
        code: GuestSessionErrorCode,
        message: string,
        context: GuestSessionErrorContext = {},
        userMessage?: string,
        recoverySuggestion?: string
    ) {
        super(message);
        this.name = 'GuestSessionError';
        this.code = code;
        this.context = context;
        this.userMessage = userMessage || this.getDefaultUserMessage();
        this.recoverySuggestion = recoverySuggestion || this.getDefaultRecoverySuggestion();
        this.timestamp = new Date();

        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, GuestSessionError);
        }

        // Set the prototype explicitly
        Object.setPrototypeOf(this, GuestSessionError.prototype);
    }

    /**
     * Get user-friendly error message based on error code
     */
    private getDefaultUserMessage(): string {
        switch (this.code) {
            case GuestSessionErrorCode.SESSION_CREATION_FAILED:
                return 'Unable to create guest session.';

            case GuestSessionErrorCode.SESSION_EXPIRED:
                return 'Your session has expired.';

            case GuestSessionErrorCode.SESSION_INVALID:
                return 'Your session is invalid.';

            case GuestSessionErrorCode.SESSION_NOT_FOUND:
                return 'No active session found.';

            case GuestSessionErrorCode.STORAGE_UNAVAILABLE:
                return 'Browser storage is unavailable. Please enable cookies.';

            case GuestSessionErrorCode.SESSION_LIMIT_REACHED:
                return 'Maximum number of guest sessions reached for this event.';

            case GuestSessionErrorCode.ANONYMOUS_NOT_ALLOWED:
                return 'This event requires you to sign in.';

            default:
                return 'Guest session error occurred.';
        }
    }

    /**
     * Get recovery suggestion based on error code
     */
    private getDefaultRecoverySuggestion(): string | undefined {
        switch (this.code) {
            case GuestSessionErrorCode.SESSION_CREATION_FAILED:
                return 'Please refresh the page and try again. If the problem persists, try clearing your browser cache.';

            case GuestSessionErrorCode.SESSION_EXPIRED:
                return 'Please refresh the page to create a new session.';

            case GuestSessionErrorCode.SESSION_INVALID:
                return 'Refresh the page to start a new session.';

            case GuestSessionErrorCode.SESSION_NOT_FOUND:
                return 'Refresh the page to create a guest session.';

            case GuestSessionErrorCode.STORAGE_UNAVAILABLE:
                return 'Enable cookies in your browser settings and refresh the page.';

            case GuestSessionErrorCode.SESSION_LIMIT_REACHED:
                return 'Please contact the event organizer or try again later.';

            case GuestSessionErrorCode.ANONYMOUS_NOT_ALLOWED:
                return 'Please sign in or create an account to access this event.';

            default:
                return 'Please refresh the page and try again.';
        }
    }

    /**
     * Convert error to JSON for logging
     */
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            userMessage: this.userMessage,
            recoverySuggestion: this.recoverySuggestion,
            context: {
                ...this.context,
                expiresAt: this.context.expiresAt?.toISOString(),
            },
            timestamp: this.timestamp.toISOString(),
            stack: this.stack,
        };
    }

    /**
     * Static factory methods for common guest session errors
     */
    static creationFailed(reason: string, context?: GuestSessionErrorContext): GuestSessionError {
        return new GuestSessionError(
            GuestSessionErrorCode.SESSION_CREATION_FAILED,
            `Guest session creation failed: ${reason}`,
            context,
            'Unable to create a guest session.',
            'Please refresh the page and try again.'
        );
    }

    static expired(sessionId: string, context?: GuestSessionErrorContext): GuestSessionError {
        return new GuestSessionError(
            GuestSessionErrorCode.SESSION_EXPIRED,
            `Guest session expired: ${sessionId}`,
            { ...context, sessionId },
            'Your guest session has expired.',
            'Refresh the page to continue.'
        );
    }

    static invalid(sessionId?: string, context?: GuestSessionErrorContext): GuestSessionError {
        return new GuestSessionError(
            GuestSessionErrorCode.SESSION_INVALID,
            `Invalid guest session: ${sessionId || 'unknown'}`,
            { ...context, sessionId },
            'Your session is invalid.',
            'Please refresh the page to start a new session.'
        );
    }

    static notFound(context?: GuestSessionErrorContext): GuestSessionError {
        return new GuestSessionError(
            GuestSessionErrorCode.SESSION_NOT_FOUND,
            'Guest session not found',
            context,
            'No active guest session found.',
            'Refresh the page to create a new session.'
        );
    }

    static storageUnavailable(reason: string, context?: GuestSessionErrorContext): GuestSessionError {
        return new GuestSessionError(
            GuestSessionErrorCode.STORAGE_UNAVAILABLE,
            `Browser storage unavailable: ${reason}`,
            context,
            'Browser storage is unavailable.',
            'Please enable cookies and refresh the page.'
        );
    }

    static limitReached(eventId: string, context?: GuestSessionErrorContext): GuestSessionError {
        return new GuestSessionError(
            GuestSessionErrorCode.SESSION_LIMIT_REACHED,
            `Session limit reached for event: ${eventId}`,
            { ...context, eventId },
            'Maximum guest limit reached for this event.',
            'Please contact the event organizer.'
        );
    }

    static anonymousNotAllowed(eventId: string, context?: GuestSessionErrorContext): GuestSessionError {
        return new GuestSessionError(
            GuestSessionErrorCode.ANONYMOUS_NOT_ALLOWED,
            `Anonymous guests not allowed for event: ${eventId}`,
            { ...context, eventId },
            'This event requires you to sign in.',
            'Please create an account or sign in to access this event.'
        );
    }
}
