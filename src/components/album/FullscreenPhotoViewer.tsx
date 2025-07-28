// Optimized FullscreenPhotoViewer - Clean & Simple
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

  // Setup effects
  useEffect(() => {
    setIsFullscreenActive(true);
    document.body.style.overflow = 'hidden';
    resetControlsTimeout();

    const handleKeyPress = (e: KeyboardEvent) => {
      resetControlsTimeout();
      switch (e.key) {
        case 'Escape': onClose(); break;
        case 'ArrowLeft': onPrev(); break;
        case 'ArrowRight': onNext(); break;
        case ' ':
          e.preventDefault();
          setShowControls(prev => !prev);
          break;
      }
    };

    const handleMouseMove = () => resetControlsTimeout();

    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      setIsFullscreenActive(false);
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [setIsFullscreenActive, onClose, onPrev, onNext, resetControlsTimeout]);

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

  // Event handlers
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

  if (!selectedPhoto) return null;

  const optimizedImageUrl = getOptimizedImageUrl(selectedPhoto.imageUrl);
  const canGoPrev = selectedPhotoIndex !== null && selectedPhotoIndex > 0;
  const canGoNext = selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col touch-none">
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
        {/* Navigation buttons */}
        {photos.length > 1 && (
          <>
            {canGoPrev && (
              <Button
                variant="ghost"
                size="icon"
                className={`absolute left-4 top-1/2 transform -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all duration-300 hidden md:flex ${showControls ? 'opacity-100' : 'opacity-0'
                  }`}
                onClick={(e) => { e.stopPropagation(); onPrev(); }}
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
                onClick={(e) => { e.stopPropagation(); onNext(); }}
              >
                <ChevronRightIcon className="h-6 w-6" />
              </Button>
            )}
          </>
        )}

        {/* Image */}
        <div className="w-full h-full flex items-center justify-center p-4">
          <img
            src={optimizedImageUrl}
            alt={`Photo ${(selectedPhotoIndex || 0) + 1}`}
            className="max-w-full max-h-full object-contain transition-opacity duration-300"
            onLoad={() => setImageLoading(false)}
            onError={() => setImageLoading(false)}
            onClick={(e) => e.stopPropagation()}
            style={{ imageRendering: 'crisp-edges' }}
          />
        </div>
      </div>

      {/* Mobile navigation indicators */}
      {photos.length > 1 && (
        <div className={`md:hidden flex justify-center py-3 space-x-2 bg-gradient-to-t from-black/80 to-transparent transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'
          }`}>
          {photos.slice(
            Math.max(0, (selectedPhotoIndex || 0) - 2),
            Math.min(photos.length, (selectedPhotoIndex || 0) + 3)
          ).map((_, index) => {
            const actualIndex = Math.max(0, (selectedPhotoIndex || 0) - 2) + index;
            return (
              <div
                key={actualIndex}
                className={`w-2 h-2 rounded-full transition-colors duration-200 ${actualIndex === selectedPhotoIndex ? 'bg-white' : 'bg-white/40'
                  }`}
              />
            );
          })}
        </div>
      )}

      {/* Touch instructions */}
      <div className={`md:hidden absolute bottom-16 left-1/2 transform -translate-x-1/2 text-white text-xs text-center transition-all duration-300 ${showControls ? 'opacity-60' : 'opacity-0'
        }`}>
        <div>Tap to show/hide controls</div>
        <div className="mt-1">Use arrow keys to navigate</div>
      </div>
    </div>
  );
};

export { FullscreenPhotoViewer };