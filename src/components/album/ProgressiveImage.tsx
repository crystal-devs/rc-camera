// components/OptimizedProgressiveImage.tsx - ENHANCED for instant feedback

import React, { useState, useRef, useEffect } from 'react';
import { CameraIcon, CheckIcon, XIcon, EyeOffIcon, TrashIcon, DownloadIcon, ClockIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Photo } from '@/types/PhotoGallery.types';
import { useProgressiveImage, useIntersection } from '@/hooks/useProgressiveImage';

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
  const { src, loaded, error, placeholder, isOptimized, quality } = useProgressiveImage(photo, 'grid');
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection observer for lazy loading
  const isInView = useIntersection(imgRef, {
    threshold: 0.1,
    rootMargin: '100px' // Increased for better UX
  });

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    console.error('Failed to load image:', src);
  };

  // 🚀 PROCESSING STATE: Special handling for uploading/processing photos
  const isUploading = photo.status === 'uploading' || photo.isTemporary;
  const isProcessing = photo.processing && !photo.isTemporary;

  // Get status-based actions for moderators
  const getStatusActions = () => {
    if (!userPermissions.moderate || isUploading) return [];

    const actions = [];

    switch (currentTab) {
      case 'pending':
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

  // Regular action buttons (download, delete) - disabled during upload
  const getRegularActions = () => {
    const actions = [];

    if (userPermissions.download && onDownload && !isUploading) {
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

    if (userPermissions.delete && onDelete && !isUploading) {
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
      className={`group relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 cursor-pointer transition-all duration-200 ${
        !isUploading ? 'hover:scale-[1.02] hover:shadow-md' : ''
      } ${isUploading ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
      onClick={() => !isUploading && onPhotoClick(photo, index)}
    >
      {/* Only render image when in view */}
      {isInView && (
        <>
          {/* 🚀 UPLOADING STATE: Special visual feedback */}
          {isUploading && (
            <div className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                  Uploading...
                </p>
              </div>
            </div>
          )}

          {/* 🚀 PROCESSING STATE: Show processing indicator */}
          {isProcessing && (
            <div className="absolute top-2 left-2 z-20">
              <Badge variant="secondary" className="text-xs bg-yellow-500 text-white">
                <ClockIcon className="h-3 w-3 mr-1" />
                Processing
              </Badge>
            </div>
          )}

          {/* Placeholder blur image - shows immediately */}
          {!imageLoaded && placeholder && !isUploading && (
            <img
              src={placeholder}
              alt=""
              className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110 opacity-50"
              style={{ willChange: 'auto' }}
            />
          )}
          
          {/* Main optimized image */}
          <img
            src={src}
            alt={`Photo ${index + 1}`}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            } ${isUploading ? 'opacity-75' : ''}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
            decoding="async"
            onContextMenu={(e) => e.preventDefault()}
          />
          
          {/* Loading state */}
          {!imageLoaded && !error && !isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}
          
          {/* Error state */}
          {error && !isUploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200 dark:bg-gray-700">
              <CameraIcon className="h-8 w-8 text-gray-400 mb-1" />
              <span className="text-xs text-gray-500 text-center px-2">Failed to load</span>
            </div>
          )}

          {/* 🚀 OPTIMIZATION INDICATOR: Show when using optimized variants */}
          {isOptimized && quality && process.env.NODE_ENV === 'development' && (
            <div className="absolute bottom-1 left-1 z-20">
              <Badge variant="secondary" className="text-xs bg-green-500 text-white">
                {quality.toUpperCase()}
              </Badge>
            </div>
          )}

          {/* Status actions overlay - Only show when not uploading */}
          {!isUploading && (
            <>
              {/* Desktop status actions - Bottom center */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 hidden md:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {getStatusActions()}
              </div>

              {/* Regular actions overlay - Top right */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {getRegularActions()}
              </div>

              {/* Mobile actions - Always visible on mobile */}
              <div className="absolute bottom-2 left-2 md:hidden flex gap-1">
                {getStatusActions()}
              </div>

              <div className="absolute bottom-2 right-2 md:hidden flex gap-1">
                {getRegularActions()}
              </div>
            </>
          )}

          {/* 🚀 UPLOAD PROGRESS: Show file info during upload */}
          {isUploading && photo.size && (
            <div className="absolute bottom-2 left-2 right-2 z-20">
              <div className="bg-white dark:bg-gray-800 rounded-md p-2 text-xs">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {photo.filename}
                </p>
                <p className="text-gray-500">
                  {photo.size} • {photo.dimensions || 'Processing...'}
                </p>
              </div>
            </div>
          )}
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