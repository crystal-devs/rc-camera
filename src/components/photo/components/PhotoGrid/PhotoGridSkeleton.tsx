/**
 * PhotoGridSkeleton - Loading skeleton for photo grid
 */

'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface PhotoGridSkeletonProps {
    count?: number;
}

export function PhotoGridSkeleton({ count = 16 }: PhotoGridSkeletonProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3 md:gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
        </div>
    );
}
