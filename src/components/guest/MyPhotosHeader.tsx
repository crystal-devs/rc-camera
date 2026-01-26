import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, X } from 'lucide-react';

interface MyPhotosHeaderProps {
    matchedCount: number;
    onRescan: () => void;
    onShowAll: () => void;
    isRescanDisabled?: boolean;
}

/**
 * Memoized header component for "My Photos" tab.
 * Follows Vercel best practice: rerender-memo
 * 
 * Extracted to prevent re-renders when parent state changes.
 */
export const MyPhotosHeader = memo(function MyPhotosHeader({
    matchedCount,
    onRescan,
    onShowAll,
    isRescanDisabled = false
}: MyPhotosHeaderProps) {
    return (
        <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-800">
                    Your Photos
                </h3>
                <Badge variant="secondary" className="ml-2">
                    {matchedCount} {matchedCount === 1 ? 'photo' : 'photos'}
                </Badge>
            </div>
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onRescan}
                    disabled={isRescanDisabled}
                >
                    Rescan
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onShowAll}
                >
                    <X className="h-4 w-4 mr-1" />
                    Show All
                </Button>
            </div>
        </div>
    );
});
