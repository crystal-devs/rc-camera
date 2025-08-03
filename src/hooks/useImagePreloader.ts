// hooks/useImagePreloader.ts
import { useCallback, useRef } from 'react';

interface PreloadOptions {
  priority?: 'high' | 'low';
  loading?: 'eager' | 'lazy';
  decode?: 'sync' | 'async' | 'auto';
}

export function useImagePreloader() {
  const preloadCache = useRef(new Map<string, Promise<HTMLImageElement>>());
  const imageCache = useRef(new Map<string, HTMLImageElement>());

  const preloadImage = useCallback((
    src: string, 
    options: PreloadOptions = {}
  ): Promise<HTMLImageElement> => {
    // Return cached promise if already preloading
    if (preloadCache.current.has(src)) {
      return preloadCache.current.get(src)!;
    }

    // Return cached image if already loaded
    if (imageCache.current.has(src)) {
      return Promise.resolve(imageCache.current.get(src)!);
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      
      // Set attributes for better performance
      if (options.loading) img.loading = options.loading;
      if (options.decode) img.decoding = options.decode;
      
      img.onload = () => {
        imageCache.current.set(src, img);
        preloadCache.current.delete(src);
        resolve(img);
      };
      
      img.onerror = () => {
        preloadCache.current.delete(src);
        reject(new Error(`Failed to load image: ${src}`));
      };
      
      img.src = src;
    });

    preloadCache.current.set(src, promise);
    return promise;
  }, []);

  const preloadImages = useCallback((
    sources: string[], 
    options: PreloadOptions = {}
  ): Promise<HTMLImageElement[]> => {
    return Promise.all(sources.map(src => preloadImage(src, options)));
  }, [preloadImage]);

  const isImageCached = useCallback((src: string): boolean => {
    return imageCache.current.has(src);
  }, []);

  const clearCache = useCallback(() => {
    preloadCache.current.clear();
    imageCache.current.clear();
  }, []);

  const getCacheSize = useCallback(() => {
    return {
      preloading: preloadCache.current.size,
      cached: imageCache.current.size
    };
  }, []);

  return {
    preloadImage,
    preloadImages,
    isImageCached,
    clearCache,
    getCacheSize
  };
}