// components/BulkDownloadButton.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Download, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { createBulkDownload, downloadZipFile, getDownloadStatus } from '@/services/apis/bulk-download.api';

interface BulkDownloadButtonProps {
  shareToken: string;
  eventTitle?: string;
  totalPhotos?: number;
  authToken?: string | null;
  guestId?: string;
  guestName?: string;
  guestEmail?: string;
  quality?: 'thumbnail' | 'medium' | 'large' | 'original';
  includeVideos?: boolean;
  includeImages?: boolean;
  disabled?: boolean;
  className?: string;
}

interface DownloadState {
  status: 'idle' | 'requesting' | 'processing' | 'completed' | 'failed';
  jobId?: string;
  progress?: number;
  downloadUrl?: string;
  error?: string;
  estimatedTime?: number;
  totalFiles?: number;
}

export const BulkDownloadButton: React.FC<BulkDownloadButtonProps> = ({
  shareToken,
  eventTitle = 'Event Photos',
  totalPhotos,
  authToken,
  guestId,
  guestName,
  guestEmail,
  quality = 'original',
  includeVideos = true,
  includeImages = true,
  disabled = false,
  className = '',
}) => {
  const [downloadState, setDownloadState] = useState<DownloadState>({
    status: 'idle'
  });

  // Polling interval for checking download status
  const [statusInterval, setStatusInterval] = useState<NodeJS.Timeout | null>(null);

  // Create download mutation
  const createDownloadMutation = useMutation({
    mutationFn: async () => {
      const requestData = {
        shareToken,
        quality,
        includeVideos,
        includeImages,
        guestId: guestId || `guest_${Date.now()}`,
        guestName,
        guestEmail,
      };

      return createBulkDownload(requestData, authToken || undefined);
    },
    onSuccess: (response) => {
      const { downloadId, totalFiles, estimatedTimeMinutes } = response.data;
      
      setDownloadState({
        status: 'processing',
        jobId: downloadId,
        progress: 0,
        totalFiles,
        estimatedTime: estimatedTimeMinutes,
      });

      // Show success toast
      toast.success(`Download started! Processing ${totalFiles} files...`, {
        description: `Estimated time: ${estimatedTimeMinutes} minutes`,
      });

      // Start polling for status
      startStatusPolling(downloadId);
    },
    onError: (error: Error) => {
      setDownloadState({
        status: 'failed',
        error: error.message,
      });

      // Show error toast based on error message
      if (error.message.includes('Rate limit exceeded')) {
        toast.error('Download limit reached', {
          description: 'Please wait a few minutes before trying again.',
        });
      } else if (error.message.includes('No downloadable media found')) {
        toast.error('No photos available for download');
      } else if (error.message.includes('Download not permitted')) {
        toast.error('Download not allowed for this event');
      } else {
        toast.error('Download failed', {
          description: error.message,
        });
      }

      console.error('Download creation failed:', error);
    },
  });

  // Status polling function
  const startStatusPolling = useCallback((jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const statusResponse = await getDownloadStatus(jobId, authToken || undefined);
        const status = statusResponse.data;

        setDownloadState(prev => ({
          ...prev,
          progress: status.progress,
          downloadUrl: status.downloadUrl,
        }));

        // Check if completed
        if (status.status === 'completed' && status.downloadUrl) {
          clearInterval(interval);
          setStatusInterval(null);

          setDownloadState({
            status: 'completed',
            jobId,
            downloadUrl: status.downloadUrl,
            totalFiles: status.totalFiles,
          });

          // Automatically start download
          try {
            const filename = `${eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_photos.zip`;
            await downloadZipFile(status.downloadUrl, filename);
            
            toast.success('Download ready!', {
              description: 'Your photos are downloading now.',
              action: {
                label: 'Download Again',
                onClick: () => downloadZipFile(status.downloadUrl!, filename),
              },
            });
          } catch (downloadError) {
            console.warn('Auto download failed:', downloadError);
            toast.success('Download ready!', {
              description: 'Click the button to download your photos.',
            });
          }

        } else if (status.status === 'failed') {
          clearInterval(interval);
          setStatusInterval(null);

          setDownloadState({
            status: 'failed',
            error: status.errorMessage || 'Download processing failed',
          });

          toast.error('Download failed', {
            description: status.errorMessage || 'Something went wrong during processing.',
          });
        }

      } catch (error) {
        console.error('Status polling error:', error);
        // Continue polling unless it's a critical error
      }
    }, 3000); // Poll every 3 seconds

    setStatusInterval(interval);

    // Clean up after 10 minutes
    setTimeout(() => {
      clearInterval(interval);
      setStatusInterval(null);
      if (downloadState.status === 'processing') {
        setDownloadState(prev => ({
          ...prev,
          status: 'failed',
          error: 'Download timed out',
        }));
        toast.error('Download timed out', {
          description: 'Please try again.',
        });
      }
    }, 10 * 60 * 1000);
  }, [authToken, eventTitle, downloadState.status]);

  // Clean up polling on unmount
  React.useEffect(() => {
    return () => {
      if (statusInterval) {
        clearInterval(statusInterval);
      }
    };
  }, [statusInterval]);

  // Handle download button click
  const handleDownload = useCallback(() => {
    if (downloadState.status === 'completed' && downloadState.downloadUrl) {
      // Direct download if already completed
      const filename = `${eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_photos.zip`;
      downloadZipFile(downloadState.downloadUrl, filename).catch(error => {
        console.error('Download failed:', error);
        toast.error('Download failed', {
          description: 'Please try again or contact support.',
        });
      });
    } else {
      // Start new download
      setDownloadState({ status: 'requesting' });
      createDownloadMutation.mutate();
    }
  }, [downloadState, createDownloadMutation, eventTitle]);

  // Render different states
  const renderButtonContent = () => {
    switch (downloadState.status) {
      case 'idle':
        return (
          <>
            <Download className="w-4 h-4 mr-2" />
            Download All Photos
            {totalPhotos && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {totalPhotos}
              </Badge>
            )}
          </>
        );

      case 'requesting':
        return (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Preparing Download...
          </>
        );

      case 'processing':
        return (
          <>
            <Clock className="w-4 h-4 mr-2" />
            Processing ({downloadState.progress || 0}%)
            {downloadState.totalFiles && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {downloadState.totalFiles} files
              </Badge>
            )}
          </>
        );

      case 'completed':
        return (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Download Ready
          </>
        );

      case 'failed':
        return (
          <>
            <AlertCircle className="w-4 h-4 mr-2" />
            Try Again
          </>
        );

      default:
        return (
          <>
            <Download className="w-4 h-4 mr-2" />
            Download Photos
          </>
        );
    }
  };

  // Determine button variant and colors
  const getButtonVariant = () => {
    switch (downloadState.status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'processing':
      case 'requesting':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const isLoading = downloadState.status === 'requesting' || downloadState.status === 'processing';
  const isDisabled = disabled || isLoading;

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        onClick={handleDownload}
        disabled={isDisabled}
        variant={getButtonVariant()}
        className={`flex items-center gap-2 ${className}`}
      >
        {renderButtonContent()}
      </Button>

      {/* Status indicator */}
      {downloadState.status === 'processing' && (
        <div className="text-xs text-gray-600 text-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Creating your photo archive...
            {downloadState.estimatedTime && (
              <span>({downloadState.estimatedTime} min estimated)</span>
            )}
          </div>
        </div>
      )}

      {downloadState.status === 'failed' && downloadState.error && (
        <div className="text-xs text-red-600 text-center max-w-sm">
          {downloadState.error}
        </div>
      )}

      {downloadState.status === 'completed' && (
        <div className="text-xs text-green-600 text-center">
          Click to download your photo archive
        </div>
      )}
    </div>
  );
};