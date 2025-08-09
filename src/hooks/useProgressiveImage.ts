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

  // 🚀 SMART URL SELECTION: Choose best URL based on context and browser support
  const { src, placeholder, quality, isOptimized } = useMemo(() => {
    // 🔧 TEMPORARY PHOTOS: Use blob URL immediately
    if (photo.isTemporary && photo.imageUrl.startsWith('blob:')) {
      return {
        src: photo.imageUrl,
        placeholder: null,
        quality: 'original' as const,
        isOptimized: false
      };
    }

    // 🔧 PROCESSING PHOTOS: Show current URL (preview)
    if (photo.processing || photo.status === 'uploading') {
      return {
        src: photo.imageUrl,
        placeholder: null,
        quality: 'medium' as const,
        isOptimized: true
      };
    }

    // 🚀 OPTIMIZED VARIANT SELECTION: Based on context and browser support
    const supportsWebP = checkWebPSupport();
    const variants = photo.image_variants;

    if (variants) {
      let targetVariant;
      let targetQuality: 'low' | 'medium' | 'high' | 'original';

      switch (context) {
        case 'grid':
          // Grid: Use small variants for fast loading
          targetVariant = variants.small;
          targetQuality = 'low';
          break;
        case 'preview':
          // Preview: Use medium variants for good quality
          targetVariant = variants.medium;
          targetQuality = 'medium';
          break;
        case 'lightbox':
          // Lightbox: Use large variants for best quality
          targetVariant = variants.large;
          targetQuality = 'high';
          break;
        default:
          targetVariant = variants.medium;
          targetQuality = 'medium';
      }

      // Choose WebP if supported, otherwise JPEG
      const selectedUrl = supportsWebP && targetVariant?.webp?.url 
        ? targetVariant.webp.url 
        : targetVariant?.jpeg?.url;

      if (selectedUrl) {
        return {
          src: selectedUrl,
          placeholder: variants.small?.jpeg?.url || photo.thumbnailUrl,
          quality: targetQuality,
          isOptimized: true
        };
      }
    }

    // 🔧 FALLBACK: Use original or thumbnail
    const fallbackSrc = context === 'lightbox' 
      ? photo.imageUrl 
      : photo.thumbnailUrl || photo.imageUrl;

    return {
      src: fallbackSrc,
      placeholder: photo.thumbnailUrl !== fallbackSrc ? photo.thumbnailUrl : null,
      quality: context === 'lightbox' ? 'original' as const : 'medium' as const,
      isOptimized: false
    };
  }, [photo, context]);

  // 🔧 PRELOAD IMAGE: Better loading experience
  useEffect(() => {
    setLoaded(false);
    setError(false);

    if (!src) return;

    const img = new Image();
    
    img.onload = () => {
      setLoaded(true);
      setError(false);
    };
    
    img.onerror = () => {
      setError(true);
      setLoaded(false);
      console.error('Failed to load image:', src);
    };

    img.src = src;

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
    isOptimized,
    quality
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