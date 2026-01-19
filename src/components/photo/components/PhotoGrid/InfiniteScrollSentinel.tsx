/**
 * InfiniteScrollSentinel - Trigger element for infinite scroll
 */

'use client';

import { Button } from '@/components/ui/button';

interface InfiniteScrollSentinelProps {
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    onLoadMore: () => void;
    sentinelRef: React.RefObject<HTMLDivElement | null>;
}

export function InfiniteScrollSentinel({
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
    sentinelRef,
}: InfiniteScrollSentinelProps) {
    if (!hasNextPage) return null;

    return (
        <div ref={sentinelRef} className="flex justify-center pt-6 pb-2">
            {isFetchingNextPage ? (
                <div className="flex flex-col items-center gap-3">
                    <div className="flex gap-2">
                        <div
                            className="w-2 h-2 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: '0ms' }}
                        />
                        <div
                            className="w-2 h-2 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: '150ms' }}
                        />
                        <div
                            className="w-2 h-2 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: '300ms' }}
                        />
                    </div>
                    <span className="text-sm text-muted-foreground">Loading more photos...</span>
                </div>
            ) : (
                <Button onClick={onLoadMore} variant="outline" size="sm" className="text-sm">
                    Load More Photos
                </Button>
            )}
        </div>
    );
}
