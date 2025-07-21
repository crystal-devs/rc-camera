import React from 'react';
import { Photo } from './PhotoGallery.types';
import ProgressiveImage from './ProgressiveImage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DownloadIcon, TrashIcon, ClockIcon } from 'lucide-react';

interface PhotoGridProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  userPermissions: {
    download: boolean;
    delete: boolean;
  };
  downloadPhoto: (photo: Photo) => void;
  deletePhoto: (photoId: string) => void;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  onPhotoClick,
  userPermissions,
  downloadPhoto,
  deletePhoto
}) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-8 gap-1 sm:gap-2 md:gap-3 px-4">
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
          {/* Approval status overlay */}
          {photo.approval && photo.approval.status === 'pending' && (
            <div className="absolute top-1 right-1">
              <Badge variant="secondary" className="text-xs">
                <ClockIcon className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            </div>
          )}
          {/* Hover overlay with actions (desktop) */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 hidden md:flex items-end justify-end p-2 opacity-0 group-hover:opacity-100">
            {/* <div className="flex space-x-1">
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
              {userPermissions.delete && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-6 w-6 p-0"
                  onClick={e => {
                    e.stopPropagation();
                    if (confirm('Delete this photo?')) {
                      deletePhoto(photo.id);
                    }
                  }}
                >
                  <TrashIcon className="h-3 w-3" />
                </Button>
              )}
            </div> */}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PhotoGrid;
