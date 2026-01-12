
import { useEffect, useRef } from 'react';
import { Photo } from '@/types/PhotoGallery.types';
import { getBestImageUrl } from '@/types/PhotoGallery.types';

/**
 * Hook to preload images that are about to come into view.
 * Uses IntersectionObserver to detect when the user is near the end of the current viewport
 * and speculatively loads the next batch of images.
 * 
 * @param photos List of all photos
 * @param currentIndex Current index (if known) or used in conjunction with viewport detection
 * @param batchSize Number of images to preload (default 5)
 */
export const useImagePreloader = (
  photos: Photo[],
  batchSize: number = 3
) => {
  // Keep track of preloaded URLs to avoid duplicates
  const preloadedRef = useRef<Set<string>>(new Set());

  // Helper to preload a single image
  const preloadImage = (url: string) => {
    if (!url || preloadedRef.current.has(url)) return;

    const img = new Image();
    img.src = url;

    // 🚀 Browser Hint: Decode it immediately to avoid layout jank later
    if ('decode' in img) {
      img.decode().catch((err) => {
        // Ignore decode errors (e.g. valid offline/cancel)
        // console.debug('Preload decode interrupted', err);
      });
    }

    preloadedRef.current.add(url);
  };

  /**
   * Preloads images starting from a specific index.
   * This should be called when an item at `index` becomes visible.
   */
  const preloadBatch = (startIndex: number) => {
    const endIndex = Math.min(startIndex + batchSize, photos.length);

    for (let i = startIndex; i < endIndex; i++) {
      const photo = photos[i];
      // Preload the 'grid' size variant as that's what will be displayed
      const url = getBestImageUrl(photo, 'grid', true); // Assumes WebP support for preloading
      preloadImage(url);
    }
  };

  return { preloadBatch };
};