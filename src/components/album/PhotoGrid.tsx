import React from 'react';
import { Photo } from './PhotoGallery.types';
import ProgressiveImage from './ProgressiveImage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DownloadIcon, 
  TrashIcon, 
  ClockIcon, 
  CheckIcon, 
  XIcon, 
  EyeOffIcon,
  AlertCircleIcon 
} from 'lucide-react';

interface PhotoGridProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  userPermissions: {
    download: boolean;
    delete: boolean;
    moderate?: boolean;
  };
  downloadPhoto: (photo: Photo) => void;
  deletePhoto: (photoId: string) => void;
  // Status management functions
  approvePhoto?: (photoId: string) => void;
  rejectPhoto?: (photoId: string) => void;
  hidePhoto?: (photoId: string) => void;
  currentTab: 'approved' | 'pending' | 'rejected' | 'hidden';
}

const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  onPhotoClick,
  userPermissions,
  downloadPhoto,
  deletePhoto,
  approvePhoto,
  rejectPhoto,
  hidePhoto,
  currentTab,
}) => {

  const getStatusActions = (photo: Photo) => {
    const status = photo.approval?.status;
    const actions = [];

    // Only show status actions if user has moderate permissions
    if (!userPermissions.moderate) return [];

    switch (currentTab) {
      case 'pending':
        // For pending photos: show approve and reject buttons
        if (approvePhoto) {
          actions.push(
            <Button
              key="approve"
              size="sm"
              variant="default"
              className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
              onClick={e => {
                e.stopPropagation();
                approvePhoto(photo.id);
              }}
              title="Approve Photo"
            >
              <CheckIcon className="h-3 w-3" />
            </Button>
          );
        }
        if (rejectPhoto) {
          actions.push(
            <Button
              key="reject"
              size="sm"
              variant="destructive"
              className="h-6 w-6 p-0"
              onClick={e => {
                e.stopPropagation();
                if (confirm('Reject this photo?')) {
                  rejectPhoto(photo.id);
                }
              }}
              title="Reject Photo"
            >
              <XIcon className="h-3 w-3" />
            </Button>
          );
        }
        break;

      case 'approved':
        // For approved photos: show hide and reject buttons
        if (hidePhoto) {
          actions.push(
            <Button
              key="hide"
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0 bg-gray-200 hover:bg-gray-300"
              onClick={e => {
                e.stopPropagation();
                if (confirm('Hide this photo?')) {
                  hidePhoto(photo.id);
                }
              }}
              title="Hide Photo"
            >
              <EyeOffIcon className="h-3 w-3" />
            </Button>
          );
        }
        if (rejectPhoto) {
          actions.push(
            <Button
              key="reject"
              size="sm"
              variant="destructive"
              className="h-6 w-6 p-0"
              onClick={e => {
                e.stopPropagation();
                if (confirm('Reject this photo?')) {
                  rejectPhoto(photo.id);
                }
              }}
              title="Reject Photo"
            >
              <XIcon className="h-3 w-3" />
            </Button>
          );
        }
        break;

      case 'rejected':
        // For rejected photos: show approve button
        if (approvePhoto) {
          actions.push(
            <Button
              key="approve"
              size="sm"
              variant="default"
              className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
              onClick={e => {
                e.stopPropagation();
                approvePhoto(photo.id);
              }}
              title="Approve Photo"
            >
              <CheckIcon className="h-3 w-3" />
            </Button>
          );
        }
        break;

      case 'hidden':
        // For hidden photos: show approve button
        if (approvePhoto) {
          actions.push(
            <Button
              key="approve"
              size="sm"
              variant="default"
              className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
              onClick={e => {
                e.stopPropagation();
                approvePhoto(photo.id);
              }}
              title="Approve Photo"
            >
              <CheckIcon className="h-3 w-3" />
            </Button>
          );
        }
        break;
    }

    return actions;
  };

  console.log(photos, 'photos in PhotoGrid');

  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-8 gap-1 sm:gap-2 md:gap-3 px-0">
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          className="relative aspect-square bg-gray-100 dark:bg-gray-800 cursor-pointer overflow-hidden rounded-lg group"
          onClick={() => onPhotoClick(photo, index)}
        >
          <ProgressiveImage
            src={photo.imageUrl}
            alt="Photo"
            className="aspect-square"
            sizes="(max-width: 768px) 33vw, 12.5vw"
          />
          
          {/* Hover overlay with actions (desktop) */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100">
            {/* Status actions in center */}
            <div className="flex space-x-2 mb-8">
              {getStatusActions(photo)}
            </div>
            
            {/* Regular actions at bottom right */}
            <div className="absolute bottom-2 right-2 flex space-x-1">
              {userPermissions.download && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-6 w-6 p-0"
                  onClick={e => {
                    e.stopPropagation();
                    downloadPhoto(photo);
                  }}
                  title="Download Photo"
                >
                  <DownloadIcon className="h-3 w-3" />
                </Button>
              )}
              {userPermissions.delete && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-6 w-6 p-0"
                  onClick={e => {
                    e.stopPropagation();
                    if (confirm('Delete this photo permanently?')) {
                      deletePhoto(photo.id);
                    }
                  }}
                  title="Delete Photo"
                >
                  <TrashIcon className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Mobile actions (shown on tap/touch) */}
          <div className="absolute bottom-1 right-1 md:hidden">
            <div className="flex space-x-1">
              {/* Show primary action based on status */}
              {currentTab === 'pending' && userPermissions.moderate && approvePhoto && (
                <Button
                  size="sm"
                  variant="default"
                  className="h-6 w-6 p-0 bg-green-600"
                  onClick={e => {
                    e.stopPropagation();
                    approvePhoto(photo.id);
                  }}
                >
                  <CheckIcon className="h-3 w-3" />
                </Button>
              )}
              
              {userPermissions.download && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-6 w-6 p-0"
                  onClick={e => {
                    e.stopPropagation();
                    downloadPhoto(photo);
                  }}
                >
                  <DownloadIcon className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PhotoGrid;