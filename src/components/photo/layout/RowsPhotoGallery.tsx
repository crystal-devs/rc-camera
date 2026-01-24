'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Photo } from '@/types/PhotoGallery.types';
import { OptimizedProgressiveImage } from '../../album/ProgressiveImage';
import computeRowsLayout from './rows-layout';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useScrollContainer } from '@/contexts/ScrollContext';
import { useImagePreloader } from '@/hooks/useImagePreloader';

interface RowsPhotoGalleryProps {
    photos: Photo[];
    onPhotoClick: (photo: Photo, index: number) => void;
    userPermissions: {
        upload: boolean;
        download: boolean;
        moderate: boolean;
        delete: boolean;
    };
    currentTab: 'approved' | 'pending' | 'rejected' | 'hidden';
    onStatusUpdate: (photoId: string, status: string) => void;
    onDownload?: (photo: Photo) => void;
    onDelete?: (photoId: string) => void;
    onSetCover?: (photo: Photo) => void;
    selectionMode?: boolean;
    selectedPhotos?: Set<string>;
    onToggleSelection?: (photoId: string) => void;
    className?: string;
    targetRowHeight?: number;
    spacing?: number;
}

export const RowsPhotoGallery = ({
    photos,
    onPhotoClick,
    userPermissions,
    currentTab,
    onStatusUpdate,
    onDownload,
    onDelete,
    onSetCover,
    selectionMode = false,
    selectedPhotos = new Set(),
    onToggleSelection,
    className = "",
    targetRowHeight,
    spacing = 8,
}: RowsPhotoGalleryProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const { scrollRef } = useScrollContainer();

    // Resize Observer
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Calculate Layout
    const layout = useMemo(() => {
        if (containerWidth === 0 || photos.length === 0) return undefined;

        // Responsive row height calculation
        const calcRowHeight = (width: number) => {
            if (targetRowHeight) return targetRowHeight;
            if (width < 500) return width / 2; // 2 columns on mobile
            if (width < 900) return width / 3; // 3 columns on tablet
            return width / 4; // 4 columns on desktop
        };

        const calculatedHeight = calcRowHeight(containerWidth);

        return computeRowsLayout(
            photos,
            spacing,
            0, // padding
            containerWidth,
            calculatedHeight
        );
    }, [photos, containerWidth, targetRowHeight, spacing]);

    // Virtualizer
    const rowVirtualizer = useVirtualizer({
        count: layout?.tracks.length || 0,
        getScrollElement: () => scrollRef.current || document.querySelector('.custom-scrollbar'),
        estimateSize: (index) => {
            const track = layout?.tracks[index];
            const height = track?.photos[0]?.height || 300;
            return height + spacing;
        },
        overscan: 5,
    });

    // Ensure virtualizer updates when layout changes
    useEffect(() => {
        rowVirtualizer.measure();
    }, [layout, rowVirtualizer]);

    // Optimized Preload Logic: Uses virtualizer state instead of DOM observers
    const { preloadBatch } = useImagePreloader(photos, 3);
    const virtualRows = rowVirtualizer.getVirtualItems();

    useEffect(() => {
        if (!virtualRows.length || !layout) return;

        const lastVirtualRow = virtualRows[virtualRows.length - 1];
        const track = layout.tracks[lastVirtualRow.index];

        if (track && track.photos.length > 0) {
            const lastPhotoIndex = track.photos[track.photos.length - 1].index;
            preloadBatch(lastPhotoIndex + 1);
        }
    }, [virtualRows, layout, preloadBatch]);

    if (!layout) {
        return <div ref={containerRef} className={`w-full ${className}`} />;
    }

    return (
        <div ref={containerRef} className={`w-full ${className}`}>
            <div
                style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const track = layout.tracks[virtualRow.index];
                    const rowHeight = track?.photos[0]?.height || 300;

                    return (
                        <div
                            key={virtualRow.key}
                            className="flex flex-row gap-2 w-full absolute top-0 left-0"
                            style={{
                                height: `${rowHeight}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            {track.photos.map(({ photo, width, height, index }) => (
                                <div
                                    key={photo.id}
                                    data-index={index}
                                    className="photo-row-item relative"
                                    style={{ width: width, height: height }}
                                >
                                    <OptimizedProgressiveImage
                                        photo={photo}
                                        index={index}
                                        onPhotoClick={onPhotoClick}
                                        userPermissions={userPermissions}
                                        currentTab={currentTab}
                                        onStatusUpdate={onStatusUpdate}
                                        onDownload={onDownload}
                                        onDelete={onDelete}
                                        onSetCover={onSetCover}
                                        selectionMode={selectionMode}
                                        isSelected={selectedPhotos.has(photo.id)}
                                        onToggleSelection={onToggleSelection}
                                        priority={index < 10}
                                        layout="rows"
                                    />
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
