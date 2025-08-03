import { CameraIcon, DownloadIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";

interface PhotoUploadDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  isUploading: boolean;
  approvalMode: 'auto' | 'manual' | 'ai_assisted';
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  cameraInputRef: React.RefObject<HTMLInputElement>;
  handleCameraCapture: () => void;
  uploadProgress?: number; // Optional progress indicator
}

const PhotoUploadDialog: React.FC<PhotoUploadDialogProps> = ({
  open,
  setOpen,
  isUploading,
  approvalMode,
  onFileUpload,
  fileInputRef,
  cameraInputRef,
  handleCameraCapture,
  uploadProgress
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
        
        {/* Show upload progress if uploading */}
        {isUploading && uploadProgress !== undefined && (
          <div className="py-2">
            <div className="flex justify-between text-sm mb-1">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 py-4">
          <div
            className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onClick={() => {
              if (fileInputRef.current && !isUploading) {
                fileInputRef.current.click();
              }
            }}
          >
            <input
              type="file"
              accept="image/*,video/*" // Accept both images and videos
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={onFileUpload}
              disabled={isUploading}
            />
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full mb-2">
              <DownloadIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            </div>
            <h3 className="font-medium text-sm">Upload Photos</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
              Select multiple photos/videos from your device
            </p>
          </div>
          
          <div
            className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onClick={() => !isUploading && handleCameraCapture()}
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
              Capture a new photo with camera
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoUploadDialog;