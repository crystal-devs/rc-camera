// components/photo/PinterestPhotoGrid.tsx - UPDATED with viewport tracking
import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import { PinterestPhotoCard } from "./PinterestPhotoCard";
import { TransformedPhoto } from "@/types/events";
import Skeleton from "./skeleton/skeleton";
import { STYLING_CONSTANTS, getStylingConfig } from '@/constants/styling.constant';

interface GridItem extends TransformedPhoto {
  calculatedHeight: number;
  aspectRatio: number;
}

interface Position {
  x: number;
  y: number;
  width: number;
}

interface ViewportInfo {
  visibleStartIndex: number;
  visibleEndIndex: number;
  bufferStartIndex: number;
  bufferEndIndex: number;
}

export const PinterestPhotoGrid: React.FC<{
  photos: TransformedPhoto[];
  onPhotoClick: (photo: TransformedPhoto, index: number) => void;
  hasNextPage?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  // NEW: Viewport tracking callback
  onViewportChange?: (viewportInfo: ViewportInfo) => void;
  // Existing styling config prop
  eventStyling?: {
    gallery?: {
      layout_id: number;
      grid_spacing: number;
      thumbnail_size: number;
    };
    theme?: {
      theme_id: number;
      fontset_id: number;
    };
  };
}> = ({
  photos,
  onPhotoClick,
  hasNextPage = false,
  isLoadingMore = false,
  onLoadMore,
  onViewportChange, // NEW
  eventStyling
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

    // NEW: Viewport tracking refs
    const viewportObserverRef = useRef<IntersectionObserver | null>(null);
    const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());

    // Get styling configuration from constants
    const stylingConfig = useMemo(() => {
      if (eventStyling) {
        return getStylingConfig({ styling_config: eventStyling });
      }
      return null;
    }, [eventStyling]);

    // Convert styling config to grid parameters
    const getGridConfigFromStyling = useCallback((width: number) => {
      const thumbnail_size = eventStyling?.gallery?.thumbnail_size ?? 1; // 0: large, 1: medium, 2: small
      const grid_spacing = eventStyling?.gallery?.grid_spacing ?? 1; // 0: xs, 1: sm, 2: md, 3: lg

      let columns: number;

      switch (thumbnail_size) {
        case 0: // small
          if (width < 640) columns = 3;
          else if (width < 768) columns = 4;
          else if (width < 1024) columns = 5;
          else columns = 6;
          break;
        case 1: // medium
          if (width < 640) columns = 2;
          else if (width < 768) columns = 3;
          else columns = 4;
          break;
        case 2: // large
          if (width < 640) columns = 1;
          else if (width < 768) columns = 2;
          else columns = 3;
          break;
        default:
          columns = 3;
      }

      let gap: number, padding: number;

      switch (grid_spacing) {
        case 0: // xs
          gap = 4;
          padding = 4;
          break;
        case 1: // sm
          gap = 8;
          padding = 8;
          break;
        case 2: // md
          gap = 12;
          padding = 12;
          break;
        case 3: // lg
          gap = 16;
          padding = 16;
          break;
        default:
          gap = 8;
          padding = 8;
      }

      return { columns, gap, padding };
    }, [eventStyling]);

    // Main grid configuration selector
    const getGridConfig = useCallback((width: number) => {
      return getGridConfigFromStyling(width);
    }, [getGridConfigFromStyling]);

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

    // NEW: Register item reference for viewport tracking
    const registerItemRef = useCallback((index: number, element: HTMLDivElement | null) => {
      if (element) {
        itemRefs.current.set(index, element);
      } else {
        itemRefs.current.delete(index);
      }
    }, []);

    // NEW: Calculate and report viewport info
    const updateViewportInfo = useCallback(() => {
      if (visibleIndices.size === 0 || !onViewportChange) return;

      const sortedIndices = Array.from(visibleIndices).sort((a, b) => a - b);
      const visibleStartIndex = sortedIndices[0];
      const visibleEndIndex = sortedIndices[sortedIndices.length - 1];
      const bufferSize = 20;

      const viewportInfo: ViewportInfo = {
        visibleStartIndex,
        visibleEndIndex,
        bufferStartIndex: Math.max(0, visibleStartIndex - bufferSize),
        bufferEndIndex: Math.min(photos.length - 1, visibleEndIndex + bufferSize)
      };

      onViewportChange(viewportInfo);
    }, [visibleIndices, onViewportChange, photos.length]);

    // NEW: Set up viewport tracking observer
    useEffect(() => {
      if (!onViewportChange) return;

      if (viewportObserverRef.current) {
        viewportObserverRef.current.disconnect();
      }

      viewportObserverRef.current = new IntersectionObserver(
        (entries) => {
          setVisibleIndices(prev => {
            const newVisible = new Set(prev);

            entries.forEach(entry => {
              // Find index for this element
              for (const [index, element] of itemRefs.current.entries()) {
                if (element === entry.target) {
                  if (entry.isIntersecting) {
                    newVisible.add(index);
                  } else {
                    newVisible.delete(index);
                  }
                  break;
                }
              }
            });

            return newVisible;
          });
        },
        {
          threshold: 0.1,
          rootMargin: '100px 0px' // Track items slightly before they become visible
        }
      );

      // Observe all current items
      itemRefs.current.forEach(element => {
        viewportObserverRef.current?.observe(element);
      });

      return () => {
        viewportObserverRef.current?.disconnect();
      };
    }, [photos.length, onViewportChange]);

    // NEW: Update viewport info when visible indices change
    useEffect(() => {
      updateViewportInfo();
    }, [updateViewportInfo]);

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

    // Get container styles based on theme
    const getContainerStyles = useMemo(() => {
      if (stylingConfig?.theme) {
        return {
          backgroundColor: stylingConfig.theme.colors.background,
          color: stylingConfig.theme.colors.text,
          fontFamily: stylingConfig.fontset.fonts.primary
        };
      }
      return {};
    }, [stylingConfig]);

    const containerHeight = Math.max(...columnHeights, 300);

    if (photos.length === 0 && (isLoadingMore || hasNextPage)) {
      return <Skeleton />;
    }

    return (
      <div className="space-y-4 pt-10" style={getContainerStyles}>
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
                ref={(el) => registerItemRef(index, el)} // NEW: Register for viewport tracking
                className="absolute"
                style={{
                  left: position.x,
                  top: position.y,
                  width: position.width,
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
            <div
              className="text-sm"
              style={{
                color: stylingConfig?.theme?.colors?.textSecondary || '#6c757d'
              }}
            >
              • All {photos.length} photos loaded •
            </div>
          </div>
        )}

        {/* Apply CSS variables from styling config */}
        <style jsx>{`
        .space-y-4 {
          ${stylingConfig?.gridSpacing?.css ?
            Object.entries(stylingConfig.gridSpacing.css)
              .map(([key, value]) => `${key}: ${value};`)
              .join(' ')
            : ''
          }
          ${stylingConfig?.thumbnailSize?.css ?
            Object.entries(stylingConfig.thumbnailSize.css)
              .map(([key, value]) => `${key}: ${value};`)
              .join(' ')
            : ''
          }
        }
      `}</style>
      </div>
    );
  };