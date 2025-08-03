// components/OptimizedProgressiveImage.tsx - Complete optimized image component
import React, { useState, useRef } from 'react';
import { CameraIcon, CheckIcon, XIcon, EyeOffIcon, TrashIcon, DownloadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Photo } from '@/types/PhotoGallery.types';
import { useProgressiveImage } from '@/hooks/useProgressiveImage';
import { useIntersection } from '@/hooks/useIntersection';

interface OptimizedProgressiveImageProps {
  photo: Photo;
  index: number;
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
}

export const OptimizedProgressiveImage = ({ 
  photo, 
  index, 
  onPhotoClick, 
  userPermissions,
  currentTab,
  onStatusUpdate,
  onDownload,
  onDelete
}: OptimizedProgressiveImageProps) => {
  const { src, loaded, error, placeholder } = useProgressiveImage(photo, 'grid');
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection observer for lazy loading
  const isInView = useIntersection(imgRef, {
    threshold: 0.1,
    rootMargin: '50px'
  });

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    console.error('Failed to load image:', src);
  };

  // Get status-based actions for moderators
  const getStatusActions = () => {
    if (!userPermissions.moderate) return [];

    const actions = [];

    switch (currentTab) {
      case 'pending':
        // Pending: Can approve or reject
        actions.push(
          <Button
            key="approve"
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 bg-green-500 hover:bg-green-600 border-none shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              onStatusUpdate(photo.id, 'approved');
            }}
            title="Approve Photo"
          >
            <CheckIcon className="h-3.5 w-3.5 text-white" />
          </Button>
        );
        actions.push(
          <Button
            key="reject"
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 bg-red-500 hover:bg-red-600 border-none shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Reject this photo?')) {
                onStatusUpdate(photo.id, 'rejected');
              }
            }}
            title="Reject Photo"
          >
            <XIcon className="h-3.5 w-3.5 text-white" />
          </Button>
        );
        break;

      case 'approved':
        // Approved: Can hide or reject
        actions.push(
          <Button
            key="hide"
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 bg-gray-500 hover:bg-gray-600 border-none shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Hide this photo?')) {
                onStatusUpdate(photo.id, 'hidden');
              }
            }}
            title="Hide Photo"
          >
            <EyeOffIcon className="h-3.5 w-3.5 text-white" />
          </Button>
        );
        actions.push(
          <Button
            key="reject"
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 bg-red-500 hover:bg-red-600 border-none shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Reject this photo?')) {
                onStatusUpdate(photo.id, 'rejected');
              }
            }}
            title="Reject Photo"
          >
            <XIcon className="h-3.5 w-3.5 text-white" />
          </Button>
        );
        break;

      case 'rejected':
        // Rejected: Can approve back
        actions.push(
          <Button
            key="approve"
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 bg-green-500 hover:bg-green-600 border-none shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              onStatusUpdate(photo.id, 'approved');
            }}
            title="Approve Photo"
          >
            <CheckIcon className="h-3.5 w-3.5 text-white" />
          </Button>
        );
        break;

      case 'hidden':
        // Hidden: Can approve back
        actions.push(
          <Button
            key="approve"
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 bg-green-500 hover:bg-green-600 border-none shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              onStatusUpdate(photo.id, 'approved');
            }}
            title="Approve Photo"
          >
            <CheckIcon className="h-3.5 w-3.5 text-white" />
          </Button>
        );
        break;
    }

    return actions;
  };

  // Regular action buttons (download, delete)
  const getRegularActions = () => {
    const actions = [];

    if (userPermissions.download && onDownload) {
      actions.push(
        <Button
          key="download"
          size="sm"
          variant="outline"
          className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600 border-none shadow-md"
          onClick={(e) => {
            e.stopPropagation();
            onDownload(photo);
          }}
          title="Download Photo"
        >
          <DownloadIcon className="h-3 w-3 text-white" />
        </Button>
      );
    }

    if (userPermissions.delete && onDelete) {
      actions.push(
        <Button
          key="delete"
          size="sm"
          variant="outline"
          className="h-6 w-6 p-0 bg-red-600 hover:bg-red-700 border-none shadow-md"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Delete this photo permanently?')) {
              onDelete(photo.id);
            }
          }}
          title="Delete Photo"
        >
          <TrashIcon className="h-3 w-3 text-white" />
        </Button>
      );
    }

    return actions;
  };

  return (
    <div 
      ref={imgRef}
      className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 cursor-pointer hover:scale-[1.02] transition-transform"
      onClick={() => onPhotoClick(photo, index)}
    >
      {/* Only render image when in view */}
      {isInView && (
        <>
          {/* Placeholder blur image - shows immediately */}
          {!imageLoaded && placeholder && (
            <img
              src={placeholder}
              alt=""
              className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110 opacity-50"
              style={{ willChange: 'auto' }}
            />
          )}
          
          {/* Main optimized image - Uses thumbnail (~40KB) */}
          <img
            src={src}
            alt={`Photo ${index + 1}`}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
            decoding="async"
            onContextMenu={(e) => e.preventDefault()}
          />
          
          {/* Loading state */}
          {!imageLoaded && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}
          
          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
              <CameraIcon className="h-8 w-8 text-gray-400" />
              <span className="text-xs text-gray-500 ml-2">Failed to load</span>
            </div>
          )}

          {/* Status actions overlay - Top center (desktop only) */}
          <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 hidden md:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {getStatusActions()}
          </div>

          {/* Regular actions overlay - Top right */}
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {getRegularActions()}
          </div>

          {/* Mobile status actions - Bottom left */}
          <div className="absolute bottom-2 left-2 md:hidden flex gap-1">
            {getStatusActions()}
          </div>

          {/* Mobile regular actions - Bottom right */}
          <div className="absolute bottom-2 right-2 md:hidden flex gap-1">
            {getRegularActions()}
          </div>
        </>
      )}

      {/* Placeholder when not in view */}
      {!isInView && (
        <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};