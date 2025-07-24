// Optimized FullscreenPhotoViewer
import React, { useEffect, useRef, useCallback } from 'react';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon, InfoIcon, TrashIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Photo } from './PhotoGallery.types';
import { useFullscreen } from '@/lib/FullscreenContext';
import ProgressiveImage from './ProgressiveImage';

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
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    setIsFullscreenActive(true);
    
    // Prevent body scroll when fullscreen is active
    document.body.style.overflow = 'hidden';
    
    // Keyboard navigation
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onPrev();
          break;
        case 'ArrowRight':
          onNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      setIsFullscreenActive(false);
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [setIsFullscreenActive, onClose, onPrev, onNext]);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    // Only close on background click, not on image click
    if (e.target === e.currentTarget) {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;
      if (lastTapRef.current && (now - lastTapRef.current) < DOUBLE_TAP_DELAY) {
        onClose();
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }
  }, [onClose]);

  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    downloadPhoto(selectedPhoto);
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

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col touch-none">
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 rounded-full transition-colors"
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
              className="text-white hover:bg-white/20 transition-colors"
              onClick={handleDownload}
            >
              <DownloadIcon className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 transition-colors"
            onClick={handleInfo}
          >
            <InfoIcon className="h-5 w-5" />
          </Button>
          {userPermissions.delete && (
            <Button
              variant="ghost"
              size="icon"
              className="text-red-400 hover:bg-red-400/20 transition-colors"
              onClick={handleDelete}
            >
              <TrashIcon className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Main image container */}
      <div 
        className="flex-1 relative overflow-hidden"
        onClick={handleBackgroundClick}
      >
        {/* Navigation buttons */}
        {photos.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all duration-200 hidden md:flex"
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all duration-200 hidden md:flex"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
            >
              <ChevronRightIcon className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Optimized image container */}
        <ProgressiveImage
          src={selectedPhoto.imageUrl}
          alt={`Photo ${(selectedPhotoIndex || 0) + 1}`}
          className="w-full h-full"
          priority={true}
          fit="contain"
          fullHeight={true}
          index={selectedPhotoIndex || 0}
        />
      </div>

      {/* Mobile navigation indicators */}
      {photos.length > 1 && (
        <div className="md:hidden flex justify-center py-3 space-x-2 bg-gradient-to-t from-black/80 to-transparent">
          {photos.slice(
            Math.max(0, (selectedPhotoIndex || 0) - 2), 
            Math.min(photos.length, (selectedPhotoIndex || 0) + 3)
          ).map((_, index) => {
            const actualIndex = Math.max(0, (selectedPhotoIndex || 0) - 2) + index;
            return (
              <div
                key={actualIndex}
                className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                  actualIndex === selectedPhotoIndex ? 'bg-white' : 'bg-white/40'
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export { FullscreenPhotoViewer };