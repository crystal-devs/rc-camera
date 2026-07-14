'use client';

import React, { useCallback, useState } from 'react';
import { Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildGridSrcSet, buildSizes } from '@/utils/imageSrcset';
import { GalleryMedia, mediaFallbackSrc } from './types';

/**
 * Layer 1 — the single image-loading primitive for all galleries.
 *
 * Owns: srcset/sizes, placeholder background, fade-in, error state, load
 * priority, video badge. Knows nothing about events, roles, selection, or
 * moderation — wrappers compose those on top (Pinterest Gestalt pattern).
 */
export interface GalleryImageProps {
  media: GalleryMedia;
  alt: string;
  /** Exact rendered width in px — used for a pixel-perfect `sizes` attribute. */
  displayWidth: number;
  /** First-viewport images load eagerly with high fetch priority. */
  priority?: boolean;
  className?: string;
  onLoad?: () => void;
}

export const GalleryImage = React.memo(function GalleryImage({
  media,
  alt,
  displayWidth,
  priority = false,
  className,
  onLoad,
}: GalleryImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => setError(true), []);

  const isVideo = media.type === 'video';

  return (
    <div
      className={cn(
        'relative h-full w-full overflow-hidden bg-[#e9e9e9] dark:bg-[#262626]',
        className
      )}
    >
      {error ? (
        <div className="flex h-full w-full items-center justify-center">
          <Camera className="h-8 w-8 text-gray-300 dark:text-gray-600" />
        </div>
      ) : (
        <img
          srcSet={buildGridSrcSet(media.responsive_urls)}
          sizes={buildSizes(displayWidth)}
          src={mediaFallbackSrc(media)}
          alt={alt}
          className={cn(
            'h-full w-full object-cover transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          draggable={false}
        />
      )}

      {isVideo && !error && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="rounded-full border border-white/20 bg-black/40 p-3 shadow-lg backdrop-blur-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="h-6 w-6 drop-shadow-md">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
});
