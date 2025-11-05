// components/OptimizedPhotoGrid.tsx - Updated PhotoGrid component
import React from 'react';
import { Photo } from '@/types/PhotoGallery.types';
import { OptimizedProgressiveImage } from '../album/ProgressiveImage';

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
  className = "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1 sm:gap-1 md:gap-1"
}: OptimizedPhotoGridProps) => {
  console.log('📊 OptimizedPhotoGrid rendering with', photos, 'photos');
  
  return (
    <div className={className}>
      {photos.map((photo, index) => (
        <OptimizedProgressiveImage
          key={photo.id}
          photo={photo}
          index={index}
          onPhotoClick={onPhotoClick}
          userPermissions={userPermissions}
          currentTab={currentTab}
          onStatusUpdate={onStatusUpdate}
          onDownload={onDownload}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};