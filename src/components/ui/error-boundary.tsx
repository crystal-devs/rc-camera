// components/ui/error-boundary.tsx
'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { Alert, AlertDescription, AlertTitle } from './alert';

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('EventSelector Error:', error, errorInfo);
    }

    resetError = () => {
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                const FallbackComponent = this.props.fallback;
                return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
            }

            return <EventSelectorError error={this.state.error} resetError={this.resetError} />;
        }

        return this.props.children;
    }
}

interface EventSelectorErrorProps {
    error?: Error;
    resetError: () => void;
}

export function EventSelectorError({ error, resetError }: EventSelectorErrorProps) {
    return (
        <Alert className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="mt-2">
                {error?.message || 'Failed to load events. Please try again.'}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={resetError}
                    className="ml-2"
                >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                </Button>
            </AlertDescription>
        </Alert>
    );
}