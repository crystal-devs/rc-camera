import React, { useEffect, useRef } from 'react';
import { Photo } from '@/types/PhotoGallery.types';
import { OptimizedProgressiveImage } from '../album/ProgressiveImage';
import { useImagePreloader } from '@/hooks/useImagePreloader';

interface OptimizedPhotoGridProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  userPermissions: {
    upload: boolean;
    download: boolean;
    moderate: boolean;
    delete: boolean;
  };
  currentTab: 'approved' | 'pending' | 'rejected' | 'hidden';
  onStatusUpdate: (photoId: string, status: string) => void;
  onDownload?: (photo: Photo) => void;
  onDelete?: (photoId: string) => void;
  onSetCover?: (photo: Photo) => void;
  selectionMode?: boolean;
  selectedPhotos?: Set<string>;
  onToggleSelection?: (photoId: string) => void;
  className?: string;
}

export const OptimizedPhotoGrid = ({
  photos,
  onPhotoClick,
  userPermissions,
  currentTab,
  onStatusUpdate,
  onDownload,
  onDelete,
  onSetCover,
  selectionMode = false,
  selectedPhotos = new Set(),
  onToggleSelection,
  className = "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1 sm:gap-1 md:gap-1"
}: OptimizedPhotoGridProps) => {
  // 🚀 PERFORMANCE: Preload logic
  const { preloadBatch } = useImagePreloader(photos, 3); // Preload 3 items ahead (Industry standard)
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Disconnect previous observer
    if (observerRef.current) observerRef.current.disconnect();

    // Create new observer
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
          // When item N is visible, preload appropriate batch ahead
          // We trigger preloading slightly aggressively
          preloadBatch(index + 1);
        }
      });
    }, {
      rootMargin: '200px', // Trigger well before they are fully in view
      threshold: 0.1
    });

    // Observe specific elements to trigger preloading
    // We don't need to observe every single one, observing every 4th or 5th is efficient enough
    // to keep the pipeline full without overwhelming the observer.
    const items = document.querySelectorAll('.photo-grid-item');
    items.forEach((item, idx) => {
      if (idx % 5 === 0) { // Attach listener to every 5th item
        observerRef.current?.observe(item);
      }
    });

    return () => observerRef.current?.disconnect();
  }, [photos, preloadBatch]);

  return (
    <div className={className}>
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          data-index={index}
          className="photo-grid-item w-full h-full" // Wrapper for observation
        >
          <OptimizedProgressiveImage
            photo={photo}
            index={index}
            onPhotoClick={onPhotoClick}
            userPermissions={userPermissions}
            currentTab={currentTab}
            onStatusUpdate={onStatusUpdate}
            onDownload={onDownload}
            onDelete={onDelete}
            onSetCover={onSetCover}
            selectionMode={selectionMode}
            isSelected={selectedPhotos.has(photo.id)}
            onToggleSelection={onToggleSelection}
            priority={index < 12} // 🚀 OPTIMIZATION: Load first 12 images (above-the-fold) immediately
          />
        </div>
      ))}
    </div>
  );
};