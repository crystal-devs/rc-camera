import React from 'react';

export const PhotoGridSkeleton = ({ numColumns }: { numColumns?: number }) => {
    // Generate deterministic random heights for consistency
    const skeletonItems = Array.from({ length: 12 }).map((_, i) => {
        // Random height between 200px and 400px
        const height = Math.floor(Math.random() * (400 - 200 + 1) + 200);
        return { id: i, height };
    });

    return (
        <div
            className={`w-full gap-4 space-y-4 px-1 ${!numColumns ? 'columns-2 md:columns-3 lg:columns-4 xl:columns-5' : ''}`}
            style={numColumns ? { columnCount: numColumns } : undefined}
        >
            {skeletonItems.map((item) => (
                <div
                    key={item.id}
                    className="break-inside-avoid rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse"
                    style={{ height: `${item.height}px` }}
                />
            ))}
        </div>
    );
};
