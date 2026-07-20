'use client';

import React, {
  ReactNode,
  RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { GalleryLayout, GalleryMedia } from './types';
import { computeJustifiedLayout, computeMasonryLayout } from './layouts';

/**
 * Layer 2 — one virtualized gallery engine for every screen (guest + admin).
 *
 * Pinterest/Gestalt model: layout is computed up front from item aspect
 * ratios (pure function), items are absolutely positioned, and only the
 * viewport plus a buffer is mounted. Works against window scroll or a custom
 * scroll container, with masonry or justified-rows layout as a parameter.
 * Scales to thousands of items: the DOM holds only ~2-3 screens of tiles.
 */

export interface MediaGridRenderCtx<T extends GalleryMedia> {
  item: T;
  /** Index in the original items array. */
  index: number;
  width: number;
  height: number;
  /** True for first-viewport tiles that should load eagerly. */
  priority: boolean;
}

export interface MediaGridProps<T extends GalleryMedia> {
  items: T[];
  layout?: 'masonry' | 'rows';
  /** Masonry column count, fixed or responsive to container width. */
  columns?: number | ((containerWidth: number) => number);
  /** Justified-rows target height, fixed or responsive to container width. */
  targetRowHeight?: number | ((containerWidth: number) => number);
  gap?: number;
  /** Scroll happens in this element instead of the window (admin dashboard). */
  scrollContainerRef?: RefObject<HTMLElement | null>;
  hasNextPage?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  /** Start fetching the next page when this many items from the end become visible. */
  loadMoreThreshold?: number;
  /** Number of leading tiles that load eagerly with high priority. */
  priorityCount?: number;
  renderItem: (ctx: MediaGridRenderCtx<T>) => ReactNode;
  className?: string;
}

const defaultColumns = (width: number) => {
  if (width < 640) return 2;
  if (width < 1024) return 3;
  if (width < 1440) return 4;
  return 5;
};

const defaultRowHeight = (width: number) => {
  if (width < 500) return width / 2;
  if (width < 900) return width / 3;
  return width / 4;
};

/** Bucket size (px) for quantizing the visible range — re-renders happen only when scrolling crosses a bucket boundary. */
const RANGE_BUCKET = 256;

function useContainerWidth(ref: RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/**
 * Visible y-range relative to the grid container, with ~1.25 screens of
 * buffer each way. Reads getBoundingClientRect once per animation frame, so
 * content above the grid (banners, headers) can change height freely without
 * any offset bookkeeping.
 */
function useVisibleRange(
  containerRef: RefObject<HTMLDivElement | null>,
  scrollContainerRef?: RefObject<HTMLElement | null>
) {
  const [range, setRange] = useState({ start: 0, end: 1600 });

  useEffect(() => {
    const scroller = scrollContainerRef?.current ?? null;
    const scrollTarget: EventTarget = scroller ?? window;
    let ticking = false;
    let disposed = false;

    const update = () => {
      ticking = false;
      if (disposed) return;
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      let relativeTop: number;
      let viewportHeight: number;
      if (scroller) {
        relativeTop = rect.top - scroller.getBoundingClientRect().top;
        viewportHeight = scroller.clientHeight;
      } else {
        relativeTop = rect.top;
        viewportHeight = window.innerHeight;
      }

      const buffer = viewportHeight * 1.25;
      const start =
        Math.floor((-relativeTop - buffer) / RANGE_BUCKET) * RANGE_BUCKET;
      const end =
        Math.ceil((-relativeTop + viewportHeight + buffer) / RANGE_BUCKET) *
        RANGE_BUCKET;

      setRange((prev) =>
        prev.start === start && prev.end === end ? prev : { start, end }
      );
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    scrollTarget.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      disposed = true;
      scrollTarget.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [containerRef, scrollContainerRef]);

  return range;
}

export function MediaGrid<T extends GalleryMedia>({
  items,
  layout = 'rows',
  columns = defaultColumns,
  targetRowHeight = defaultRowHeight,
  gap = 8,
  scrollContainerRef,
  hasNextPage = false,
  isLoadingMore = false,
  onLoadMore,
  loadMoreThreshold = 20,
  priorityCount = 8,
  renderItem,
  className,
}: MediaGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef);
  const range = useVisibleRange(containerRef, scrollContainerRef);

  const galleryLayout = useMemo<GalleryLayout<T> | null>(() => {
    if (!containerWidth || items.length === 0) return null;
    if (layout === 'masonry') {
      const cols = Math.max(
        1,
        typeof columns === 'function' ? columns(containerWidth) : columns
      );
      return computeMasonryLayout(items, containerWidth, cols, gap);
    }
    const rowHeight = Math.max(
      40,
      typeof targetRowHeight === 'function'
        ? targetRowHeight(containerWidth)
        : targetRowHeight
    );
    return computeJustifiedLayout(items, containerWidth, rowHeight, gap);
  }, [items, containerWidth, layout, columns, targetRowHeight, gap]);

  const visibleItems = useMemo(() => {
    if (!galleryLayout) return [];
    return galleryLayout.items.filter(
      (p) => p.y + p.height >= range.start && p.y <= range.end
    );
  }, [galleryLayout, range]);

  // Infinite scroll: request the next page when the tail approaches the
  // viewport. Guarded per items.length so one page is requested at a time.
  const lastRequestedAtRef = useRef(-1);
  useEffect(() => {
    if (!onLoadMore || !hasNextPage || isLoadingMore) return;
    if (visibleItems.length === 0) return;
    const lastVisibleIndex = visibleItems[visibleItems.length - 1].index;
    if (
      lastVisibleIndex >= items.length - loadMoreThreshold &&
      lastRequestedAtRef.current !== items.length
    ) {
      lastRequestedAtRef.current = items.length;
      onLoadMore();
    }
  }, [
    visibleItems,
    items.length,
    hasNextPage,
    isLoadingMore,
    onLoadMore,
    loadMoreThreshold,
  ]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: galleryLayout?.totalHeight ?? 0,
      }}
    >
      {visibleItems.map((positioned) => (
        <div
          key={positioned.item.id}
          style={{
            position: 'absolute',
            left: positioned.x,
            top: positioned.y,
            width: positioned.width,
            height: positioned.height,
            contain: 'layout paint',
          }}
        >
          {renderItem({
            item: positioned.item,
            index: positioned.index,
            width: positioned.width,
            height: positioned.height,
            priority: positioned.index < priorityCount,
          })}
        </div>
      ))}
    </div>
  );
}
