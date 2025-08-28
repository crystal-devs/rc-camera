// components/photo/PinterestPhotoGrid.tsx - Fixed Aspect Ratio Version
import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import { PinterestPhotoCard } from "./PinterestPhotoCard";
import { TransformedPhoto } from "@/types/events";
import Skeleton from "./skeleton/skeleton";

interface GridItem extends TransformedPhoto {
  calculatedHeight: number;
  aspectRatio: number;
}

interface Position {
  x: number;
  y: number;
  width: number;
}

export const PinterestPhotoGrid: React.FC<{
  photos: TransformedPhoto[];
  onPhotoClick: (photo: TransformedPhoto, index: number) => void;
  hasNextPage?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  gridSize?: 'small' | 'medium' | 'large';
  spacing?: 'xs' | 'sm' | 'md' | 'lg';
}> = ({
  photos,
  onPhotoClick,
  hasNextPage = false,
  isLoadingMore = false,
  onLoadMore,
  gridSize = 'medium',
  spacing = 'sm'
}) => {
  const [likedPhotos, setLikedPhotos] = useState<Set<string>>(new Set());
  const [containerWidth, setContainerWidth] = useState(0);
  const [columnHeights, setColumnHeights] = useState<number[]>([]);
  const [itemPositions, setItemPositions] = useState<Map<string, Position>>(new Map());
  const [imageHeights, setImageHeights] = useState<Map<string, number>>(new Map());
  
  const containerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingTriggerRef = useRef<HTMLDivElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Responsive grid configuration based on gridSize and spacing
  const getGridConfig = useCallback((width: number) => {
    let columns: number;

    switch (gridSize) {
      case 'large':
        if (width < 640) columns = 1;
        else if (width < 768) columns = 2;
        else columns = 3;
        break;
      case 'medium':
        if (width < 640) columns = 2;
        else if (width < 768) columns = 3;
        else columns = 4;
        break;
      case 'small':
        if (width < 640) columns = 3;
        else if (width < 768) columns = 4;
        else if (width < 1024) columns = 5;
        else columns = 6;
        break;
      default:
        columns = 3;
    }

    let gap: number, padding: number;

    switch (spacing) {
      case 'xs':
        gap = 4;
        padding = 4;
        break;
      case 'sm':
        gap = 8;
        padding = 8;
        break;
      case 'md':
        gap = 12;
        padding = 12;
        break;
      case 'lg':
        gap = 16;
        padding = 16;
        break;
      default:
        gap = 8;
        padding = 8;
    }

    return { columns, gap, padding };
  }, [gridSize, spacing]);

  // Pre-calculate expected image heights based on aspect ratios
  const gridItems = useMemo<GridItem[]>(() => {
    if (!containerWidth) return [];

    const config = getGridConfig(containerWidth);
    const availableWidth = containerWidth - (config.padding * 2) - (config.gap * (config.columns - 1));
    const columnWidth = Math.floor(availableWidth / config.columns);

    return photos.map((photo) => {
      let aspectRatio = 1.0;
      
      if (photo.width && photo.height && photo.width > 0 && photo.height > 0) {
        aspectRatio = photo.height / photo.width;
      } else {
        // Random varied aspect ratios if no dimensions available
        const ratios = [0.6, 0.8, 1.0, 1.2, 1.5, 1.8, 2.0];
        aspectRatio = ratios[Math.floor(Math.random() * ratios.length)];
      }

      // Allow more variety in Pinterest style
      aspectRatio = Math.max(0.5, Math.min(aspectRatio, 3.0));
      const calculatedHeight = Math.round(columnWidth * aspectRatio);

      return {
        ...photo,
        calculatedHeight,
        aspectRatio
      };
    });
  }, [photos, containerWidth, getGridConfig]);

  // Handle actual image load and get real dimensions
  const handleImageLoad = useCallback((photoId: string, actualHeight: number) => {
    setImageHeights(prev => new Map(prev).set(photoId, actualHeight));
  }, []);

  // Calculate positions - let images determine their own height
  useEffect(() => {
    if (!containerWidth || gridItems.length === 0) return;

    const config = getGridConfig(containerWidth);
    const availableWidth = containerWidth - (config.padding * 2) - (config.gap * (config.columns - 1));
    const columnWidth = Math.floor(availableWidth / config.columns);
    
    const heights = Array(config.columns).fill(0);
    const positions = new Map<string, Position>();

    gridItems.forEach((item) => {
      // Find shortest column
      const shortestColumnIndex = heights.indexOf(Math.min(...heights));
      const x = config.padding + shortestColumnIndex * (columnWidth + config.gap);
      const y = heights[shortestColumnIndex];

      // Store position (no fixed height!)
      positions.set(item.id, {
        x,
        y,
        width: columnWidth
      });

      // Use actual loaded height if available, otherwise use calculated
      const itemHeight = imageHeights.get(item.id) || item.calculatedHeight;
      heights[shortestColumnIndex] += itemHeight + config.gap;
    });

    setColumnHeights([...heights]);
    setItemPositions(positions);
  }, [gridItems, containerWidth, getGridConfig, imageHeights]);

  // Container resize handler
  useEffect(() => {
    if (!containerRef.current) return;

    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserverRef.current.observe(containerRef.current);
    setContainerWidth(containerRef.current.getBoundingClientRect().width);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  // Infinite scroll
  useEffect(() => {
    if (!onLoadMore || !hasNextPage || isLoadingMore || !loadingTriggerRef.current) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !isLoadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    );

    observerRef.current.observe(loadingTriggerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasNextPage, isLoadingMore, onLoadMore, photos.length]);

  const handleLike = useCallback((photoId: string) => {
    setLikedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  }, []);

  const containerHeight = Math.max(...columnHeights, 300);

  if (photos.length === 0 && (isLoadingMore || hasNextPage)) {
    return <Skeleton />;
  }

  return (
    <div className="space-y-4">
      <div 
        ref={containerRef}
        className="relative w-full"
        style={{ minHeight: containerHeight }}
      >
        {gridItems.map((photo, index) => {
          const position = itemPositions.get(photo.id);
          if (!position) return null;

          return (
            <div
              key={photo.id}
              className="absolute"
              style={{
                left: position.x,
                top: position.y,
                width: position.width,
                // No height set - let image determine natural height!
              }}
            >
              <PinterestPhotoCard
                photo={photo}
                index={index}
                baseWidth={position.width}
                expectedHeight={photo.calculatedHeight}
                isLiked={likedPhotos.has(photo.id)}
                onLike={() => handleLike(photo.id)}
                onClick={() => onPhotoClick(photo, index)}
                onImageLoad={handleImageLoad}
              />
            </div>
          );
        })}

        {isLoadingMore && (
          <div className="mt-8">
            <Skeleton count={12} />
          </div>
        )}
      </div>

      {hasNextPage && !isLoadingMore && (
        <div ref={loadingTriggerRef} className="w-full h-1" />
      )}

      {!hasNextPage && photos.length > 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 text-sm">
            • All {photos.length} photos loaded •
          </div>
        </div>
      )}
    </div>
  );
};