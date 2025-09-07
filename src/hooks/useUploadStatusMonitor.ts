// hooks/useUploadStatusMonitor.ts - Monitor upload progress

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface UploadStatus {
  id: string;
  filename: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  isComplete: boolean;
  isFailed: boolean;
  isProcessing: boolean;
  url: string;
  hasVariants: boolean;
  dimensions?: string;
  message: string;
}

export function useUploadStatusMonitor(
  mediaIds: string[],
  eventId: string,
  options: {
    onComplete?: (mediaId: string, status: UploadStatus) => void;
    onFailed?: (mediaId: string, status: UploadStatus) => void;
    pollInterval?: number;
    enabled?: boolean;
  } = {}
) {
  const queryClient = useQueryClient();
  const completedIds = useRef(new Set<string>());
  const failedIds = useRef(new Set<string>());

  const {
    data: statuses,
    isLoading,
    error
  } = useQuery({
    queryKey: ['uploadStatus', 'batch', mediaIds],
    queryFn: async () => {
      if (mediaIds.length === 0) return [];

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/media/status/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ mediaIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to check upload status');
      }

      const result = await response.json();
      return result.data || [];
    },
    enabled: options.enabled !== false && mediaIds.length > 0,
    refetchInterval: (data) => {
      // Stop polling if all uploads are complete or failed
      // Ensure data is an array before calling every()
      if (!Array.isArray(data) || data.length === 0) {
        return false; // Stop polling if no data or invalid data
      }
      
      const allDone = data.every((status: UploadStatus) => 
        status.isComplete || status.isFailed
      );
      return allDone ? false : (options.pollInterval || 3000);
    },
    refetchIntervalInBackground: true,
    staleTime: 1000, // Consider data stale after 1 second
  });

  // Handle completion and failure callbacks
  useEffect(() => {
    if (!statuses || !Array.isArray(statuses)) return;

    statuses.forEach((status: UploadStatus) => {
      // Handle completed uploads
      if (status.isComplete && !completedIds.current.has(status.id)) {
        completedIds.current.add(status.id);
        
        // Update the photo in cache with new URL
        updatePhotoInCache(status.id, {
          imageUrl: status.url,
          processing: false,
          hasVariants: status.hasVariants,
          dimensions: status.dimensions
        });

        // Show success notification
        toast.success(`"${status.filename}" processed successfully!`, {
          description: 'High-quality version is now available',
          duration: 3000,
        });

        options.onComplete?.(status.id, status);
      }

      // Handle failed uploads
      if (status.isFailed && !failedIds.current.has(status.id)) {
        failedIds.current.add(status.id);
        
        // Update photo in cache to show error state
        updatePhotoInCache(status.id, {
          processing: false,
          error: true,
          errorMessage: status.message
        });

        // Show error notification
        toast.error(`"${status.filename}" processing failed`, {
          description: status.message,
          duration: 5000,
        });

        options.onFailed?.(status.id, status);
      }
    });
  }, [statuses, options]);

  // Helper function to update photo in cache
  const updatePhotoInCache = (mediaId: string, updates: Partial<any>) => {
    // Update all relevant query caches
    const statuses = ['approved', 'pending', 'rejected', 'hidden', 'auto_approved'];
    
    statuses.forEach(status => {
      queryClient.setQueryData(
        ['eventPhotos', eventId, status],
        (oldData: any) => {
          if (!oldData) return oldData;
          
          return oldData.map((photo: any) => 
            photo.id === mediaId ? { ...photo, ...updates } : photo
          );
        }
      );

      // Also update infinite query caches
      queryClient.setQueryData(
        ['eventPhotos', eventId, status, 'infinite'],
        (oldData: any) => {
          if (!oldData?.pages) return oldData;
          
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              data: page.data?.map((photo: any) => 
                photo.id === mediaId ? { ...photo, ...updates } : photo
              )
            }))
          };
        }
      );
    });
  };

  // Get processing summary
  const summary = Array.isArray(statuses) ? {
    total: statuses.length,
    completed: statuses.filter((s: UploadStatus) => s.isComplete).length,
    processing: statuses.filter((s: UploadStatus) => s.isProcessing).length,
    failed: statuses.filter((s: UploadStatus) => s.isFailed).length,
    allDone: statuses.every((s: UploadStatus) => s.isComplete || s.isFailed)
  } : null;

  return {
    statuses: statuses || [],
    summary,
    isLoading,
    error,
    isMonitoring: !summary?.allDone
  };
}

/**
 * 🚀 SIMPLIFIED STATUS HOOK: For single photo monitoring
 */
export function useUploadStatus(
  mediaId: string,
  eventId: string,
  options: {
    onComplete?: (status: UploadStatus) => void;
    onFailed?: (status: UploadStatus) => void;
    enabled?: boolean;
  } = {}
) {
  const { statuses, summary, isLoading, error, isMonitoring } = useUploadStatusMonitor(
    [mediaId],
    eventId,
    {
      ...options,
      onComplete: options.onComplete ? (id, status) => options.onComplete!(status) : undefined,
      onFailed: options.onFailed ? (id, status) => options.onFailed!(status) : undefined,
    }
  );

  return {
    status: statuses[0] || null,
    isLoading,
    error,
    isMonitoring
  };
}