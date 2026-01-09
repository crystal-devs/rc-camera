// components/OptimizedProgressiveImage.tsx - ENHANCED for Google Photos style UX

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CameraIcon, CheckIcon, XIcon, EyeOffIcon, TrashIcon, DownloadIcon, MoreVertical, Edit2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Photo } from '@/types/PhotoGallery.types';
import { useProgressiveImage, useIntersection } from '@/hooks/useProgressiveImage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

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
  onSetCover?: (photo: Photo) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (photoId: string) => void;
}

export const OptimizedProgressiveImage = ({
  photo,
  index,
  onPhotoClick,
  userPermissions,
  currentTab,
  onStatusUpdate,
  onDownload,
  onDelete,
  onSetCover,
  selectionMode = false,
  isSelected = false,
  onToggleSelection
}: OptimizedProgressiveImageProps) => {
  const { src, loaded, error, placeholder, isOptimized, quality } = useProgressiveImage(photo, 'grid');
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection observer for lazy loading
  const isInView = useIntersection(imgRef as React.RefObject<Element>, {
    threshold: 0.1,
    rootMargin: '100px'
  });

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    console.error('Failed to load image:', src);
  };

  const isUploading = photo.status === 'uploading' || photo.isTemporary;

  // Determine current status for conditional actions
  const status = photo.approval?.status || photo.approvalStatus || 'pending';
  const isApproved = status === 'approved' || status === 'auto_approved';
  const isRejected = status === 'rejected';
  const isHidden = status === 'hidden';

  const handleClick = useCallback((e: React.MouseEvent) => {
    // If selection mode is active (at least one item selected), clicking photo toggles selection
    if (selectionMode) {
      e.stopPropagation();
      onToggleSelection?.(photo.id);
    } else if (!isUploading) {
      // Otherwise open viewer
      onPhotoClick(photo, index);
    }
  }, [selectionMode, isUploading, onToggleSelection, photo.id, onPhotoClick, index, photo]);

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelection?.(photo.id);
  }, [onToggleSelection, photo.id]);

  return (
    <div
      ref={imgRef}
      className={cn(
        "group relative aspect-square overflow-hidden rounded-lg bg-muted cursor-pointer transition-all duration-200",
        !isUploading && "hover:shadow-md",
        isSelected && "ring-2 ring-primary ring-offset-2",
        isUploading && "opacity-70"
      )}
      onClick={handleClick}
    >
      {isInView && (
        <>
          {/* Placeholder */}
          {!imageLoaded && placeholder && !isUploading && (
            <img
              src={placeholder}
              alt=""
              className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110 opacity-50"
            />
          )}

          {/* Main Image */}
          <img
            srcSet={
              photo.progressiveUrls
                ? `${photo.progressiveUrls.thumbnail} 400w,
                  ${photo.progressiveUrls.display} 800w`
                : undefined
            }
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            src={photo.progressiveUrls?.display || photo.imageUrl}
            alt={`Photo ${index + 1}`}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
            decoding="async"
          />

          {/* Selection Checkbox - Visible on Hover or Selected */}
          {!isUploading && (
            <div
              className={cn(
                "absolute top-2 left-2 z-20 transition-opacity duration-200",
                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
              onClick={handleCheckboxClick}
            >
              <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow-sm",
                isSelected
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-black/20 border-white/50 hover:bg-black/40 hover:border-white"
              )}>
                {isSelected && <CheckIcon className="w-3.5 h-3.5" />}
              </div>
            </div>
          )}

          {/* More Actions Menu - Visible on Hover */}
          {!isUploading && !selectionMode && (
            <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {onSetCover && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSetCover(photo); }}>
                      <ImageIcon className="mr-2 h-4 w-4" /> Set as Event Cover
                    </DropdownMenuItem>
                  )}

                  {userPermissions.moderate && (
                    <>
                      {!isApproved && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusUpdate(photo.id, 'approved'); }}>
                          <CheckIcon className="mr-2 h-4 w-4 text-green-500" /> Approve
                        </DropdownMenuItem>
                      )}
                      {!isRejected && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusUpdate(photo.id, 'rejected'); }}>
                          <XIcon className="mr-2 h-4 w-4 text-red-500" /> Reject
                        </DropdownMenuItem>
                      )}
                      {!isHidden && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusUpdate(photo.id, 'hidden'); }}>
                          <EyeOffIcon className="mr-2 h-4 w-4 text-gray-500" /> Hide
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {userPermissions.download && onDownload && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(photo); }}>
                      <DownloadIcon className="mr-2 h-4 w-4" /> Download
                    </DropdownMenuItem>
                  )}

                  {userPermissions.delete && onDelete && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete permanently?')) onDelete(photo.id);
                      }}
                      className="text-red-600 focus:text-red-600"
                    >
                      <TrashIcon className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Uploading Overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white p-2">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mb-2" />
              <span className="text-xs font-medium truncate w-full text-center">{photo.filename}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};