import { Photo } from '@/types/PhotoGallery.types';
import { useState, useEffect, useCallback } from 'react';

export function useProgressiveImage(
  photo: Photo, 
  context: 'grid' | 'modal' | 'fullscreen' = 'grid'
) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Get the appropriate URL based on context - NEVER use original for display
  const getContextUrl = useCallback(() => {
    switch (context) {
      case 'grid':
        return photo.progressiveUrls?.thumbnail || photo.thumbnail || photo.imageUrl;
      case 'modal':
        return photo.progressiveUrls?.display || photo.imageUrl;
      case 'fullscreen':
        return photo.progressiveUrls?.full || photo.imageUrl;
      default:
        return photo.progressiveUrls?.thumbnail || photo.thumbnail || photo.imageUrl;
    }
  }, [photo, context]);

  const src = getContextUrl();
  const placeholder = photo.progressiveUrls?.placeholder || photo.thumbnail || photo.imageUrl;

  useEffect(() => {
    setLoaded(false);
    setError(false);
    
    const img = new Image();
    
    img.onload = () => {
      setLoaded(true);
      setError(false);
    };
    
    img.onerror = () => {
      setError(true);
      setLoaded(false);
    };
    
    img.src = src;
    
    // Cleanup
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return {
    src,
    loaded,
    error,
    placeholder
  };
}