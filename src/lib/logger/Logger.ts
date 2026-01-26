// lib/logger/Logger.ts - Environment-based Logging System

/**
 * Log levels
 */
export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
}

/**
 * Log level priorities for filtering
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
};

/**
 * Log context for structured logging
 */
export interface LogContext {
    userId?: string;
    eventId?: string;
    sessionId?: string;
    component?: string;
    action?: string;
    [key: string]: any;
}

/**
 * Log entry structure
 */
interface LogEntry {
    level: LogLevel;
    message: string;
    context?: LogContext;
    timestamp: string;
    error?: any;
}

/**
 * Logger configuration
 */
interface LoggerConfig {
    minLevel: LogLevel;
    enableConsole: boolean;
    enableRemote: boolean;
    remoteEndpoint?: string;
    contextualInfo?: LogContext;
}

/**
 * Centralized Logger class
 */
class Logger {
    private config: LoggerConfig;
    private buffer: LogEntry[] = [];
    private maxBufferSize = 100;

    constructor() {
        // Default configuration based on environment
        this.config = {
            minLevel: this.getDefaultLevel(),
            enableConsole: true,
            enableRemote: false,
        };
    }

    /**
     * Get default log level based on environment
     */
    private getDefaultLevel(): LogLevel {
        if (typeof window === 'undefined') return LogLevel.DEBUG;

        const env = process.env.NODE_ENV;
        const debugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

        if (debugMode) return LogLevel.DEBUG;
        if (env === 'development') return LogLevel.DEBUG;
        if (env === 'test') return LogLevel.WARN;
        return LogLevel.WARN; // Production default
    }

    /**
     * Configure logger
     */
    configure(config: Partial<LoggerConfig>) {
        this.config = { ...this.config, ...config };
    }

    /**
     * Set contextual information for all logs
     */
    setContext(context: LogContext) {
        this.config.contextualInfo = {
            ...this.config.contextualInfo,
            ...context,
        };
    }

    /**
     * Clear contextual information
     */
    clearContext() {
        this.config.contextualInfo = undefined;
    }

    /**
     * Check if a log level should be logged
     */
    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel];
    }

    /**
     * Create log entry
     */
    private createEntry(
        level: LogLevel,
        message: string,
        context?: LogContext,
        error?: any
    ): LogEntry {
        return {
            level,
            message,
            context: {
                ...this.config.contextualInfo,
                ...context,
            },
            timestamp: new Date().toISOString(),
            error: error ? this.serializeError(error) : undefined,
        };
    }

    /**
     * Serialize error objects
     */
    private serializeError(error: any) {
        if (error instanceof Error) {
            return {
                name: error.name,
                message: error.message,
                stack: error.stack,
                ...(error as any), // Include custom properties
            };
        }
        return error;
    }

    /**
     * Log to console with proper formatting
     */
    private logToConsole(entry: LogEntry) {
        if (!this.config.enableConsole) return;

        const styles: Record<LogLevel, string> = {
            [LogLevel.DEBUG]: 'color: #9CA3AF',
            [LogLevel.INFO]: 'color: #3B82F6',
            [LogLevel.WARN]: 'color: #F59E0B; font-weight: bold',
            [LogLevel.ERROR]: 'color: #EF4444; font-weight: bold',
        };

        const prefix = `[${entry.level.toUpperCase()}]`;
        const timestamp = `[${new Date(entry.timestamp).toLocaleTimeString()}]`;

        const consoleMethod = entry.level === LogLevel.ERROR ? console.error :
            entry.level === LogLevel.WARN ? console.warn :
                entry.level === LogLevel.INFO ? console.info :
                    console.log;

        if (entry.context && Object.keys(entry.context).length > 0) {
            consoleMethod(
                `%c${timestamp} ${prefix}`,
                styles[entry.level],
                entry.message,
                entry.context,
                entry.error || ''
            );
        } else {
            consoleMethod(
                `%c${timestamp} ${prefix}`,
                styles[entry.level],
                entry.message,
                entry.error || ''
            );
        }
    }

    /**
     * Add to buffer for batched remote logging
     */
    private addToBuffer(entry: LogEntry) {
        this.buffer.push(entry);

        // Keep buffer size limited
        if (this.buffer.length > this.maxBufferSize) {
            this.buffer = this.buffer.slice(-this.maxBufferSize);
        }

        // Auto-flush on errors
        if (entry.level === LogLevel.ERROR && this.config.enableRemote) {
            this.flush();
        }
    }

    /**
     * Flush buffered logs to remote endpoint
     */
    async flush() {
        if (!this.config.enableRemote || !this.config.remoteEndpoint || this.buffer.length === 0) {
            return;
        }

        const logsToSend = [...this.buffer];
        this.buffer = [];

        try {
            await fetch(this.config.remoteEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logs: logsToSend }),
            });
        } catch (error) {
            // Silent fail - don't want logging to break the app
            console.error('Failed to send logs to remote endpoint:', error);
            // Put logs back in buffer
            this.buffer = [...logsToSend, ...this.buffer].slice(-this.maxBufferSize);
        }
    }

    /**
     * Main logging method
     */
    private log(level: LogLevel, message: string, contextOrError?: LogContext | Error, error?: Error) {
        if (!this.shouldLog(level)) return;

        let context: LogContext | undefined;
        let actualError: any;

        // Handle overloaded parameters
        if (contextOrError instanceof Error) {
            actualError = contextOrError;
        } else {
            context = contextOrError;
            actualError = error;
        }

        const entry = this.createEntry(level, message, context, actualError);
        this.logToConsole(entry);
        this.addToBuffer(entry);
    }

    /**
     * Public logging methods
     */
    debug(message: string, context?: LogContext) {
        this.log(LogLevel.DEBUG, message, context);
    }

    info(message: string, context?: LogContext) {
        this.log(LogLevel.INFO, message, context);
    }

    warn(message: string, contextOrError?: LogContext | Error, error?: Error) {
        this.log(LogLevel.WARN, message, contextOrError, error);
    }

    error(message: string, contextOrError?: LogContext | Error, error?: Error) {
        this.log(LogLevel.ERROR, message, contextOrError, error);
    }

    /**
     * Get buffered logs (useful for debugging)
     */
    getBuffer(): LogEntry[] {
        return [...this.buffer];
    }

    /**
     * Clear buffer
     */
    clearBuffer() {
        this.buffer = [];
    }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { Logger };
