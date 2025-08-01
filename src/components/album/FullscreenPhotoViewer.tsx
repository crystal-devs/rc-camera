// Fixed FullscreenPhotoViewer - Resolves keyboard navigation skipping issue + Mobile swipe support
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon, InfoIcon, TrashIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Photo } from './PhotoGallery.types';
import { useFullscreen } from '@/lib/FullscreenContext';

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
  const [imageLoading, setImageLoading] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const keyboardHandledRef = useRef(false);

  // Touch/Swipe handling
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const swipeThreshold = 50; // Minimum distance for a swipe
  const swipeTimeout = 300; // Maximum time for a swipe (ms)

  // ImageKit URL optimization
  const getOptimizedImageUrl = useCallback((imageUrl: string) => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    const optimalWidth = Math.min(screenWidth * dpr, 2048);
    const optimalHeight = Math.min(screenHeight * dpr, 2048);

    const transformations = [
      'f-auto',
      'q-95',
      `w-${Math.round(optimalWidth)}`,
      `h-${Math.round(optimalHeight)}`,
      'fit-inside',
      'pr-true',
      `dpr-${dpr}`
    ];

    return `${imageUrl}?tr=${transformations.join(':')}`;
  }, []);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // Touch event handlers for mobile swipe (React synthetic events - not used due to passive limitation)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // This is now handled by native event listeners
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // This is now handled by native event listeners
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // This is now handled by native event listeners
  }, []);

  // Native touch event handlers with proper preventDefault support
  const handleTouchStartNative = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };
    }
  }, []);

  const handleTouchEndNative = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length !== 1) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Check if this is a valid swipe (horizontal movement, within time limit)
    if (
      Math.abs(deltaX) > swipeThreshold &&
      Math.abs(deltaX) > Math.abs(deltaY) * 2 && // More horizontal than vertical
      deltaTime < swipeTimeout
    ) {
      e.preventDefault();
      if (deltaX > 0) {
        // Swipe right - go to previous photo
        console.log('👆 Mobile: Swipe right (prev)');
        onPrev();
      } else {
        // Swipe left - go to next photo
        console.log('👆 Mobile: Swipe left (next)');
        onNext();
      }
    }

    touchStartRef.current = null;
  }, [onPrev, onNext]);

  const handleTouchMoveNative = useCallback((e: TouchEvent) => {
    // Prevent scrolling during potential swipe gesture
    if (touchStartRef.current) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

      // Only prevent default if this looks like a horizontal swipe
      if (deltaX > deltaY && deltaX > 10) {
        e.preventDefault();
      }
    }
  }, []);

  // FIXED: Single keyboard event handler with proper event management
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Prevent event bubbling and multiple handling
    if (keyboardHandledRef.current) return;

    keyboardHandledRef.current = true;

    // Reset the flag after a short delay to allow next keypress
    setTimeout(() => {
      keyboardHandledRef.current = false;
    }, 100);

    resetControlsTimeout();

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        console.log('🔑 Keyboard: Left arrow pressed, calling onPrev');
        onPrev();
        break;
      case 'ArrowRight':
        e.preventDefault();
        console.log('🔑 Keyboard: Right arrow pressed, calling onNext');
        onNext();
        break;
      case ' ':
        e.preventDefault();
        setShowControls(prev => !prev);
        break;
    }
  }, [onClose, onPrev, onNext, resetControlsTimeout]);

  // Setup effects - FIXED: Single event listener setup with proper touch event handling
  useEffect(() => {
    console.log('🔍 FullscreenPhotoViewer mounted with photo index:', selectedPhotoIndex);

    setIsFullscreenActive(true);
    document.body.style.overflow = 'hidden';
    resetControlsTimeout();

    const handleMouseMove = () => resetControlsTimeout();

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    document.addEventListener('mousemove', handleMouseMove);

    // Add touch event listeners with passive: false to allow preventDefault
    const viewerElement = document.querySelector('[data-fullscreen-viewer]');
    if (viewerElement) {
      viewerElement.addEventListener('touchstart', handleTouchStartNative, { passive: false });
      viewerElement.addEventListener('touchend', handleTouchEndNative, { passive: false });
      viewerElement.addEventListener('touchmove', handleTouchMoveNative, { passive: false });
    }

    return () => {
      console.log('🔍 FullscreenPhotoViewer unmounting');
      setIsFullscreenActive(false);
      document.body.style.overflow = 'unset';

      // Remove event listeners
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousemove', handleMouseMove);

      // Remove touch event listeners
      if (viewerElement) {
        viewerElement.removeEventListener('touchstart', handleTouchStartNative);
        viewerElement.removeEventListener('touchend', handleTouchEndNative);
        viewerElement.removeEventListener('touchmove', handleTouchMoveNative);
      }

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      // Reset keyboard flag
      keyboardHandledRef.current = false;
    };
  }, [setIsFullscreenActive, handleKeyDown, resetControlsTimeout, handleTouchStartNative, handleTouchEndNative, handleTouchMoveNative]);

  // Preload adjacent images
  useEffect(() => {
    if (selectedPhotoIndex !== null && photos.length > 1) {
      // Preload previous
      if (selectedPhotoIndex > 0) {
        const prevImage = new Image();
        prevImage.src = getOptimizedImageUrl(photos[selectedPhotoIndex - 1].imageUrl);
      }

      // Preload next
      if (selectedPhotoIndex < photos.length - 1) {
        const nextImage = new Image();
        nextImage.src = getOptimizedImageUrl(photos[selectedPhotoIndex + 1].imageUrl);
      }
    }
  }, [selectedPhotoIndex, photos, getOptimizedImageUrl]);

  // Event handlers with proper event stopping
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowControls(prev => !prev);
    }
  }, []);

  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const originalUrl = `${selectedPhoto.imageUrl}?tr=orig-true`;
    downloadPhoto({ ...selectedPhoto, imageUrl: originalUrl });
  }, [downloadPhoto, selectedPhoto]);

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

  // FIXED: Button click handlers with proper event management
  const handlePrevClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('👆 Button: Prev clicked');
    onPrev();
  }, [onPrev]);

  const handleNextClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('👆 Button: Next clicked');
    onNext();
  }, [onNext]);

  if (!selectedPhoto) return null;

  const optimizedImageUrl = getOptimizedImageUrl(selectedPhoto.imageUrl);
  const canGoPrev = selectedPhotoIndex !== null && selectedPhotoIndex > 0;
  const canGoNext = selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col touch-none"
      data-fullscreen-viewer
    >
      {/* Loading indicator */}
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* Header */}
      <div className={`absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
        }`}>
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
            {userPermissions.download && (
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
            >
              <InfoIcon className="h-5 w-5" />
            </Button>

            {userPermissions.delete && (
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

      {/* Main image container */}
      <div className="flex-1 relative overflow-hidden" onClick={handleBackgroundClick}>
        {/* Navigation buttons - Desktop only */}
        {photos.length > 1 && (
          <>
            {canGoPrev && (
              <Button
                variant="ghost"
                size="icon"
                className={`absolute left-4 top-1/2 transform -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all duration-300 hidden md:flex ${showControls ? 'opacity-100' : 'opacity-0'
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
                className={`absolute right-4 top-1/2 transform -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all duration-300 hidden md:flex ${showControls ? 'opacity-100' : 'opacity-0'
                  }`}
                onClick={handleNextClick}
              >
                <ChevronRightIcon className="h-6 w-6" />
              </Button>
            )}
          </>
        )}

        {/* Image */}
        <div className="w-full h-full flex items-center justify-center p-4">
          <img
            src={selectedPhoto.imageUrl}
            alt={`Photo ${(selectedPhotoIndex || 0) + 1}`}
            className="max-w-full max-h-full object-contain"
            style={{
              width: 'auto',
              height: 'auto',
              maxWidth: '100%',
              maxHeight: '100%'
            }}
            onLoad={() => setImageLoading(false)}
            onError={() => setImageLoading(false)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      {/* Mobile swipe instructions */}
      <div className={`md:hidden absolute bottom-6 left-1/2 transform -translate-x-1/2 text-white text-xs text-center transition-all duration-300 ${showControls ? 'opacity-60' : 'opacity-0'
        }`}>
        <div>Tap to show/hide controls</div>
        <div className="mt-1">Swipe left/right to navigate</div>
      </div>
    </div>
  );
};

export { FullscreenPhotoViewer };