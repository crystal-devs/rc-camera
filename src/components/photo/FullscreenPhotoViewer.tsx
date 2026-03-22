// components/photo/FullscreenPhotoViewer.tsx - Updated with Portal, mobile fixes, and TS fixes
import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon, InfoIcon, TrashIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Photo } from '@/types/PhotoGallery.types';
import { useFullscreen } from '@/lib/FullscreenContext';
import { PhotoInfoSheet } from './PhotoInfoSheet';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


interface FullscreenPhotoViewerProps {
  selectedPhoto: Photo;
  selectedPhotoIndex: number | null;
  photos: Photo[];
  userPermissions?: {
    download: boolean;
    delete: boolean;
  };
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  deletePhoto?: (photoId: string) => void;
  downloadPhoto?: (photo: Photo) => void;
}

const FullscreenPhotoViewer: React.FC<FullscreenPhotoViewerProps> = ({
  selectedPhoto,
  selectedPhotoIndex,
  photos,
  userPermissions = { download: true, delete: false },
  onClose,
  onPrev,
  onNext,
  deletePhoto,
  downloadPhoto
}) => {
  const { setIsFullscreenActive } = useFullscreen();
  const [showControls, setShowControls] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHighResLoading, setIsHighResLoading] = useState(false);
  const [photoInfoOpen, setPhotoInfoOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Smart URL resolution with support for responsive_urls and legacy progressiveUrls
  const getImageUrls = useMemo(() => {
    // 🚀 Check for new responsive_urls structure (WebP supported)
    if (selectedPhoto.responsive_urls) {
      return {
        thumbnail: selectedPhoto.responsive_urls.thumbnail,
        display: selectedPhoto.responsive_urls.display || selectedPhoto.responsive_urls.thumbnail,
        high: selectedPhoto.responsive_urls.full || selectedPhoto.responsive_urls.display,
        original: selectedPhoto.responsive_urls.original || selectedPhoto.responsive_urls.full
      };
    }

    // Check for legacy progressiveUrls
    if (selectedPhoto.progressiveUrls) {
      return {
        thumbnail: selectedPhoto.progressiveUrls.thumbnail || selectedPhoto.progressiveUrls.display,
        display: selectedPhoto.progressiveUrls.display || selectedPhoto.progressiveUrls.full,
        high: selectedPhoto.progressiveUrls.full || selectedPhoto.progressiveUrls.original,
        original: selectedPhoto.progressiveUrls.original
      };
    }

    // Fallback
    const fallbackUrl = selectedPhoto.imageUrl;
    return {
      thumbnail: selectedPhoto.thumbnailUrl || selectedPhoto.thumbnail || fallbackUrl,
      display: fallbackUrl,
      high: fallbackUrl,
      original: fallbackUrl
    };
  }, [selectedPhoto]);

  const originalUrl = getImageUrls.original || getImageUrls.high;

  // Preload adjacent images (with smart caching)
  useEffect(() => {
    const adjacentIndices = [
      selectedPhotoIndex !== null && selectedPhotoIndex > 0 ? selectedPhotoIndex - 1 : null,
      selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1 ? selectedPhotoIndex + 1 : null
    ].filter(idx => idx !== null) as number[];

    adjacentIndices.forEach(index => {
      const photo = photos[index];

      // Resolve URLs for prefetch item
      let prefetchUrl: string | null = null;
      let srcSet: string | null = null;

      if (photo.responsive_urls?.full) {
        prefetchUrl = photo.responsive_urls.full;
        srcSet = `${photo.responsive_urls.thumbnail} 400w, ${photo.responsive_urls.display} 800w, ${photo.responsive_urls.full} 1600w`;
      } else if (photo.progressiveUrls?.full) {
        prefetchUrl = photo.progressiveUrls.full;
        srcSet = `${photo.progressiveUrls.thumbnail} 800w, ${photo.progressiveUrls.display} 1600w, ${photo.progressiveUrls.full} 2400w`;
      } else if (photo.imageUrl) {
        prefetchUrl = photo.imageUrl;
      }

      if (prefetchUrl) {
        // Create link preload element
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = prefetchUrl;
        if (srcSet) {
          link.imageSrcset = srcSet;
          link.imageSizes = '100vw';
        }
        document.head.appendChild(link);

        // Cleanup
        return () => {
          try {
            document.head.removeChild(link);
          } catch (e) {
            // Ignore removal errors
          }
        };
      }
    });
  }, [selectedPhotoIndex, photos]);

  // Reset states when photo changes and check cache
  useEffect(() => {
    setImageLoaded(false);
  }, [selectedPhoto.id]);

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
      if (!isDraggingRef.current && !photoInfoOpen) {
        setShowControls(false);
      }
    }, 3000);
  }, [photoInfoOpen]);

  // Navigation
  const handleNavigation = useCallback((direction: 'prev' | 'next') => {
    console.log(`Navigation: ${direction}`);

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
        if (photoInfoOpen) {
          setPhotoInfoOpen(false);
        } else {
          onClose();
        }
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
      case 'i':
      case 'I':
        e.preventDefault();
        setPhotoInfoOpen(prev => !prev);
        break;
    }
  }, [onClose, handleNavigation, resetControlsTimeout, photoInfoOpen]);

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
  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const originalUrl = getImageUrls.original || getImageUrls.high;
      const response = await fetch(originalUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `photo-${selectedPhoto.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to opening in new tab
      window.open(getImageUrls.original || getImageUrls.high, '_blank');
    }
  }, [selectedPhoto.id, getImageUrls]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletePhoto) {
      setShowDeleteConfirm(true);
    }
  }, [deletePhoto]);

  const confirmDelete = useCallback(() => {
    if (deletePhoto) {
      deletePhoto(selectedPhoto.id);
      setShowDeleteConfirm(false);
    }
  }, [deletePhoto, selectedPhoto.id]);

  const handleInfo = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoInfoOpen(true);
  }, []);

  // Image load handler
  const handleImageLoad = useCallback(() => {
    console.log('Image rendered successfully');
    setImageLoaded(true);
  }, []);

  // Setup effect
  useEffect(() => {
    setMounted(true);
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

  if (!selectedPhoto || !mounted) return null;

  const canGoPrev = selectedPhotoIndex !== null && selectedPhotoIndex > 0;
  const canGoNext = selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1;

  // Quality indicator
  const getQualityText = () => {

    if (imageLoaded && !isHighResLoading) return 'High Quality';
    if (isHighResLoading) return 'Enhancing...';
    if (imageLoaded) return 'Standard Quality';
    return 'Loading...';
  };

  const content = (
    <div
      className="fixed inset-0 z-[100] bg-black m-0 p-0 overflow-hidden"
      data-photo-viewer
      style={{ margin: 0, padding: 0, width: '100vw', height: '100dvh' }}
    >
      {/* Header controls */}
      <div className={`absolute top-0 left-0 right-0 z-10 transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
        }`}>
        <div className="bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between p-4 text-white safe-area-top">
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
                  title="Download original quality"
                >
                  <DownloadIcon className="h-5 w-5" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleInfo}
                title="Photo information"
              >
                <InfoIcon className="h-5 w-5" />
              </Button>

              {userPermissions?.delete && deletePhoto && (
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

      {/* Main photo area - Full screen with no padding */}
      <div className="absolute inset-0 flex items-center justify-center" onClick={handleBackgroundClick}>
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

        {/* Progressive Image Container - Full screen with proper sizing */}
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-200 ease-out"
          style={{
            transform: `translateX(${dragOffset}px)`,
            opacity: Math.abs(dragOffset) > 0 ? Math.max(0.8, 1 - Math.abs(dragOffset) / 150) : 1
          }}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Progressive Image Display with Metadata-based Sizing */}
            <div
              className="relative flex items-center justify-center w-full h-full"
            >

              {/* Main high-quality image at original dimensions */}
              <img
                ref={imageRef}
                key={selectedPhoto.id}
                srcSet={
                  getImageUrls.thumbnail && getImageUrls.high
                    ? `${getImageUrls.thumbnail} 800w,
                    ${getImageUrls.display || getImageUrls.high} 1600w,
                    ${getImageUrls.high} 2400w,
                    ${getImageUrls.original} 4000w`
                    : undefined
                }
                sizes="100vw"
                src={getImageUrls.high || getImageUrls.display}
                alt={`Photo ${(selectedPhotoIndex || 0) + 1}`}
                className="relative w-full h-full object-contain"
                style={{
                  opacity: imageLoaded ? 1 : 0,
                  transition: 'opacity 0.3s ease-out'
                }}
                onLoad={handleImageLoad}
                onError={() => {
                  console.warn('Image failed to load');
                  setImageLoaded(true);
                }}
                draggable={false}
                onClick={(e) => e.stopPropagation()}
                width={selectedPhoto.metadata?.width}
                height={selectedPhoto.metadata?.height}
              />

              {/* Loading indicator */}
              {(!imageLoaded || isHighResLoading) && (
                <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm z-10">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    {isHighResLoading ? 'Enhancing...' : 'Loading...'}
                  </div>
                </div>
              )}

              {/* Success indicator with dimensions */}
              {imageLoaded && !isHighResLoading && selectedPhoto.metadata?.width && selectedPhoto.metadata?.height && (
                <div className="absolute top-4 right-4 bg-green-500/80 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm z-10 opacity-0 animate-[fadeInOut_2s_ease-in-out]">
                  {selectedPhoto.metadata.width}×{selectedPhoto.metadata.height}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PhotoInfoSheet
        isOpen={photoInfoOpen}
        onClose={() => setPhotoInfoOpen(false)}
        photo={{
          id: selectedPhoto.id,
          imageUrl: originalUrl,
          src: originalUrl,
          title: selectedPhoto?.id || '',
          takenBy: selectedPhoto.takenBy?.toString(),
          uploadedBy: '', // Photo type doesn't have uploadedBy
          uploadedAt: selectedPhoto.createdAt?.toString() || '',
          takenAt: selectedPhoto.createdAt?.toString() || '', // Metadata doesn't have timestamp
          location: selectedPhoto.metadata?.location ? {
            name: `${selectedPhoto.metadata.location.latitude}, ${selectedPhoto.metadata.location.longitude}`,
            address: selectedPhoto.metadata.location.address || ''
          } : undefined,
          metadata: {
            width: selectedPhoto.metadata?.width,
            height: selectedPhoto.metadata?.height,
            size: selectedPhoto.size_mb,
            camera: selectedPhoto.metadata?.device_info?.model,
            lens: undefined,
            iso: selectedPhoto.metadata?.camera_settings?.iso,
            aperture: selectedPhoto.metadata?.camera_settings?.aperture,
            shutterSpeed: selectedPhoto.metadata?.camera_settings?.shutter_speed,
            focalLength: selectedPhoto.metadata?.camera_settings?.focal_length
          },
          stats: {
            views: undefined,
            downloads: undefined
          },
          approval: selectedPhoto.approval
        }}
        canDownload={userPermissions?.download}
        onDownload={userPermissions?.download ? () => {
          if (downloadPhoto) {
            downloadPhoto({ ...selectedPhoto, imageUrl: originalUrl });
          }
        } : undefined}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="z-[110]">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This photo will be permanently deleted from this event. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style jsx>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: scale(0.8); }
          20% { opacity: 1; transform: scale(1); }
          80% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.9); }
        }
        .safe-area-top {
          padding-top: env(safe-area-inset-top);
        }
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
};

export { FullscreenPhotoViewer };