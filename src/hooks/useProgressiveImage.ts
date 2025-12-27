// hooks/useProgressiveImage.ts - OPTIMIZED for instant loading

import { useState, useEffect, useMemo } from 'react';
import { Photo } from '@/types/PhotoGallery.types';

interface UseProgressiveImageReturn {
  src: string;
  loaded: boolean;
  error: boolean;
  placeholder: string | null;
  isOptimized: boolean;
  quality: 'low' | 'medium' | 'high' | 'original';
}

export function useProgressiveImage(
  photo: Photo,
  context: 'grid' | 'lightbox' | 'preview' = 'grid'
): UseProgressiveImageReturn {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // 🚀 SIMPLIFIED: Just return the right src for context
  const { src, placeholder } = useMemo(() => {
    // Temporary photos
    if (photo.isTemporary && photo.imageUrl.startsWith('blob:')) {
      return { src: photo.imageUrl, placeholder: null };
    }

    // For grid: let srcset handle it, just provide fallback
    if (context === 'grid' && photo.progressiveUrls) {
      return {
        src: photo.progressiveUrls.display,
        placeholder: photo.progressiveUrls.placeholder
      };
    }

    // For lightbox: use full quality
    if (context === 'lightbox' && photo.progressiveUrls) {
      return {
        src: photo.progressiveUrls.full,
        placeholder: photo.progressiveUrls.display
      };
    }

    // Fallback
    return {
      src: photo.imageUrl,
      placeholder: photo.thumbnailUrl
    };
  }, [photo, context]);

  // Rest of the hook remains the same...
  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.src = src;

    // 🚀 OPTIMIZATION: Check if image is already cached/loaded
    if (img.complete) {
      setLoaded(true);
      setError(false);
    } else {
      setLoaded(false);
      setError(false);
      img.onload = () => setLoaded(true);
      img.onerror = () => setError(true);
    }

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return {
    src,
    loaded,
    error,
    placeholder,
    isOptimized: true, // Always true for now as we're using efficient formats
    quality: 'high'    // effective quality
  };
}

/**
 * 🚀 WEBP DETECTION: Check browser support
 */
function checkWebPSupport(): boolean {
  // Check if we're in browser
  if (typeof window === 'undefined') return false;

  // Check cached result
  const cached = sessionStorage.getItem('webp-support');
  if (cached !== null) {
    return cached === 'true';
  }

  // Test WebP support
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  const supportsWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;

  // Cache result
  sessionStorage.setItem('webp-support', supportsWebP.toString());

  return supportsWebP;
}

/**
 * 🚀 HOOK: Image intersection observer for lazy loading
 */
export function useIntersection(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, options]);

  return isInView;
}