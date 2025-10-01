// hooks/useWebSocketUploadProgress.ts - FIXED EVENT NAMES
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEventWebSocket } from './useEventWebSocket';

interface ProgressUpdate {
  mediaId: string;
  eventId: string;
  filename: string;
  stage: string;
  percentage: number;
  status: 'processing' | 'completed' | 'failed';
  message: string;
  error?: string;
  timestamp: string;
}

interface MediaProcessingProgressEvent {
  mediaId: string;
  eventId: string;
  filename: string;
  status: 'processing' | 'completed' | 'failed';
  processingStage: string;
  progressPercentage: number;
  message?: string;
  uploadedBy: {
    id: string;
    name: string;
    type: 'admin' | 'guest';
  };
}

interface NewMediaUploadedEvent {
  mediaId: string;
  eventId: string;
  media: {
    url: string;
    thumbnailUrl: string;
    filename: string;
  };
  uploadedBy: {
    id: string;
    name: string;
    type: 'admin' | 'guest';
  };
  processingStatus: 'optimistic' | 'processing';
  isInstantPreview?: boolean;
}

interface MediaProcessingCompleteEvent {
  mediaId: string;
  eventId: string;
  processingStatus: 'completed';
  progress: number;
  stage: 'completed';
  variantsGenerated: boolean;
  finalUrl: string;
  variants?: any;
  processingTime?: number;
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
  const webSocket = useEventWebSocket(eventId, { userType: 'admin' });
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState>({});
  const [isMonitoring, setIsMonitoring] = useState(false);

  const completedIds = useRef(new Set<string>());
  const failedIds = useRef(new Set<string>());
  const listenersSetup = useRef(false);
  const lastProgressUpdate = useRef<Map<string, number>>(new Map());

  const { showToasts = true } = options;

  const onCompleteRef = useRef(options.onComplete);
  const onFailedRef = useRef(options.onFailed);

  useEffect(() => {
    onCompleteRef.current = options.onComplete;
    onFailedRef.current = options.onFailed;
  }, [options.onComplete, options.onFailed]);

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

  // FIXED: Handle new_media_uploaded event (optimistic preview)
  const handleNewMediaUploaded = useCallback((data: NewMediaUploadedEvent) => {
    console.log('📸 New media uploaded (optimistic):', data.mediaId.substring(0, 8));
    
    // Initialize progress tracking with optimistic state
    setUploadProgress(prev => ({
      ...prev,
      [data.mediaId]: {
        mediaId: data.mediaId,
        filename: data.media.filename,
        stage: 'uploading',
        percentage: 10,
        message: 'Preview ready, processing...',
        status: 'processing',
        startTime: new Date(),
        lastUpdate: new Date()
      }
    }));

    // Update cache with temp preview
    updatePhotoInCache(data.mediaId, {
      url: data.media.thumbnailUrl,
      thumbnailUrl: data.media.thumbnailUrl,
      processing: true,
      processingStatus: 'processing'
    });

    setIsMonitoring(true);
  }, [updatePhotoInCache]);

  // FIXED: Handle media_processing_progress event (not processing_progress)
  const handleMediaProcessingProgress = useCallback((data: MediaProcessingProgressEvent) => {
    const lastUpdate = lastProgressUpdate.current.get(data.mediaId);
    const currentTime = Date.now();

    if (lastUpdate && (currentTime - lastUpdate) < 100) {
      return;
    }

    lastProgressUpdate.current.set(data.mediaId, currentTime);

    console.log('🔄 Processing progress:', data.mediaId.substring(0, 8), `${data.progressPercentage}%`, data.processingStage);

    setUploadProgress(prev => {
      const existing = prev[data.mediaId];
      
      // Skip if same data
      if (existing &&
        existing.percentage === data.progressPercentage &&
        existing.stage === data.processingStage &&
        existing.status === data.status) {
        return prev;
      }

      return {
        ...prev,
        [data.mediaId]: {
          mediaId: data.mediaId,
          filename: existing?.filename || data.filename || 'Unknown file',
          stage: data.processingStage,
          percentage: data.progressPercentage,
          message: data.message || `${data.processingStage} - ${data.progressPercentage}%`,
          status: data.status === 'completed' ? 'completed' :
            data.status === 'failed' ? 'failed' : 'processing',
          startTime: existing?.startTime || new Date(),
          lastUpdate: new Date()
        }
      };
    });

    setIsMonitoring(true);
  }, []);

