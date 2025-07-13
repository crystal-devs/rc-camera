import React, { useEffect, useRef } from 'react';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon, ShareIcon, InfoIcon, TrashIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ProgressiveImage from './ProgressiveImage';
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
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    setIsFullscreenActive(true);
    
    // Prevent body scroll when fullscreen is active
    document.body.style.overflow = 'hidden';
    
    return () => {
      setIsFullscreenActive(false);
      document.body.style.overflow = 'unset';
    };
  }, [setIsFullscreenActive]);

  const handleTap = (e: React.MouseEvent) => {
    // Only close on background tap, not on image tap
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
  };

  if (!selectedPhoto) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col touch-none">
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white bg-black/50 backdrop-blur-sm z-10">
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
            <span className="text-sm opacity-80">{selectedPhotoIndex + 1} of {photos.length}</span>
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
              onClick={(e) => {
                e.stopPropagation();
                downloadPhoto(selectedPhoto);
              }}
            >
              <DownloadIcon className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              const shareUrl = `${window.location.origin}/shared/photos/${selectedPhoto.id}`;
              if (navigator.share) {
                navigator.share({ title: 'Check out this photo', url: shareUrl });
              } else {
                navigator.clipboard.writeText(shareUrl);
              }
            }}
          >
            <ShareIcon className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              setPhotoInfoOpen(true);
            }}
          >
            <InfoIcon className="h-5 w-5" />
          </Button>
          {userPermissions.delete && (
            <Button
              variant="ghost"
              size="icon"
              className="text-red-400 hover:bg-red-400/20"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this photo?')) {
                  deletePhoto(selectedPhoto.id);
                }
              }}
            >
              <TrashIcon className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Main image container - This is the key fix */}
      <div 
        className="flex-1 relative overflow-hidden flex items-center justify-center"
        onClick={handleTap}
        style={{ 
          minHeight: 0, // Important: allows flex item to shrink below content size
          height: 'calc(100vh - 80px)' // Account for header height
        }}
      >
        {/* Navigation buttons */}
        {photos.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 text-white hidden md:flex"
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
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 text-white hidden md:flex"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
            >
              <ChevronRightIcon className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Image container with proper sizing */}
        <div 
          className="w-full h-full flex items-center justify-center"
          style={{ maxHeight: '100%', maxWidth: '100%' }}
        >
          <ProgressiveImage
            src={selectedPhoto.imageUrl}
            alt="Photo"
            className="max-w-full max-h-full"
            priority={true}
            sizes="100vw"
            fit="contain"
            fullHeight={true}
          />
        </div>
      </div>

      {/* Mobile navigation indicators */}
      {photos.length > 1 && (
        <div className="md:hidden flex justify-center py-2 space-x-2">
          {photos.slice(Math.max(0, (selectedPhotoIndex || 0) - 2), Math.min(photos.length, (selectedPhotoIndex || 0) + 3)).map((_, index) => {
            const actualIndex = Math.max(0, (selectedPhotoIndex || 0) - 2) + index;
            return (
              <div
                key={actualIndex}
                className={`w-2 h-2 rounded-full ${
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

export default FullscreenPhotoViewer;