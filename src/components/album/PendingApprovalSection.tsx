import React from 'react';
import { Photo } from './PhotoGallery.types';
import ProgressiveImage from './ProgressiveImage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClockIcon, CheckCircleIcon, XIcon } from 'lucide-react';

interface PendingApprovalSectionProps {
  pendingPhotos: Photo[];
  approvePhoto: (photoId: string) => void;
  rejectPhoto: (photoId: string) => void;
}

const PendingApprovalSection: React.FC<PendingApprovalSectionProps> = ({
  pendingPhotos,
  approvePhoto,
  rejectPhoto
}) => {
  if (pendingPhotos.length === 0) return null;
  return (
    <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
      <h3 className="font-medium text-yellow-800 dark:text-yellow-300 mb-3 flex items-center">
        <ClockIcon className="h-4 w-4 mr-2" />
        Photos Pending Approval ({pendingPhotos.length})
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {pendingPhotos.map((photo) => (
          <div key={photo.id} className="relative group">
            <ProgressiveImage
              src={photo.imageUrl}
              alt="Pending photo"
              className="aspect-square rounded-lg overflow-hidden"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <div className="flex space-x-1">
                <Button
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => approvePhoto(photo.id)}
                >
                  <CheckCircleIcon className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 w-8 p-0"
                  onClick={() => rejectPhoto(photo.id)}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingApprovalSection;
