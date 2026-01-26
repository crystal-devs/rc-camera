import { memo } from 'react';
import { Camera } from 'lucide-react';

interface EmptyStateDisplayProps {
    message?: string;
    icon?: React.ReactNode;
}

/**
 * Memoized empty state display component.
 * Follows Vercel best practice: rendering-hoist-jsx
 * 
 * Hoisted outside component to prevent recreation on every render.
 */
export const EmptyStateDisplay = memo(function EmptyStateDisplay({
    message = 'No photos yet',
    icon
}: EmptyStateDisplayProps) {
    return (
        <div className="text-center py-16">
            {icon || <Camera className="w-20 h-20 mx-auto text-gray-300 mb-4" />}
            <h3 className="text-xl font-medium text-gray-600 mb-2">{message}</h3>
            <p className="text-gray-500">Photos will appear here once uploaded</p>
        </div>
    );
});
