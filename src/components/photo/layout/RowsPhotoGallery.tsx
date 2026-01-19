'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Photo } from '@/types/PhotoGallery.types';
import { OptimizedProgressiveImage } from '../../album/ProgressiveImage';
import computeRowsLayout, { LayoutModel } from './rows-layout';
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

        // 🚀 OPTIMIZATION: Mimic react-photo-album's responsive logic
        // If user provides a specific height, use it.
        // Otherwise, use a heuristic relative to container width (e.g., try to fit 3-5 columns)
        const calcRowHeight = (width: number) => {
            if (targetRowHeight) return targetRowHeight;
            if (width < 500) return width / 2; // 2 columns on mobile
            if (width < 900) return width / 3; // 3 columns on tablet
            return width / 4; // 4 columns on desktop (approx 250-300px)
        };

        const calculatedHeight = calcRowHeight(containerWidth);

        return computeRowsLayout(
            photos,
            spacing, // Dynamic spacing
            0, // padding
            containerWidth,
            calculatedHeight
        );
    }, [photos, containerWidth, targetRowHeight, spacing]);

    // Preload Logic (adapted from PhotoGrid)
    const { preloadBatch } = useImagePreloader(photos, 3);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
                    preloadBatch(index + 1);
                }
            });
        }, {
            rootMargin: '200px',
            threshold: 0.1
        });

        const items = document.querySelectorAll('.photo-row-item');
        items.forEach((item, idx) => {
            // Observe fewer items for performance, but ensure coverage
            if (idx % 5 === 0) {
                observerRef.current?.observe(item);
            }
        });

        return () => observerRef.current?.disconnect();
    }, [layout, preloadBatch]); // Depend on layout regen

    if (!layout) {
        return <div ref={containerRef} className={`w-full ${className}`} />;
    }

    return (
        <div ref={containerRef} className={`w-full flex flex-col gap-2 ${className}`}>
            {layout.tracks.map((track, trackIndex) => (
                <div
                    key={`row-${trackIndex}`}
                    className="flex flex-row gap-2 w-full"
                    style={{ height: track.photos[0]?.height || 'auto' }} // All photos in row have same height
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
            ))}
        </div>
    );
};
