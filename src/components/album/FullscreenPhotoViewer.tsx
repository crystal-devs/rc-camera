// Professional Photo Viewer - Google Photos Style Implementation
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
  
  // Simplified touch handling - Google Photos style
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const isDraggingRef = useRef(false);
  
  // Constants
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
      if (!isDraggingRef.current) { // Don't hide controls while dragging
        setShowControls(false);
      }
    }, 3000);
  }, []);

  // Simple navigation - immediate state change like Google Photos
  const handleNavigation = useCallback((direction: 'prev' | 'next') => {
    console.log(`📸 Navigation: ${direction}`);
    
    if (direction === 'prev' && selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setImageLoading(true);
      onPrev();
    } else if (direction === 'next' && selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1) {
      setImageLoading(true);
      onNext();
    }
  }, [selectedPhotoIndex, photos.length, onPrev, onNext]);

  // Touch event handlers - simplified and reliable with proper TypeScript types
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
    
    // Check if this is a horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.preventDefault();
      isDraggingRef.current = true;
      
      // Apply drag with resistance at boundaries
      let limitedDragOffset = deltaX * 0.5; // Reduce sensitivity
      
      // Add resistance at boundaries
      const atFirstPhoto = selectedPhotoIndex === 0;
      const atLastPhoto = selectedPhotoIndex === photos.length - 1;
      
      if ((deltaX > 0 && atFirstPhoto) || (deltaX < 0 && atLastPhoto)) {
        limitedDragOffset = deltaX * 0.2; // More resistance
      }
      
      // Limit maximum drag
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

    // Reset drag offset
    setDragOffset(0);
    isDraggingRef.current = false;

    // Check for valid swipe
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 1.5;
    const isValidSwipe = isHorizontalSwipe && 
      (Math.abs(deltaX) > SWIPE_THRESHOLD || velocity > 0.3) && 
      deltaTime < SWIPE_TIMEOUT;

    if (isValidSwipe) {
      e.preventDefault();
      if (deltaX > 0) {
        console.log('👆 Swipe right (prev)');
        handleNavigation('prev');
      } else {
        console.log('👆 Swipe left (next)');
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
        console.log('⌨️ Keyboard: Left arrow');
        handleNavigation('prev');
        break;
      case 'ArrowRight':
        e.preventDefault();
        console.log('⌨️ Keyboard: Right arrow');
        handleNavigation('next');
        break;
      case ' ':
        e.preventDefault();
        setShowControls(prev => !prev);
        break;
    }
  }, [onClose, handleNavigation, resetControlsTimeout]);

  // Button click handlers
  const handlePrevClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('🖱️ Button: Prev clicked');
    handleNavigation('prev');
  }, [handleNavigation]);

  const handleNextClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('🖱️ Button: Next clicked');
    handleNavigation('next');
  }, [handleNavigation]);

  // Background click handler
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isDraggingRef.current) {
      setShowControls(prev => !prev);
    }
  }, []);

  // Action handlers
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

  // Setup effect
  useEffect(() => {
    console.log('🔍 PhotoViewer mounted, photo index:', selectedPhotoIndex);
    
    setIsFullscreenActive(true);
    document.body.style.overflow = 'hidden';
    resetControlsTimeout();
    setImageLoading(true); // Reset loading state for new photo

    const handleMouseMove = () => resetControlsTimeout();

    // Event listeners
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousemove', handleMouseMove);

    // Touch event listeners with passive: false
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
  }, [setIsFullscreenActive, handleKeyDown, resetControlsTimeout, handleTouchStart, handleTouchMove, handleTouchEnd, selectedPhotoIndex]);

  if (!selectedPhoto) return null;

  const canGoPrev = selectedPhotoIndex !== null && selectedPhotoIndex > 0;
  const canGoNext = selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black"
      data-photo-viewer
    >
      {/* Loading indicator */}
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* Header controls */}
      <div className={`absolute top-0 left-0 right-0 z-10 transition-all duration-300 ${
        showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
      }`}>
        <div className="bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm">
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
      </div>

      {/* Main photo area */}
      <div className="h-full flex items-center justify-center relative" onClick={handleBackgroundClick}>
        {/* Desktop navigation arrows */}
        {photos.length > 1 && (
          <>
            {canGoPrev && (
              <Button
                variant="ghost"
                size="icon"
                className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all duration-300 hidden md:flex ${
                  showControls ? 'opacity-100' : 'opacity-0'
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
                className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all duration-300 hidden md:flex ${
                  showControls ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={handleNextClick}
              >
                <ChevronRightIcon className="h-6 w-6" />
              </Button>
            )}
          </>
        )}

        {/* Photo container with drag feedback */}
        <div 
          className="w-full h-full flex items-center justify-center p-4 transition-transform duration-200 ease-out"
          style={{
            transform: `translateX(${dragOffset}px)`,
            opacity: Math.abs(dragOffset) > 0 ? Math.max(0.8, 1 - Math.abs(dragOffset) / 150) : 1
          }}
        >
          <img
            key={selectedPhoto.id} // Force re-render for new photos
            src={selectedPhoto.imageUrl}
            alt={`Photo ${(selectedPhotoIndex || 0) + 1}`}
            className="max-w-full max-h-full object-contain"
            onLoad={() => {
              console.log('📸 Image loaded');
              setImageLoading(false);
            }}
            onError={() => {
              console.log('❌ Image load error');
              setImageLoading(false);
            }}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>
      </div>

      {/* Mobile instructions */}
      <div className={`md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-xs text-center transition-all duration-300 pointer-events-none ${
        showControls ? 'opacity-60' : 'opacity-0'
      }`}>
        <div>Tap to show/hide controls</div>
        <div className="mt-1">Swipe left/right to navigate</div>
      </div>
    </div>
  );
};

export { FullscreenPhotoViewer };