// Simple and effective FullscreenPhotoViewer - Google Photos approach with smart caching
import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon, InfoIcon, TrashIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Photo } from './PhotoGallery.types';
import { useFullscreen } from '@/lib/FullscreenContext';

// 💾 Global image cache to prevent re-downloading
const imageCache = new Map<string, {
  lowRes: string;
  highRes: string;
  isHighResLoaded: boolean;
  imageElement?: HTMLImageElement;
}>();

// Cache cleanup - optimized for live event photo sharing
const MAX_CACHE_SIZE = 25; // Reduced from 50 for event context
const cleanupCache = () => {
  if (imageCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(imageCache.entries());
    // Remove oldest 40% of entries for more aggressive cleanup
    const removeCount = Math.floor(MAX_CACHE_SIZE * 0.4);
    for (let i = 0; i < removeCount; i++) {
      imageCache.delete(entries[i][0]);
    }
    console.log(`🧹 Event cache cleaned up, size: ${imageCache.size}`);
  }
};

interface FullscreenPhotoViewerProps {
  selectedPhoto: Photo;
  selectedPhotoIndex: number | null;
  photos: Photo[];
  userPermissions: {
    download: boolean;
    delete: boolean;
  };
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  setPhotoInfoOpen: (open: boolean) => void;
  deletePhoto: (photoId: string) => void;
  downloadPhoto: (photo: Photo) => void;
}

