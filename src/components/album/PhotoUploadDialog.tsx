import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CameraIcon, DownloadIcon } from 'lucide-react';

interface PhotoUploadDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  isUploading: boolean;
  approvalMode: 'auto' | 'manual' | 'ai_assisted';
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  cameraInputRef: React.RefObject<HTMLInputElement>;
  handleCameraCapture: () => void;
}

const PhotoUploadDialog: React.FC<PhotoUploadDialogProps> = ({
  open,
  setOpen,
  isUploading,
  approvalMode,
  onFileUpload,
  fileInputRef,
  cameraInputRef,
  handleCameraCapture
}) => {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={isUploading}>
          <CameraIcon className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">
            {isUploading ? 'Uploading...' : 'Add Photos'}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Photos</DialogTitle>
          {approvalMode === 'manual' && (
            <p className="text-sm text-muted-foreground">
              Photos will require approval before appearing in the gallery.
            </p>
          )}
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div
            className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={onFileUpload}
            />
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full mb-2">
              <DownloadIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            </div>
            <h3 className="font-medium text-sm">Upload Photos</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
              Select photos from your device
            </p>
          </div>
          <div
            className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onClick={handleCameraCapture}
          >
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              ref={cameraInputRef}
              onChange={onFileUpload}
            />
            <div className="bg-primary/10 p-3 rounded-full mb-2">
              <CameraIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-medium text-sm">Take Photo</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
              Capture a new photo with camera
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoUploadDialog;
