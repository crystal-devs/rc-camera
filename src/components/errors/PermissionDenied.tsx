// components/errors/PermissionDenied.tsx - Permission Denied UI Component
'use client';

import React from 'react';
import { PermissionError } from '@/lib/errors/PermissionError';
import { Button } from '@/components/ui/button';
import { Shield, Mail, ArrowLeft } from 'lucide-react';
import { PERMISSION_LABELS } from '@/constants/permissions';
import { useRouter } from 'next/navigation';

interface PermissionDeniedProps {
    /** Permission error */
    error: PermissionError;
    /** Callback when user clicks retry */
    onRetry?: () => void;
    /** Show contact support option */
    showSupport?: boolean;
    /** Custom back URL */
    backUrl?: string;
}

/**
 * Permission Denied UI Component
 * Shows user-friendly error message when permission is denied
 */
export function PermissionDenied({
    error,
    onRetry,
    showSupport = true,
    backUrl,
}: PermissionDeniedProps) {
    const router = useRouter();

    const handleGoBack = () => {
        if (backUrl) {
            router.push(backUrl);
        } else {
            router.back();
        }
    };

    const handleContactSupport = () => {
        // TODO: Implement support contact mechanism
        window.location.href = 'mailto:support@roseclick.com?subject=Permission%20Request';
    };

    const actionLabel = error.context.action
        ? PERMISSION_LABELS[error.context.action]
        : 'perform this action';

    return (
        <div className="flex flex-col items-center justify-center min-h-[500px] p-6 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
            {/* Icon */}
            <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-full mb-6 shadow-lg">
                <Shield className="h-16 w-16 text-amber-600" />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3 text-center">
                Permission Required
            </h1>

            {/* User Message */}
            <p className="text-lg text-gray-700 dark:text-gray-300 text-center max-w-md mb-2">
                {error.userMessage}
            </p>

            {/* Action-specific message */}
            {error.context.action && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-lg mb-4">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>Required:</strong> {actionLabel}
                    </p>
                    {error.context.userRole && (
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            <strong>Your Role:</strong> {error.context.userRole}
                        </p>
                    )}
                </div>
            )}

            {/* Recovery Suggestion */}
            {error.recoverySuggestion && (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 max-w-lg mb-6">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        💡 What you can do:
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {error.recoverySuggestion}
                    </p>
                </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <Button
                    onClick={handleGoBack}
                    variant="outline"
                    className="gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Go Back
                </Button>

                {onRetry && (
                    <Button
                        onClick={onRetry}
                        variant="outline"
                    >
                        Try Again
                    </Button>
                )}

                {showSupport && (
                    <Button
                        onClick={handleContactSupport}
                        className="gap-2"
                    >
                        <Mail className="h-4 w-4" />
                        Request Access
                    </Button>
                )}
            </div>

            {/* Additional Info */}
            {process.env.NODE_ENV === 'development' && (
                <details className="mt-8 max-w-2xl w-full">
                    <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                        Debug Information
                    </summary>
                    <div className="mt-2 bg-gray-100 dark:bg-gray-800 p-4 rounded text-xs font-mono overflow-auto">
                        <pre>{JSON.stringify(error.toJSON(), null, 2)}</pre>
                    </div>
                </details>
            )}
        </div>
    );
}

/**
 * Inline Permission Denied Message (for smaller contexts)
 */
export function PermissionDeniedInline({
    message = "You don't have permission to access this content.",
    action,
}: {
    message?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
            <Shield className="h-8 w-8 text-amber-600 mb-3" />
            <p className="text-sm text-gray-700 dark:text-gray-300 text-center mb-4">
                {message}
            </p>
            {action}
        </div>
    );
}