  // FIXED: Handle media_processing_complete event (not processing_complete)
  const handleMediaProcessingComplete = useCallback((data: MediaProcessingCompleteEvent) => {
    if (completedIds.current.has(data.mediaId)) {
      console.log('⏭️ Skipping duplicate completion for:', data.mediaId.substring(0, 8));
      return;
    }

    completedIds.current.add(data.mediaId);
    console.log('✅ Processing complete:', data.mediaId.substring(0, 8));

    // Update progress to 100%
    setUploadProgress(prev => {
      const existing = prev[data.mediaId];
      if (!existing) return prev;

      return {
        ...prev,
        [data.mediaId]: {
          ...existing,
          percentage: 100,
          stage: 'completed',
          message: 'Processing complete!',
          status: 'completed',
          lastUpdate: new Date()
        }
      };
    });

    // Update cache with final URL
    updatePhotoInCache(data.mediaId, {
      url: data.finalUrl,
      thumbnailUrl: data.finalUrl,
      processing: false,
      hasVariants: true,
      processingStatus: 'completed'
    });

    if (showToasts) {
      toast.success('Processing completed!', {
        description: 'High-quality version is now available',
        duration: 3000,
      });
    }

    // Get filename from progress state
    const progressItem = uploadProgress[data.mediaId];
    onCompleteRef.current?.(data.mediaId, {
      mediaId: data.mediaId,
      eventId: data.eventId,
      filename: progressItem?.filename || 'Unknown',
      stage: 'completed',
      percentage: 100,
      status: 'completed',
      message: 'Complete',
      timestamp: new Date().toISOString()
    });

    // Remove from progress after delay
    setTimeout(() => {
      setUploadProgress(prev => {
        const newState = { ...prev };
        delete newState[data.mediaId];
        return newState;
      });
    }, 3000);
  }, [uploadProgress, updatePhotoInCache, showToasts]);

  // FIXED: Handle media_upload_failed event
  const handleMediaUploadFailed = useCallback((data: any) => {
    if (failedIds.current.has(data.mediaId)) {
      console.log('⏭️ Skipping duplicate failure for:', data.mediaId.substring(0, 8));
      return;
    }

    failedIds.current.add(data.mediaId);
    console.log('❌ Processing failed:', data.mediaId.substring(0, 8));

    const progressItem = uploadProgress[data.mediaId];

    setUploadProgress(prev => ({
      ...prev,
      [data.mediaId]: {
        mediaId: data.mediaId,
        filename: progressItem?.filename || 'Unknown file',
        stage: 'failed',
        percentage: 0,
        message: data.error?.message || 'Processing failed',
        status: 'failed',
        startTime: progressItem?.startTime || new Date(),
        lastUpdate: new Date(),
        error: data.error?.message
      }
    }));

    updatePhotoInCache(data.mediaId, {
      processing: false,
      error: true,
      errorMessage: data.error?.message || 'Processing failed'
    });

    if (showToasts) {
      toast.error('Processing failed', {
        description: data.error?.message || 'Please try uploading again',
        duration: 5000,
      });
    }

    onFailedRef.current?.(data.mediaId, {
      mediaId: data.mediaId,
      eventId: data.eventId,
      filename: progressItem?.filename || 'Unknown',
      stage: 'failed',
      percentage: 0,
      status: 'failed',
      message: data.error?.message || 'Processing failed',
      error: data.error?.message,
      timestamp: new Date().toISOString()
    });
  }, [uploadProgress, updatePhotoInCache, showToasts]);

  // Set up WebSocket listeners ONLY ONCE with CORRECT event names
  useEffect(() => {
    if (!webSocket.socket || listenersSetup.current) return;

    console.log('🎧 Setting up WebSocket upload progress listeners');
    listenersSetup.current = true;

    // FIXED: Listen to the ACTUAL events your backend emits
    webSocket.socket.on('new_media_uploaded', handleNewMediaUploaded);
    webSocket.socket.on('media_processing_progress', handleMediaProcessingProgress);
    webSocket.socket.on('media_processing_complete', handleMediaProcessingComplete);
    webSocket.socket.on('media_upload_failed', handleMediaUploadFailed);

    return () => {
      if (webSocket.socket) {
        console.log('🔌 Cleaning up WebSocket upload progress listeners');
        webSocket.socket.off('new_media_uploaded', handleNewMediaUploaded);
        webSocket.socket.off('media_processing_progress', handleMediaProcessingProgress);
        webSocket.socket.off('media_processing_complete', handleMediaProcessingComplete);
        webSocket.socket.off('media_upload_failed', handleMediaUploadFailed);
      }
      listenersSetup.current = false;
    };
  }, [webSocket.socket, handleNewMediaUploaded, handleMediaProcessingProgress, handleMediaProcessingComplete, handleMediaUploadFailed]);

  useEffect(() => {
    const hasActiveUploads = Object.values(uploadProgress).some(
      progress => progress.status === 'processing' || progress.status === 'uploading'
    );
    setIsMonitoring(hasActiveUploads);
  }, [uploadProgress]);

  const startMonitoring = useCallback((mediaIds: string[], filenames: string[]) => {
    console.log('📊 Starting upload monitoring for:', mediaIds.length, 'files');

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
    completedIds.current.clear();
    failedIds.current.clear();
    lastProgressUpdate.current.clear();
  }, []);

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

  const clearAll = useCallback(() => {
    setUploadProgress({});
    setIsMonitoring(false);
    completedIds.current.clear();
    failedIds.current.clear();
    lastProgressUpdate.current.clear();
  }, []);

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
    isConnected: webSocket.isConnected,
    isAuthenticated: webSocket.isAuthenticated,
    connectionError: webSocket.connectionError
  };
}