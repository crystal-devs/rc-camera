// hooks/useWebSocketUploadProgress.ts - Fixed to prevent infinite loops
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSimpleWebSocket } from '@/hooks/useWebSocket';

interface ProgressUpdate {
  mediaId: string;
  eventId: string;
  filename: string;
  stage: 'uploading' | 'processing' | 'variants_creating' | 'finalizing' | 'completed';
  percentage: number;
  status: 'processing' | 'completed' | 'failed';
  message: string;
  error?: string;
  timestamp: string;
}

interface UploadProgressState {
  [mediaId: string]: {
    mediaId: string;
    filename: string;
    stage: string;
    percentage: number;
    message: string;
    status: 'uploading' | 'processing' | 'completed' | 'failed';
    startTime: Date;
    lastUpdate: Date;
    error?: string;
  };
}

export function useWebSocketUploadProgress(
  eventId: string,
  options: {
    onComplete?: (mediaId: string, data: ProgressUpdate) => void;
    onFailed?: (mediaId: string, data: ProgressUpdate) => void;
    showToasts?: boolean;
  } = {}
) {
  const queryClient = useQueryClient();
  const webSocket = useSimpleWebSocket(eventId, undefined, 'admin');
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState>({});
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  // Use refs to prevent recreating listeners
  const completedIds = useRef(new Set<string>());
  const failedIds = useRef(new Set<string>());
  const listenersSetup = useRef(false);
  const lastProgressUpdate = useRef<Map<string, number>>(new Map());

  const { showToasts = true } = options;

  // Stable callback references
  const onCompleteRef = useRef(options.onComplete);
  const onFailedRef = useRef(options.onFailed);
  
  useEffect(() => {
    onCompleteRef.current = options.onComplete;
    onFailedRef.current = options.onFailed;
  }, [options.onComplete, options.onFailed]);

  // Helper function to update photo in cache - make it stable
  const updatePhotoInCache = useCallback((mediaId: string, updates: Partial<any>) => {
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
  }, [queryClient, eventId]);

  // Handle progress updates - prevent infinite updates
  const handleProgressUpdate = useCallback((data: ProgressUpdate) => {
    // Check if this is a duplicate update
    const lastUpdate = lastProgressUpdate.current.get(data.mediaId);
    const currentTime = Date.now();
    
    // Prevent rapid duplicate updates (less than 100ms apart)
    if (lastUpdate && (currentTime - lastUpdate) < 100) {
      return;
    }
    
    lastProgressUpdate.current.set(data.mediaId, currentTime);

    console.log('WebSocket progress update:', data.mediaId.substring(0, 8), data.stage, data.percentage + '%');

    setUploadProgress(prev => {
      // Don't update if it's the same data
      const existing = prev[data.mediaId];
      if (existing && 
          existing.percentage === data.percentage && 
          existing.stage === data.stage && 
          existing.status === data.status) {
        return prev;
      }

      return {
        ...prev,
        [data.mediaId]: {
          mediaId: data.mediaId,
          filename: data.filename,
          stage: data.stage,
          percentage: data.percentage,
          message: data.message,
          status: data.status === 'completed' ? 'completed' : 
                  data.status === 'failed' ? 'failed' : 'processing',
          startTime: existing?.startTime || new Date(),
          lastUpdate: new Date(),
          error: data.error
        }
      };
    });

    setIsMonitoring(true);

    // Handle completion - only once per media
    if (data.status === 'completed' && !completedIds.current.has(data.mediaId)) {
      completedIds.current.add(data.mediaId);
      
      updatePhotoInCache(data.mediaId, {
        processing: false,
        hasVariants: true,
        processingStatus: 'completed'
      });

      if (showToasts) {
        toast.success(`"${data.filename}" processed successfully!`, {
          description: 'High-quality version is now available',
          duration: 3000,
        });
      }

      onCompleteRef.current?.(data.mediaId, data);

      // Remove from progress after delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newState = { ...prev };
          delete newState[data.mediaId];
          return newState;
        });
      }, 3000);
    }

    // Handle failure - only once per media
    if (data.status === 'failed' && !failedIds.current.has(data.mediaId)) {
      failedIds.current.add(data.mediaId);
      
      updatePhotoInCache(data.mediaId, {
        processing: false,
        error: true,
        errorMessage: data.error || 'Processing failed'
      });

      if (showToasts) {
        toast.error(`"${data.filename}" processing failed`, {
          description: data.error || 'Unknown error occurred',
          duration: 5000,
        });
      }

      onFailedRef.current?.(data.mediaId, data);
    }
  }, [updatePhotoInCache, showToasts]);

  // Handle completion updates
  const handleCompletionUpdate = useCallback((data: any) => {
    console.log('WebSocket completion update:', data.mediaId?.substring(0, 8));
    queryClient.invalidateQueries({ queryKey: ['eventPhotos', eventId] });
  }, [queryClient, eventId]);

  // Set up WebSocket listeners ONLY ONCE
  useEffect(() => {
    if (!webSocket.socket || listenersSetup.current) return;

    console.log('Setting up WebSocket upload progress listeners - ONE TIME ONLY');
    listenersSetup.current = true;

    webSocket.socket.on('upload_progress', handleProgressUpdate);
    webSocket.socket.on('upload_completed', handleCompletionUpdate);
    webSocket.socket.on('media_ready', handleCompletionUpdate);

    // Cleanup function
    return () => {
      if (webSocket.socket) {
        console.log('Cleaning up WebSocket upload progress listeners');
        webSocket.socket.off('upload_progress', handleProgressUpdate);
        webSocket.socket.off('upload_completed', handleCompletionUpdate);
        webSocket.socket.off('media_ready', handleCompletionUpdate);
      }
      listenersSetup.current = false;
    };
  }, [webSocket.socket]); // Only depend on socket, not the handlers

  // Monitor if we have active uploads
  useEffect(() => {
    const hasActiveUploads = Object.values(uploadProgress).some(
      progress => progress.status === 'processing' || progress.status === 'uploading'
    );
    setIsMonitoring(hasActiveUploads);
  }, [uploadProgress]);

  // Start monitoring function
  const startMonitoring = useCallback((mediaIds: string[], filenames: string[]) => {
    console.log('Starting upload monitoring for:', mediaIds.length, 'files');
    
    const initialProgress: UploadProgressState = {};
    mediaIds.forEach((mediaId, index) => {
      initialProgress[mediaId] = {
        mediaId,
        filename: filenames[index] || 'Unknown file',
        stage: 'uploading',
        percentage: 0,
        message: 'Starting upload...',
        status: 'uploading',
        startTime: new Date(),
        lastUpdate: new Date()
      };
    });

    setUploadProgress(prev => ({
      ...prev,
      ...initialProgress
    }));

    setIsMonitoring(true);

    // Clear previous tracking
    completedIds.current.clear();
    failedIds.current.clear();
    lastProgressUpdate.current.clear();
  }, []);

  // Stop monitoring function
  const stopMonitoring = useCallback((mediaIds?: string[]) => {
    if (mediaIds) {
      setUploadProgress(prev => {
        const newState = { ...prev };
        mediaIds.forEach(id => {
          delete newState[id];
          lastProgressUpdate.current.delete(id);
        });
        return newState;
      });
    } else {
      setUploadProgress({});
      setIsMonitoring(false);
      lastProgressUpdate.current.clear();
    }
  }, []);

  // Clear all progress
  const clearAll = useCallback(() => {
    setUploadProgress({});
    setIsMonitoring(false);
    completedIds.current.clear();
    failedIds.current.clear();
    lastProgressUpdate.current.clear();
  }, []);

  // Calculate summary
  const summary = {
    total: Object.keys(uploadProgress).length,
    uploading: Object.values(uploadProgress).filter(p => p.status === 'uploading').length,
    processing: Object.values(uploadProgress).filter(p => p.status === 'processing').length,
    completed: Object.values(uploadProgress).filter(p => p.status === 'completed').length,
    failed: Object.values(uploadProgress).filter(p => p.status === 'failed').length,
    overallProgress: Object.keys(uploadProgress).length > 0 ? 
      Math.round(
        Object.values(uploadProgress).reduce((sum, p) => sum + p.percentage, 0) / 
        Object.keys(uploadProgress).length
      ) : 0
  };

  return {
    uploadProgress,
    isMonitoring,
    summary,
    startMonitoring,
    stopMonitoring,
    clearAll,
    
    // WebSocket connection info
    isConnected: webSocket.isConnected,
    isAuthenticated: webSocket.isAuthenticated,
    connectionError: webSocket.connectionError
  };
}