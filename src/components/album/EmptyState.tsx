// components/EmptyState.tsx
import { CameraIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  activeTab: 'approved' | 'pending' | 'rejected' | 'hidden';
  canUserUpload: boolean;
  isUploading: boolean;
  onUploadClick: () => void;
}

export const EmptyState = ({
  activeTab,
  canUserUpload,
  isUploading,
  onUploadClick
}: EmptyStateProps) => {
  const getEmptyStateContent = () => {
    switch (activeTab) {
      case 'approved':
        return {
          title: 'No Published Photos',
          description: canUserUpload 
            ? "Be the first to add photos to this album." 
            : "No photos have been approved yet."
        };
      case 'pending':
        return {
          title: 'No Pending Photos',
          description: "No photos are waiting for approval."
        };
      case 'rejected':
        return {
          title: 'No Rejected Photos',
          description: "No photos have been rejected."
        };
      case 'hidden':
        return {
          title: 'No Hidden Photos',
          description: "No photos have been hidden."
        };
    }
  };

  const { title, description } = getEmptyStateContent();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed rounded-lg">
      <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full mb-4">
        <CameraIcon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
        {title}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
        {description}
      </p>
      {canUserUpload && activeTab === 'approved' && (
        <Button
          onClick={onUploadClick}
          disabled={isUploading}
        >
          <CameraIcon className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Add Photos</span>
        </Button>
      )}
    </div>
  );
};