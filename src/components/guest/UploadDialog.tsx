// components/event/UploadDialog.tsx - Clean version
'use client';
import React, { useState } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { uploadGuestPhotos } from '@/services/apis/guest.api';
import { EventDetails } from '@/types/events';

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shareToken: string;
  eventDetails: EventDetails | null;
  auth: string | null;
  onUploadSuccess: () => void;
}

export const UploadDialog: React.FC<UploadDialogProps> = ({
  isOpen,
  onClose,
  shareToken,
  eventDetails,
  auth,
  onUploadSuccess
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '' });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one photo');
      return;
    }

    try {
      setUploading(true);
      
      const result = await uploadGuestPhotos(
        shareToken,
        selectedFiles,
        guestInfo,
        auth || undefined
      );

      if (result.status) {
        const { summary } = result.data;
        if (summary.success > 0) {
          toast.success(`${summary.success} photo(s) uploaded successfully!`);
          handleClose();
          onUploadSuccess();
        } else {
          toast.error('All uploads failed. Please try again.');
        }
      } else {
        toast.error(result.message || 'Upload failed');
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setGuestInfo({ name: '', email: '' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-500" />
            Share Your Photos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4">
          {/* Guest info for non-authenticated users */}
          {!auth && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Tell us who you are (optional)</p>
              <Input
                placeholder="Your name"
                value={guestInfo.name}
                onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
              />
              <Input
                type="email"
                placeholder="Your email"
                value={guestInfo.email}
                onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
              />
            </div>
          )}

          {/* File selection */}
          <div className="space-y-3">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Camera className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">Click to select photos or videos</p>
                <p className="text-xs text-gray-500 mt-1">Max 10 files, 50MB each</p>
              </label>
            </div>

            {/* Selected files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{selectedFiles.length} file(s) selected:</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm">
                      <span className="truncate flex-1">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Guidelines */}
          <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 space-y-1">
            <p>• Photos will be {eventDetails?.permissions?.require_approval ? 'reviewed before appearing' : 'visible immediately'}</p>
            <p>• Supported formats: JPG, PNG, HEIC, MP4, MOV</p>
            <p>• Please only upload appropriate content</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || uploading}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};