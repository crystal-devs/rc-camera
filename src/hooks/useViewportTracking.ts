// hooks/useViewportTracking.ts - Viewport tracking for photo grid
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface ViewportState {
  visibleStartIndex: number;
  visibleEndIndex: number;
  bufferStartIndex: number;
  bufferEndIndex: number;
  totalItems: number;
}

interface UseViewportTrackingProps {
  itemCount: number;
  bufferSize?: number; // How many items beyond visible to consider "near viewport"
}

export const useViewportTracking = ({ 
  itemCount, 
  bufferSize = 20 
}: UseViewportTrackingProps) => {
  const [viewportState, setViewportState] = useState<ViewportState>({
    visibleStartIndex: 0,
    visibleEndIndex: 0,
    bufferStartIndex: 0,
    bufferEndIndex: bufferSize,
    totalItems: itemCount
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const itemElementsRef = useRef<Map<number, Element>>(new Map());

  // Register an item element for viewport tracking
  const registerItem = useCallback((index: number, element: Element | null) => {
    if (element) {
      itemElementsRef.current.set(index, element);
    } else {
      itemElementsRef.current.delete(index);
    }
  }, []);

  // Check if an index is within the buffer zone (visible + buffer)
  const isWithinBuffer = useCallback((index: number): boolean => {
    return index >= viewportState.bufferStartIndex && index <= viewportState.bufferEndIndex;
  }, [viewportState.bufferStartIndex, viewportState.bufferEndIndex]);

  // Check if an index is actually visible
  const isVisible = useCallback((index: number): boolean => {
    return index >= viewportState.visibleStartIndex && index <= viewportState.visibleEndIndex;
  }, [viewportState.visibleStartIndex, viewportState.visibleEndIndex]);

  // Get current scroll position info
  const getScrollInfo = useCallback(() => {
    return {
      isNearTop: viewportState.visibleStartIndex < 5,
      isNearBottom: viewportState.visibleEndIndex > itemCount - 10,
      visibleRange: {
        start: viewportState.visibleStartIndex,
        end: viewportState.visibleEndIndex
      },
      bufferRange: {
        start: viewportState.bufferStartIndex,
        end: viewportState.bufferEndIndex
      }
    };
  }, [viewportState, itemCount]);

  // Set up intersection observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visibleIndices: number[] = [];
        
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Find the index of this element
            for (const [index, element] of itemElementsRef.current.entries()) {
              if (element === entry.target) {
                visibleIndices.push(index);
                break;
              }
            }
          }
        });

        if (visibleIndices.length > 0) {
          const minVisible = Math.min(...visibleIndices);
          const maxVisible = Math.max(...visibleIndices);
          
          setViewportState(prev => ({
            ...prev,
            visibleStartIndex: minVisible,
            visibleEndIndex: maxVisible,
            bufferStartIndex: Math.max(0, minVisible - bufferSize),
            bufferEndIndex: Math.min(itemCount - 1, maxVisible + bufferSize),
            totalItems: itemCount
          }));
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px 0px'
      }
    );

    // Observe all registered elements
    itemElementsRef.current.forEach((element) => {
      observerRef.current?.observe(element);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [itemCount, bufferSize]);

  // Re-observe elements when items change
  useEffect(() => {
    if (observerRef.current) {
      itemElementsRef.current.forEach((element) => {
        observerRef.current?.observe(element);
      });
    }
  }, [itemCount]);

  return {
    viewportState,
    registerItem,
    isWithinBuffer,
    isVisible,
    getScrollInfo
  };
};