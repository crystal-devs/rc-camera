import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuid } from 'uuid';
import { API_BASE_URL } from '@/lib/api-config';
import { useEventWebSocket } from '@/hooks/useEventWebSocket';
import { getBulkUploadUrls } from '@/services/apis/media.api';
import { useAuthToken } from '@/hooks/use-auth';

interface UploadButtonProps {
  eventId: string;
  onUploadComplete?: (mediaData: {
    mediaId: string;
    originalUrl: string;
    uploadId: string;
    fileName: string;
  }) => void;
}

interface UploadProgress {
  [fileName: string]: number;
}

export default function UploadButton({ eventId, onUploadComplete }: UploadButtonProps) {
  const authToken = useAuthToken();


  const [progress, setProgress] = useState<UploadProgress>({});
  const [previewUrls, setPreviewUrls] = useState<{ [fileName: string]: string }>({});
  const [isUploading, setIsUploading] = useState(false);

  // Use the centralized WebSocket hook
  const webSocket = useEventWebSocket(eventId, {
    userType: 'admin', // Assuming this is for guest uploads
    enabled: !!eventId
  });

  useEffect(() => {
    if (!webSocket.socket) return;

    const handlePhotoUploading = (data: any) => {
      if (data.id && data.fileName) {
        setPreviewUrls(prev => ({ ...prev, [data.fileName]: data.previewUrl }));
      }
    };

    const handlePhotoReady = (data: any) => {
      if (data.id && data.fileName) {
        setPreviewUrls(prev => ({ ...prev, [data.fileName]: data.smallUrl }));
      }
      // Call onUploadComplete to update gallery with smallUrl
      if (onUploadComplete && data.id && data.fileName && data.smallUrl) {
        onUploadComplete({
          mediaId: data.id,
          originalUrl: data.smallUrl, // Use smallUrl as the updated URL
          uploadId: data.uploadId || '',
          fileName: data.fileName
        });
      }
    };

    webSocket.socket.on('photo-uploading', handlePhotoUploading);
    webSocket.socket.on('photo-ready', handlePhotoReady);

    return () => {
      if (webSocket.socket) {
        webSocket.socket.off('photo-uploading', handlePhotoUploading);
        webSocket.socket.off('photo-ready', handlePhotoReady);
      }
    };
  }, [webSocket.socket, onUploadComplete]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    if (fileArray.length > 20) {
      alert('Maximum 20 files allowed at once');
      return;
    }

    setIsUploading(true);
    setProgress({});
    setPreviewUrls({});

    try {
      // Prepare file data for bulk URL request
      const fileData = fileArray.map(file => ({
        fileName: file.name,
        fileType: file.type
      }));

      // Get bulk upload URLs
      const response = await getBulkUploadUrls(eventId, fileData, authToken || ''); // TODO: Add auth token
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

          // Notify complete
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

          // Call onUploadComplete with the response data
          if (onUploadComplete && completeResponse.data?.data) {
            onUploadComplete({
              mediaId: completeResponse.data.data.mediaId,
              originalUrl: completeResponse.data.data.originalUrl,
              uploadId: completeResponse.data.data.upload_id,
              fileName: file.name
            });
          }

          setProgress(prev => ({ ...prev, [file.name]: 100 }));
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          setProgress(prev => ({ ...prev, [file.name]: -1 })); // Error state
        }
      });

      await Promise.allSettled(uploadPromises);
    } catch (err) {
      console.error('Bulk upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const overallProgress = Object.values(progress).reduce((sum, p) => sum + (p >= 0 ? p : 0), 0) / Math.max(Object.keys(progress).length, 1);

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        multiple
        disabled={isUploading}
        onChange={(e) => handleUpload(e.target.files)}
      />
      {isUploading && (
        <div>
          <div>Overall Progress: {overallProgress.toFixed(1)}%</div>
          <progress value={overallProgress} max="100" />
          {Object.entries(progress).map(([fileName, prog]) => (
            <div key={fileName}>
              {fileName}: {prog === -1 ? 'Failed' : `${prog.toFixed(1)}%`}
              {prog === 100 && previewUrls[fileName] && (
                <img src={previewUrls[fileName]} alt={fileName} style={{ width: '100px', margin: '5px' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}