const FullscreenPhotoViewer: React.FC<FullscreenPhotoViewerProps> = ({
  selectedPhoto,
  selectedPhotoIndex,
  photos,
  userPermissions,
  onClose,
  onPrev,
  onNext,
  setPhotoInfoOpen,
  deletePhoto,
  downloadPhoto
}) => {
  const { setIsFullscreenActive } = useFullscreen();
  const [showControls, setShowControls] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHighResLoading, setIsHighResLoading] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const imageRef = useRef<HTMLImageElement>(null);

  // 🎯 Google Photos approach with smart caching: Start with low-res, upgrade to high-res
  const photoId = selectedPhoto.id;
  const lowResUrl = selectedPhoto?.progressiveUrls?.thumbnail || selectedPhoto?.thumbnail || selectedPhoto?.imageUrl;
  const highResUrl = selectedPhoto?.progressiveUrls?.original || selectedPhoto?.progressiveUrls?.full || selectedPhoto?.imageUrl;

  // Initialize cache entry for current photo
  useEffect(() => {
    if (!imageCache.has(photoId)) {
      imageCache.set(photoId, {
        lowRes: lowResUrl,
        highRes: highResUrl,
        isHighResLoaded: false
      });
      cleanupCache();
    }
  }, [photoId, lowResUrl, highResUrl]);

  // Load high-res image after low-res is displayed (with caching)
  useEffect(() => {
    if (!highResUrl || lowResUrl === highResUrl) return;

    const cacheEntry = imageCache.get(photoId);

    // ✅ Check if high-res is already cached
    if (cacheEntry?.isHighResLoaded) {
      console.log('💾 Using cached high-res image for:', photoId);
      if (imageRef.current) {
        imageRef.current.src = highResUrl;
        setIsHighResLoading(false);
      }
      return;
    }

    console.log('🔍 Loading high-res image for:', photoId);
    setIsHighResLoading(true);

    const highResImage = new Image();

    highResImage.onload = () => {
      console.log('✅ High-res image loaded and cached:', photoId);

      // 💾 Update cache with loaded state
      if (cacheEntry) {
        cacheEntry.isHighResLoaded = true;
        cacheEntry.imageElement = highResImage;
      }

      if (imageRef.current && selectedPhoto.id === photoId) {
        imageRef.current.src = highResUrl;
        setIsHighResLoading(false);
      }
    };

    highResImage.onerror = () => {
      console.warn('❌ High-res image failed to load:', photoId);
      setIsHighResLoading(false);
    };

    // Small delay to ensure low-res is displayed first
    const timer = setTimeout(() => {
      highResImage.src = highResUrl;
    }, 100);

    return () => {
      clearTimeout(timer);
      highResImage.onload = null;
      highResImage.onerror = null;
    };
  }, [photoId, lowResUrl, highResUrl, selectedPhoto.id]);

  // Preload adjacent images (with smart caching)
  useEffect(() => {
    const preloadAdjacentImages = () => {
      const adjacentIndices = [
        selectedPhotoIndex !== null && selectedPhotoIndex > 0 ? selectedPhotoIndex - 1 : null,
        selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1 ? selectedPhotoIndex + 1 : null
      ].filter(idx => idx !== null) as number[];

      adjacentIndices.forEach(index => {
        const photo = photos[index];
        const photoId = photo.id;
        const lowRes = photo?.progressiveUrls?.thumbnail || photo?.thumbnail;
        const highRes = photo?.progressiveUrls?.original || photo?.progressiveUrls?.full || photo?.imageUrl;

        if (lowRes) {
          // Check if already cached
          if (!imageCache.has(photoId)) {
            imageCache.set(photoId, {
              lowRes,
              highRes: highRes || lowRes,
              isHighResLoaded: false
            });

            // Preload low-res for instant display
            const preloadImg = new Image();
            preloadImg.onload = () => {
              console.log(`🔄 Cached low-res for photo ${index + 1}`);
            };
            preloadImg.src = lowRes;

            // Also preload high-res for smoother experience
            if (highRes && highRes !== lowRes) {
              setTimeout(() => {
                const highResImg = new Image();
                highResImg.onload = () => {
                  const cacheEntry = imageCache.get(photoId);
                  if (cacheEntry) {
                    cacheEntry.isHighResLoaded = true;
                    cacheEntry.imageElement = highResImg;
                  }
                  console.log(`🚀 Preloaded high-res for photo ${index + 1}`);
                };
                highResImg.src = highRes;
              }, 500); // Delay high-res preload to not interfere with current image
            }
          } else {
            console.log(`💾 Photo ${index + 1} already cached`);
          }
        }
      });

      cleanupCache();
    };

    const preloadTimer = setTimeout(preloadAdjacentImages, 500);
    return () => clearTimeout(preloadTimer);
  }, [selectedPhoto, selectedPhotoIndex, photos]);

  // Reset states when photo changes and check cache
  useEffect(() => {
    const cacheEntry = imageCache.get(photoId);

    if (cacheEntry?.isHighResLoaded) {
      // Image is already in cache - no need to load again
      setImageLoaded(true);
      setIsHighResLoading(false);
      console.log('💾 Photo loaded from cache:', photoId);
    } else {
      // New photo - reset loading states
      setImageLoaded(false);
      setIsHighResLoading(false);
    }
  }, [photoId]);

  // Touch handling
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const isDraggingRef = useRef(false);

  const SWIPE_THRESHOLD = 50;
  const SWIPE_TIMEOUT = 300;
  const MAX_DRAG = 100;

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (!isDraggingRef.current) {
        setShowControls(false);
      }
    }, 3000);
  }, []);

  // Navigation
  const handleNavigation = useCallback((direction: 'prev' | 'next') => {
    console.log(`📸 Navigation: ${direction}`);

    if (direction === 'prev' && selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      onPrev();
    } else if (direction === 'next' && selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1) {
      onNext();
    }
  }, [selectedPhotoIndex, photos.length, onPrev, onNext]);

  // Touch handlers
  const handleTouchStart = useCallback((e: Event) => {
    const touchEvent = e as TouchEvent;
    if (touchEvent.touches.length === 1) {
      const touch = touchEvent.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };
      isDraggingRef.current = false;
      setDragOffset(0);
    }
  }, []);

  const handleTouchMove = useCallback((e: Event) => {
    const touchEvent = e as TouchEvent;
    if (!touchStartRef.current) return;

    const touch = touchEvent.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.preventDefault();
      isDraggingRef.current = true;

      let limitedDragOffset = deltaX * 0.5;

      const atFirstPhoto = selectedPhotoIndex === 0;
      const atLastPhoto = selectedPhotoIndex === photos.length - 1;

      if ((deltaX > 0 && atFirstPhoto) || (deltaX < 0 && atLastPhoto)) {
        limitedDragOffset = deltaX * 0.2;
      }

      limitedDragOffset = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, limitedDragOffset));
      setDragOffset(limitedDragOffset);
    }
  }, [selectedPhotoIndex, photos.length]);

  const handleTouchEnd = useCallback((e: Event) => {
    const touchEvent = e as TouchEvent;
    if (!touchStartRef.current || touchEvent.changedTouches.length !== 1) return;

    const touch = touchEvent.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    const velocity = Math.abs(deltaX) / deltaTime;

    setDragOffset(0);
    isDraggingRef.current = false;

    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 1.5;
    const isValidSwipe = isHorizontalSwipe &&
      (Math.abs(deltaX) > SWIPE_THRESHOLD || velocity > 0.3) &&
      deltaTime < SWIPE_TIMEOUT;

    if (isValidSwipe) {
      e.preventDefault();
      if (deltaX > 0) {
        handleNavigation('prev');
      } else {
        handleNavigation('next');
      }
    }

    touchStartRef.current = null;
    resetControlsTimeout();
  }, [handleNavigation, resetControlsTimeout]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    resetControlsTimeout();

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        handleNavigation('prev');
        break;
      case 'ArrowRight':
        e.preventDefault();
        handleNavigation('next');
        break;
      case ' ':
        e.preventDefault();
        setShowControls(prev => !prev);
        break;
    }
  }, [onClose, handleNavigation, resetControlsTimeout]);

  // Button handlers
  const handlePrevClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleNavigation('prev');
  }, [handleNavigation]);

  const handleNextClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleNavigation('next');
  }, [handleNavigation]);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isDraggingRef.current) {
      setShowControls(prev => !prev);
    }
  }, []);

  // Action handlers
  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    downloadPhoto({ ...selectedPhoto, imageUrl: highResUrl });
  }, [downloadPhoto, selectedPhoto, highResUrl]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this photo?')) {
      deletePhoto(selectedPhoto.id);
    }
  }, [deletePhoto, selectedPhoto.id]);

  const handleInfo = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoInfoOpen(true);
  }, [setPhotoInfoOpen]);

  // Image load handler
  const handleImageLoad = useCallback(() => {
    console.log('📸 Image rendered successfully');
    setImageLoaded(true);
  }, []);

  // Setup effect
  useEffect(() => {
    setIsFullscreenActive(true);
    document.body.style.overflow = 'hidden';
    resetControlsTimeout();

    const handleMouseMove = () => resetControlsTimeout();

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousemove', handleMouseMove);

    const viewerElement = document.querySelector('[data-photo-viewer]');
    if (viewerElement) {
      viewerElement.addEventListener('touchstart', handleTouchStart, { passive: false });
      viewerElement.addEventListener('touchmove', handleTouchMove, { passive: false });
      viewerElement.addEventListener('touchend', handleTouchEnd, { passive: false });
    }

    return () => {
      setIsFullscreenActive(false);
      document.body.style.overflow = 'unset';

      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousemove', handleMouseMove);

      if (viewerElement) {
        viewerElement.removeEventListener('touchstart', handleTouchStart);
        viewerElement.removeEventListener('touchmove', handleTouchMove);
        viewerElement.removeEventListener('touchend', handleTouchEnd);
      }

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [setIsFullscreenActive, handleKeyDown, resetControlsTimeout, handleTouchStart, handleTouchMove, handleTouchEnd]);

  if (!selectedPhoto) return null;

  const canGoPrev = selectedPhotoIndex !== null && selectedPhotoIndex > 0;
  const canGoNext = selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1;

  // Calculate image container dimensions to fit screen while maintaining aspect ratio
  const imageContainerStyle = useMemo(() => {
    // Screen dimensions with padding
    const maxWidth = window.innerWidth - 32; // 2rem padding
    const maxHeight = window.innerHeight - 32; // 2rem padding

    if (!selectedPhoto.metadata?.width || !selectedPhoto.metadata?.height) {
      return {
        maxHeight: `${maxHeight}px`,
        maxWidth: `${maxWidth}px`,
        width: '100%',
        height: `${Math.min(maxHeight, maxWidth * 0.75)}px` // 4:3 aspect ratio fallback
      };
    }

    const { width: imageWidth, height: imageHeight } = selectedPhoto.metadata;
    const imageAspectRatio = imageWidth / imageHeight;
    const screenAspectRatio = maxWidth / maxHeight;

    let containerWidth: number;
    let containerHeight: number;

    if (imageAspectRatio > screenAspectRatio) {
      // Image is wider than screen - constrain by width
      containerWidth = maxWidth;
      containerHeight = maxWidth / imageAspectRatio;
    } else {
      // Image is taller than screen - constrain by height
      containerHeight = maxHeight;
      containerWidth = maxHeight * imageAspectRatio;
    }

    return {
      width: `${containerWidth}px`,
      height: `${containerHeight}px`,
      maxWidth: `${maxWidth}px`,
      maxHeight: `${maxHeight}px`
    };
  }, [selectedPhoto.metadata]);

  // Quality indicator
  const getQualityText = () => {
    const cacheEntry = imageCache.get(photoId);
    const isHighResCached = cacheEntry?.isHighResLoaded;

    if (imageLoaded && !isHighResLoading && isHighResCached) return '🎯 High Quality';
    if (isHighResLoading) return '⏳ Enhancing...';
    if (imageLoaded) return '📱 Standard Quality';
    return '⏳ Loading...';
  };

  console.log(photos, 'photosphotosphotos')
  return (
    <div
      className="fixed inset-0 z-50 bg-black m-0"
      data-photo-viewer
    >
      {/* Header controls */}
      <div className={`absolute top-0 left-0 right-0 z-10 transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
        }`}>
        <div className="bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between p-4 text-white">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 rounded-full"
                onClick={onClose}
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>

              {selectedPhotoIndex !== null && (
                <span className="text-sm opacity-80 font-medium">
                  {selectedPhotoIndex + 1} of {photos.length}
                </span>
              )}

              <Badge variant="secondary" className="text-xs">
                {getQualityText()}
              </Badge>

              {selectedPhoto.approval && (
                <Badge
                  variant={
                    selectedPhoto.approval.status === 'approved' || selectedPhoto.approval.status === 'auto_approved'
                      ? 'default'
                      : selectedPhoto.approval.status === 'pending'
                        ? 'secondary'
                        : 'destructive'
                  }
                  className="text-xs"
                >
                  {selectedPhoto.approval.status === 'auto_approved' ? 'Auto Approved' : selectedPhoto.approval.status}
                </Badge>
              )}
            </div>

            <div className="flex space-x-1">
              {userPermissions?.download && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={handleDownload}
                  title="Download high quality"
                >
                  <DownloadIcon className="h-5 w-5" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleInfo}
              >
                <InfoIcon className="h-5 w-5" />
              </Button>

              {userPermissions?.delete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-400 hover:bg-red-400/20"
                  onClick={handleDelete}
                >
                  <TrashIcon className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main photo area */}
      <div className="h-full flex items-center justify-center relative" onClick={handleBackgroundClick}>
        {/* Navigation arrows */}
        {photos.length > 1 && (
          <>
            {canGoPrev && (
              <Button
                variant="ghost"
                size="icon"
                className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all duration-300 hidden md:flex ${showControls ? 'opacity-100' : 'opacity-0'
                  }`}
                onClick={handlePrevClick}
              >
                <ChevronLeftIcon className="h-6 w-6" />
              </Button>
            )}

            {canGoNext && (
              <Button
                variant="ghost"
                size="icon"
                className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all duration-300 hidden md:flex ${showControls ? 'opacity-100' : 'opacity-0'
                  }`}
                onClick={handleNextClick}
              >
                <ChevronRightIcon className="h-6 w-6" />
              </Button>
            )}
          </>
        )}

        {/* 📸 SIMPLE & EFFECTIVE: Single image element - Google Photos style */}
        <div
          className="w-full h-full flex items-center justify-center p-4 transition-transform duration-200 ease-out"
          style={{
            transform: `translateX(${dragOffset}px)`,
            opacity: Math.abs(dragOffset) > 0 ? Math.max(0.8, 1 - Math.abs(dragOffset) / 150) : 1
          }}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* 🎯 SINGLE IMG ELEMENT: Start with low-res, upgrade to high-res with caching */}
            <div className="relative" style={imageContainerStyle}>

              <img
                ref={imageRef}
                key={photoId} // Force re-render on photo change
                src={(() => {
                  // 💾 Smart URL selection based on cache
                  const cacheEntry = imageCache.get(photoId);
                  if (cacheEntry?.isHighResLoaded) {
                    return highResUrl; // Use high-res if cached
                  }
                  return lowResUrl; // Start with low-res
                })()}
                alt={`Photo ${(selectedPhotoIndex || 0) + 1}`}
                className="w-full h-full object-contain transition-opacity duration-300 ease-out"
                style={{
                  opacity: imageLoaded ? 1 : 0.3,
                }}
                onLoad={handleImageLoad}
                onError={() => {
                  console.warn('❌ Image failed to load');
                  setImageLoaded(true); // Still show something
                }}
                draggable={false}
                onClick={(e) => e.stopPropagation()}
                width={selectedPhoto.metadata?.width}
                height={selectedPhoto.metadata?.height}
              />

              {/* Loading indicator */}
              {(!imageLoaded || isHighResLoading) && (
                <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm z-10">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    {isHighResLoading ? 'Enhancing...' : 'Loading...'}
                  </div>
                </div>
              )}

              {/* Success indicator */}
              {imageLoaded && !isHighResLoading && (
                <div className="absolute top-2 right-2 bg-green-500/80 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm z-10 opacity-0 animate-[fadeInOut_2s_ease-in-out]">
                  ✨ Ready
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile instructions */}
      <div className={`md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-xs text-center transition-all duration-300 pointer-events-none ${showControls ? 'opacity-60' : 'opacity-0'
        }`}>
        <div>Tap to show/hide controls</div>
        <div className="mt-1">Swipe left/right to navigate</div>
      </div>

      <style jsx>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: scale(0.8); }
          20% { opacity: 1; transform: scale(1); }
          80% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.9); }
        }
      `}</style>
    </div>
  );
};

export { FullscreenPhotoViewer };