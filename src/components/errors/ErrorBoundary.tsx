// components/errors/ErrorBoundary.tsx - React Error Boundary
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { PermissionError } from '@/lib/errors/PermissionError';
import { GuestSessionError } from '@/lib/errors/GuestSessionError';
import { logger } from '@/lib/logger/Logger';
import { errorHandler } from '@/lib/errors/ErrorHandler';
import { PermissionDenied } from './PermissionDenied';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    /** Fallback UI for non-permission errors */
    fallback?: ReactNode;
    /** Callback when error occurs */
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    /** Show error details in dev mode */
    showDetails?: boolean;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary for catching and handling React errors
 * Provides special handling for permission and guest session errors
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log the error
        logger.error('Error caught by ErrorBoundary', {
            component: 'ErrorBoundary',
            errorName: error.name,
            errorMessage: error.message,
            componentStack: errorInfo.componentStack,
        }, error);

        // Handle error with centralized handler
        errorHandler.handle(error, {
            context: {
                componentStack: errorInfo.componentStack,
            },
            showToast: false, // Don't show toast, we have UI
            report: true,
        });

        // Call custom error handler if provided
        this.props.onError?.(error, errorInfo);

        this.setState({
            error,
            errorInfo,
        });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        const { error } = this.state;

        // Special handling for permission errors
        if (error instanceof PermissionError) {
            return (
                <PermissionDenied
                    error={error}
                    onRetry={this.handleReset}
                />
            );
        }

        // Special handling for guest session errors
        if (error instanceof GuestSessionError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-full mb-4">
                        <AlertTriangle className="h-12 w-12 text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Session Issue
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-2">
                        {error.userMessage}
                    </p>
                    {error.recoverySuggestion && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 text-center max-w-md mb-6">
                            {error.recoverySuggestion}
                        </p>
                    )}
                    <div className="flex gap-3">
                        <Button onClick={this.handleReset} variant="outline">
                            Try Again
                        </Button>
                        <Button onClick={this.handleReload}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reload Page
                        </Button>
                    </div>
                </div>
            );
        }

        // Use custom fallback if provided
        if (this.props.fallback) {
            return <>{this.props.fallback}</>;
        }

        // Default error UI
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
                    <AlertTriangle className="h-12 w-12 text-red-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Something went wrong
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
                    An unexpected error occurred. Please try refreshing the page.
                </p>

                {/* Show error details in development */}
                {(process.env.NODE_ENV === 'development' || this.props.showDetails) && error && (
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6 max-w-2xl w-full overflow-auto">
                        <p className="text-sm font-mono text-red-600 dark:text-red-400 mb-2">
                            {error.name}: {error.message}
                        </p>
                        {error.stack && (
                            <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                                {error.stack}
                            </pre>
                        )}
                    </div>
                )}

                <div className="flex gap-3">
                    <Button onClick={this.handleReset} variant="outline">
                        Try Again
                    </Button>
                    <Button onClick={this.handleReload}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reload Page
                    </Button>
                </div>
            </div>
        );
    }
}

/**
 * HOC to wrap components with ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    options: Omit<ErrorBoundaryProps, 'children'> = {}
) {
    return function WithErrorBoundaryWrapper(props: P) {
        return (
            <ErrorBoundary {...options}>
                <Component {...props} />
            </ErrorBoundary>
        );
    };
}
