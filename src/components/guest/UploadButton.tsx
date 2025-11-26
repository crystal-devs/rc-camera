import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, X, FileImage, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { API_BASE_URL } from '@/lib/api-config';
import { useEventWebSocket } from '@/hooks/useEventWebSocket';
import { getBulkUploadUrls } from '@/services/apis/media.api';
import { useAuthToken } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface UploadButtonProps {
  eventId: string;
  onUploadComplete?: (mediaData: {
    mediaId: string;
    originalUrl: string;
    uploadId: string;
    fileName: string;
  }) => void;
  className?: string;
}

interface UploadProgress {
  [fileName: string]: number;
}

interface UploadStatus {
  [fileName: string]: 'uploading' | 'completed' | 'error';
}

export default function UploadButton({ eventId, onUploadComplete, className }: UploadButtonProps) {
  const authToken = useAuthToken();
  const [progress, setProgress] = useState<UploadProgress>({});
  const [status, setStatus] = useState<UploadStatus>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use the centralized WebSocket hook
  const webSocket = useEventWebSocket(eventId, {
    userType: 'admin',
    enabled: !!eventId
  });

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    if (fileArray.length > 20) {
      alert('Maximum 20 files allowed at once');
      return;
    }

    setIsUploading(true);
    setIsExpanded(true);

    // Initialize states
    const initialProgress: UploadProgress = {};
    const initialStatus: UploadStatus = {};
    fileArray.forEach(file => {
      initialProgress[file.name] = 0;
      initialStatus[file.name] = 'uploading';
    });
    setProgress(initialProgress);
    setStatus(initialStatus);

    try {
      // Prepare file data for bulk URL request
      const fileData = fileArray.map(file => ({
        fileName: file.name,
        fileType: file.type
      }));

      // Get bulk upload URLs
      const response = await getBulkUploadUrls(eventId, fileData, authToken || '');
      const { uploadUrls } = response.data;

      // Upload files concurrently
      const uploadPromises = fileArray.map(async (file, index) => {
        const uploadData = uploadUrls[index];
        if (!uploadData) return;

        try {
          // Upload to S3
          await axios.put(uploadData.uploadUrl, file, {
            headers: { 'Content-Type': file.type },
            onUploadProgress: (e) => {
              const percent = (e.loaded / (e.total || 1)) * 100;
              setProgress(prev => ({ ...prev, [file.name]: percent }));
            },
          });

          // Notify backend about completion
          const completeResponse = await axios.post(
            `${API_BASE_URL}/media/upload-complete`,
            {
              key: uploadData.key,
              eventId,
              upload_id: uploadData.uploadId,
            },
            {
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          // Extract data from response
          const { data: responseData } = completeResponse.data;

          if (!responseData?.mediaId || !responseData?.originalUrl) {
            throw new Error('Invalid response: missing mediaId or originalUrl');
          }

          setStatus(prev => ({ ...prev, [file.name]: 'completed' }));

          if (onUploadComplete) {
            onUploadComplete({
              mediaId: responseData.mediaId,
              originalUrl: responseData.originalUrl,
              uploadId: responseData.upload_id || uploadData.uploadId,
              fileName: file.name
            });
          }
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          setStatus(prev => ({ ...prev, [file.name]: 'error' }));
        }
      });

      await Promise.allSettled(uploadPromises);
    } catch (err) {
      console.error('Bulk upload failed:', err);
    } finally {
      setIsUploading(false);
      // Reset input value to allow selecting same files again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Auto collapse after 3 seconds if all successful
      setTimeout(() => {
        const hasErrors = Object.values(status).some(s => s === 'error');
        if (!hasErrors) {
          setIsExpanded(false);
          setProgress({});
          setStatus({});
        }
      }, 3000);
    }
  };

  const overallProgress = Object.values(progress).reduce((sum, p) => sum + p, 0) / Math.max(Object.keys(progress).length, 1);
  const activeUploads = Object.keys(progress).length;

  return (
    <div className={cn("relative", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        disabled={isUploading}
        onChange={(e) => handleUpload(e.target.files)}
      />

      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="gap-2"
      >
        <UploadCloud className="h-4 w-4" />
        {isUploading ? 'Uploading...' : 'Choose Files'}
      </Button>

      {isExpanded && activeUploads > 0 && (
        <Card className="absolute top-full right-0 mt-2 w-80 z-50 p-4 shadow-lg animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Upload Progress</h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Overall</span>
                <span>{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>

            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-3">
                {Object.entries(progress).map(([fileName, prog]) => (
                  <div key={fileName} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate max-w-[180px]">
                        {status[fileName] === 'completed' ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : status[fileName] === 'error' ? (
                          <AlertCircle className="h-3 w-3 text-red-500" />
                        ) : (
                          <FileImage className="h-3 w-3 text-blue-500" />
                        )}
                        <span className="truncate">{fileName}</span>
                      </div>
                      <span className={cn(
                        "text-xs",
                        status[fileName] === 'completed' && "text-green-500",
                        status[fileName] === 'error' && "text-red-500"
                      )}>
                        {status[fileName] === 'error' ? 'Failed' : `${Math.round(prog)}%`}
                      </span>
                    </div>
                    <Progress
                      value={prog}
                      className={cn(
                        "h-1",
                        status[fileName] === 'error' && "bg-red-100 [&>div]:bg-red-500",
                        status[fileName] === 'completed' && "bg-green-100 [&>div]:bg-green-500"
                      )}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </Card>
      )}
    </div>
  );
}