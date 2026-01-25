import { memo } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    label?: string;
}

/**
 * Standardized loading spinner component.
 * Uses Loader2 icon for consistency across the app.
 * Follows Web Interface Guidelines for animations.
 */
export const LoadingSpinner = memo(function LoadingSpinner({
    size = 'md',
    className,
    label
}: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12'
    };

    return (
        <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
            <Loader2
                className={cn('animate-spin text-blue-600', sizeClasses[size])}
                aria-hidden="true"
            />
            {label && (
                <p className="text-sm text-gray-600" role="status" aria-live="polite">
                    {label}
                </p>
            )}
        </div>
    );
});

interface FullPageLoadingProps {
    message?: string;
    submessage?: string;
}

/**
 * Full-page loading state with centered spinner.
 * Used for initial page loads and major state transitions.
 */
export const FullPageLoading = memo(function FullPageLoading({
    message = 'Loading…',
    submessage
}: FullPageLoadingProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16">
            <LoadingSpinner size="lg" />
            <p className="text-gray-600 mt-4" role="status" aria-live="polite">
                {message}
            </p>
            {submessage && (
                <p className="text-sm text-gray-500 mt-2">
                    {submessage}
                </p>
            )}
        </div>
    );
});
