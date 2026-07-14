'use client';

import React, { useCallback } from 'react';
import { TransformedPhoto } from '@/types/events';
import { MediaGrid, MediaGridRenderCtx } from '@/components/media-gallery/MediaGrid';
import { GalleryImage } from '@/components/media-gallery/GalleryImage';
import { PhotoGridSkeleton } from '@/components/photo/skeleton/PhotoGridSkeleton';

/**
 * Layer 3 (guest) — maps the event's styling_config onto the shared MediaGrid
 * engine and renders plain clickable tiles. No moderation/selection code is
 * imported here, keeping the guest bundle light.
 */

interface GalleryStylingConfig {
  gallery?: {
    layout_id?: number; // 1: masonry, 2: justified rows
    grid_spacing?: number; // 0: xs, 1: sm, 2: md, 3: lg
    thumbnail_size?: number; // 0: small, 1: medium, 2: large
  };
}

interface GuestPhotoGridProps {
  photos: TransformedPhoto[];
  onPhotoClick: (photo: TransformedPhoto, index: number) => void;
  hasNextPage?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  stylingConfig?: GalleryStylingConfig | null;
}

const SPACING_PX: Record<number, number> = { 0: 4, 1: 8, 2: 12, 3: 16 };

function columnsFor(thumbnailSize: number) {
  return (width: number): number => {
    switch (thumbnailSize) {
      case 0: // small tiles
        if (width < 640) return 3;
        if (width < 768) return 4;
        if (width < 1024) return 5;
        return 6;
      case 2: // large tiles
        if (width < 640) return 1;
        if (width < 768) return 2;
        return 3;
      default: // medium
        if (width < 640) return 2;
        if (width < 768) return 3;
        return 5;
    }
  };
}

function rowHeightFor(thumbnailSize: number) {
  return (width: number): number => {
    const base = thumbnailSize === 0 ? 180 : thumbnailSize === 2 ? 350 : 240;
    return width < 500 ? base * 0.75 : base;
  };
}

export function GuestPhotoGrid({
  photos,
  onPhotoClick,
  hasNextPage = false,
  isLoadingMore = false,
  onLoadMore,
  stylingConfig,
}: GuestPhotoGridProps) {
  const gallery = stylingConfig?.gallery;
  const layout = gallery?.layout_id === 2 ? 'rows' : 'masonry';
  const thumbnailSize = gallery?.thumbnail_size ?? 1;
  const gap = SPACING_PX[gallery?.grid_spacing ?? 1] ?? 8;

  const renderItem = useCallback(
    ({ item, index, width, priority }: MediaGridRenderCtx<TransformedPhoto>) => (
      <div
        className="h-full w-full cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        role="button"
        tabIndex={0}
        aria-label={`Photo ${index + 1}`}
        onClick={() => onPhotoClick(item, index)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPhotoClick(item, index);
          }
        }}
      >
        <GalleryImage
          media={item}
          alt={`Photo ${index + 1}`}
          displayWidth={width}
          priority={priority}
          className="rounded-2xl"
        />
      </div>
    ),
    [onPhotoClick]
  );

  if (photos.length === 0) {
    return isLoadingMore || hasNextPage ? <PhotoGridSkeleton /> : null;
  }

  return (
    <div className="pt-2">
      <MediaGrid
        items={photos}
        layout={layout}
        columns={columnsFor(thumbnailSize)}
        targetRowHeight={rowHeightFor(thumbnailSize)}
        gap={gap}
        hasNextPage={hasNextPage}
        isLoadingMore={isLoadingMore}
        onLoadMore={onLoadMore}
        renderItem={renderItem}
      />

      {isLoadingMore && (
        <div className="mt-8">
          <PhotoGridSkeleton />
        </div>
      )}

      {!hasNextPage && !isLoadingMore && photos.length > 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          • All {photos.length} photos loaded •
        </div>
      )}
    </div>
  );
}
