// lib/errors/PermissionError.ts - Custom Permission Error Class
import { PermissionAction } from '@/constants/permissions';

/**
 * Error codes for permission-related errors
 */
export enum PermissionErrorCode {
    /** User does not have the required permission */
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    /** Role is insufficient for the action */
    INSUFFICIENT_ROLE = 'INSUFFICIENT_ROLE',
    /** Permission data could not be loaded */
    PERMISSION_LOAD_FAILED = 'PERMISSION_LOAD_FAILED',
    /** Permission check timed out */
    PERMISSION_TIMEOUT = 'PERMISSION_TIMEOUT',
    /** Invalid permission action */
    INVALID_PERMISSION = 'INVALID_PERMISSION',
    /** Event settings prevent this action */
    EVENT_RESTRICTION = 'EVENT_RESTRICTION',
}

/**
 * Context for permission errors
 */
export interface PermissionErrorContext {
    action?: PermissionAction;
    userRole?: string;
    eventId?: string;
    userId?: string;
    requiredPermission?: string;
    additionalInfo?: Record<string, any>;
}

/**
 * Custom error class for permission-related errors
 */
export class PermissionError extends Error {
    public readonly code: PermissionErrorCode;
    public readonly context: PermissionErrorContext;
    public readonly userMessage: string;
    public readonly recoverySuggestion?: string;
    public readonly timestamp: Date;

    constructor(
        code: PermissionErrorCode,
        message: string,
        context: PermissionErrorContext = {},
        userMessage?: string,
        recoverySuggestion?: string
    ) {
        super(message);
        this.name = 'PermissionError';
        this.code = code;
        this.context = context;
        this.userMessage = userMessage || this.getDefaultUserMessage();
        this.recoverySuggestion = recoverySuggestion || this.getDefaultRecoverySuggestion();
        this.timestamp = new Date();

        // Maintain proper stack trace for where the error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, PermissionError);
        }

        // Set the prototype explicitly for instanceof checks
        Object.setPrototypeOf(this, PermissionError.prototype);
    }

    /**
     * Get user-friendly error message based on error code
     */
    private getDefaultUserMessage(): string {
        switch (this.code) {
            case PermissionErrorCode.PERMISSION_DENIED:
                return `You don't have permission to ${this.context.action ? this.formatAction(this.context.action) : 'perform this action'}.`;

            case PermissionErrorCode.INSUFFICIENT_ROLE:
                return 'Your current role does not allow this action.';

            case PermissionErrorCode.PERMISSION_LOAD_FAILED:
                return 'Unable to verify your permissions. Please try again.';

            case PermissionErrorCode.PERMISSION_TIMEOUT:
                return 'Permission check timed out. Please refresh and try again.';

            case PermissionErrorCode.INVALID_PERMISSION:
                return 'Invalid permission requested.';

            case PermissionErrorCode.EVENT_RESTRICTION:
                return 'Event settings prevent this action.';

            default:
                return 'Permission error occurred.';
        }
    }

    /**
     * Get recovery suggestion based on error code
     */
    private getDefaultRecoverySuggestion(): string | undefined {
        switch (this.code) {
            case PermissionErrorCode.PERMISSION_DENIED:
                return 'Contact the event creator to request additional permissions.';

            case PermissionErrorCode.INSUFFICIENT_ROLE:
                return 'Ask an event creator or co-host to upgrade your role.';

            case PermissionErrorCode.PERMISSION_LOAD_FAILED:
                return 'Check your internet connection and try refreshing the page.';

            case PermissionErrorCode.PERMISSION_TIMEOUT:
                return 'Refresh the page to reload your permissions.';

            case PermissionErrorCode.EVENT_RESTRICTION:
                return 'Event creators can modify these settings in event management.';

            default:
                return undefined;
        }
    }

    /**
     * Format permission action for user display
     */
    private formatAction(action: PermissionAction): string {
        return action
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase());
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
            context: this.context,
            timestamp: this.timestamp.toISOString(),
            stack: this.stack,
        };
    }

    /**
     * Static factory methods for common permission errors
     */
    static denied(action: PermissionAction, context?: PermissionErrorContext): PermissionError {
        return new PermissionError(
            PermissionErrorCode.PERMISSION_DENIED,
            `Permission denied for action: ${action}`,
            { ...context, action },
            `You don't have permission to ${action.replace(/_/g, ' ').toLowerCase()}.`,
            'Contact the event creator to request this permission.'
        );
    }

    static insufficientRole(requiredRole: string, userRole: string, context?: PermissionErrorContext): PermissionError {
        return new PermissionError(
            PermissionErrorCode.INSUFFICIENT_ROLE,
            `Insufficient role: required ${requiredRole}, has ${userRole}`,
            { ...context, requiredPermission: requiredRole, userRole },
            `This action requires ${requiredRole} role or higher.`,
            'Ask an administrator to upgrade your role.'
        );
    }

    static loadFailed(reason: string, context?: PermissionErrorContext): PermissionError {
        return new PermissionError(
            PermissionErrorCode.PERMISSION_LOAD_FAILED,
            `Failed to load permissions: ${reason}`,
            context,
            'Unable to load your permissions.',
            'Please refresh the page and try again.'
        );
    }

    static timeout(context?: PermissionErrorContext): PermissionError {
        return new PermissionError(
            PermissionErrorCode.PERMISSION_TIMEOUT,
            'Permission check timed out',
            context,
            'Permission verification took too long.',
            'Please refresh the page and try again.'
        );
    }

    static eventRestriction(restriction: string, context?: PermissionErrorContext): PermissionError {
        return new PermissionError(
            PermissionErrorCode.EVENT_RESTRICTION,
            `Event restriction: ${restriction}`,
            context,
            restriction,
            'Event settings prevent this action. Contact the event creator.'
        );
    }
}
