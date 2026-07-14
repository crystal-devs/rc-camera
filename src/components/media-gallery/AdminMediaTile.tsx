'use client';

import React, { useCallback, useState } from 'react';
import {
  CheckIcon,
  XIcon,
  EyeOffIcon,
  TrashIcon,
  DownloadIcon,
  MoreVertical,
  ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Photo } from '@/types/PhotoGallery.types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { GalleryImage } from './GalleryImage';

/**
 * Layer 3 (admin) — composes moderation/selection UI around GalleryImage.
 * All loading mechanics live in the primitive; this file is overlays only.
 */
export interface AdminMediaTileProps {
  photo: Photo;
  index: number;
  displayWidth: number;
  priority?: boolean;
  onPhotoClick: (photo: Photo, index: number) => void;
  userPermissions: {
    upload: boolean;
    download: boolean;
    moderate: boolean;
    delete: boolean;
  };
  onStatusUpdate: (photoId: string, status: string) => void;
  onDownload?: (photo: Photo) => void;
  onDelete?: (photoId: string) => void;
  onSetCover?: (photo: Photo) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (photoId: string) => void;
}

export const AdminMediaTile = ({
  photo,
  index,
  displayWidth,
  priority = false,
  onPhotoClick,
  userPermissions,
  onStatusUpdate,
  onDownload,
  onDelete,
  onSetCover,
  selectionMode = false,
  isSelected = false,
  onToggleSelection,
}: AdminMediaTileProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isUploading = photo.status === 'uploading' || photo.isTemporary;
  const status = photo.approval?.status || photo.approvalStatus || 'pending';
  const isApproved = status === 'approved' || status === 'auto_approved';
  const isRejected = status === 'rejected';
  const isHidden = status === 'hidden';

  const handleClick = useCallback(() => {
    if (selectionMode) {
      onToggleSelection?.(photo.id);
    } else if (!isUploading) {
      onPhotoClick(photo, index);
    }
  }, [selectionMode, isUploading, onToggleSelection, photo, onPhotoClick, index]);

  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleSelection?.(photo.id);
    },
    [onToggleSelection, photo.id]
  );

  return (
    <div
      className={cn(
        'group relative h-full w-full cursor-pointer overflow-hidden',
        isUploading && 'opacity-70'
      )}
      onClick={handleClick}
    >
      <div
        className={cn(
          'relative h-full w-full origin-center transform transition-transform duration-200 ease-in-out',
          isSelected && 'scale-90 overflow-hidden'
        )}
      >
        <GalleryImage
          media={photo}
          alt={`Photo ${index + 1}`}
          displayWidth={displayWidth}
          priority={priority}
        />
      </div>

      {/* Selection checkbox - visible on hover or when selected */}
      {!isUploading && (
        <div
          className={cn(
            'absolute left-2 top-2 z-20 transition-opacity duration-200',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
          onClick={handleCheckboxClick}
        >
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full border-2 shadow-sm transition-all',
              isSelected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-white/50 bg-black/20 hover:border-white hover:bg-black/40'
            )}
          >
            {isSelected && <CheckIcon className="h-3.5 w-3.5" />}
          </div>
        </div>
      )}

      {/* Actions menu - visible on hover */}
      {!isUploading && !selectionMode && (
        <div className="absolute right-2 top-2 z-20 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-black/20 text-white backdrop-blur-sm hover:bg-black/40"
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
                    setShowDeleteConfirm(true);
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

      {/* Uploading overlay */}
      {isUploading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 p-2 text-white">
          <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <span className="w-full truncate text-center text-xs font-medium">{photo.filename}</span>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This photo will be permanently deleted from this event. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={(e) => {
                e.stopPropagation();
                if (onDelete) onDelete(photo.id);
                setShowDeleteConfirm(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
