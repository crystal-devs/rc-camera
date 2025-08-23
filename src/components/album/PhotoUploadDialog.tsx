// components/gallery/PhotoUploadDialog.tsx
'use client';

import { CameraIcon, UploadIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Progress } from "../ui/progress";

interface PhotoUploadDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  isUploading: boolean;
  approvalMode: 'auto' | 'manual' | 'ai_assisted';
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  cameraInputRef: React.RefObject<HTMLInputElement>;
  uploadProgress?: {
    total: number;
    completed: number;
    failed: number;
    processing: number;
    overallProgress: number;
  };
  showDetailedProgress?: boolean;
}

const PhotoUploadDialog: React.FC<PhotoUploadDialogProps> = ({
  open,
  setOpen,
  isUploading,
  approvalMode,
  onFileUpload,
  fileInputRef,
  cameraInputRef,
  uploadProgress,
  showDetailedProgress = false
}) => {
  
  const handleCameraCapture = () => {
    if (cameraInputRef.current && !isUploading) {
      cameraInputRef.current.click();
    }
  };

  const hasActiveUploads = uploadProgress && (uploadProgress.processing > 0 || isUploading);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={isUploading}>
          {isUploading ? (
            <div className="animate-spin mr-2">
              <UploadIcon className="h-4 w-4" />
            </div>
          ) : (
            <CameraIcon className="h-4 w-4 sm:mr-2" />
          )}
          <span className="hidden sm:inline">
            {isUploading ? 'Uploading...' : 'Add Photos'}
          </span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Photos</DialogTitle>
          {approvalMode === 'manual' && (
            <p className="text-sm text-muted-foreground">
              Photos will require approval before appearing in the gallery.
            </p>
          )}
        </DialogHeader>
        
        {/* Upload progress section */}
        {hasActiveUploads && uploadProgress && (
          <div className="space-y-3 py-4 px-1">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Upload Progress</span>
              <span className="text-sm text-muted-foreground">
                {uploadProgress.completed + uploadProgress.failed}/{uploadProgress.total}
              </span>
            </div>
            
            <Progress value={uploadProgress.overallProgress} className="h-2" />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <div className="flex gap-4">
                {uploadProgress.processing > 0 && (
                  <span className="text-blue-600">
                    {uploadProgress.processing} processing
                  </span>
                )}
                {uploadProgress.completed > 0 && (
                  <span className="text-green-600">
                    {uploadProgress.completed} completed
                  </span>
                )}
                {uploadProgress.failed > 0 && (
                  <span className="text-red-600">
                    {uploadProgress.failed} failed
                  </span>
                )}
              </div>
              <span>{uploadProgress.overallProgress}%</span>
            </div>
          </div>
        )}
        
        {/* Upload options */}
        <div className="grid grid-cols-2 gap-4 py-4">
          <div
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${
              isUploading 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            onClick={() => {
              if (fileInputRef.current && !isUploading) {
                fileInputRef.current.click();
              }
            }}
          >
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={onFileUpload}
              disabled={isUploading}
            />
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full mb-2">
              <UploadIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            </div>
            <h3 className="font-medium text-sm">Upload Files</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
              Select multiple photos/videos
            </p>
          </div>
          
          <div
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${
              isUploading 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            onClick={handleCameraCapture}
          >
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              ref={cameraInputRef}
              onChange={onFileUpload}
              disabled={isUploading}
            />
            <div className="bg-primary/10 p-3 rounded-full mb-2">
              <CameraIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-medium text-sm">Take Photo</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
              Capture with camera
            </p>
          </div>
        </div>

        {/* Tips section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
            💡 Tips for best results:
          </h4>
          <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
            <li>• Maximum file size: 100MB per image</li>
            <li>• Supported formats: JPEG, PNG, WebP, HEIC</li>
            <li>• You'll see real-time progress updates</li>
            {approvalMode === 'auto' && (
              <li>• Photos appear instantly for guests</li>
            )}
          </ul>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoUploadDialog;