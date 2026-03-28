// hooks/useUploadProgress.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { SSE_UPLOAD_PROGRESS_ROUTE } from '@/services/apis/z.all-routes';

export interface UploadProgressData {
    mediaId: string;
    eventId: string;
    stage: 'queued' | 'uploading' | 'preview_creating' | 'processing' | 'variants_creating' | 'completed' | 'failed' | 'paused' | 'preview_ready';
    percentage: number;
    message?: string;
    filename?: string;
    currentOperation?: string;
    timestamp: string;
}

export interface UploadProgressState {
    [mediaId: string]: {
        mediaId: string;
        filename: string;
        stage: string;
        percentage: number;
        message: string;
        status: 'uploading' | 'processing' | 'completed' | 'failed';
        startTime: Date;
        lastUpdate: Date;
        isStale?: boolean;
    };
}

export interface UseUploadProgressOptions {
    onProgress?: (mediaId: string, progress: UploadProgressData) => void;
    onComplete?: (mediaId: string) => void;
    onFailed?: (mediaId: string, error: string) => void;
    maxStaleTime?: number; // Remove progress after this time (ms)
    showToasts?: boolean;
}

export function useUploadProgress(
    webSocket: any,
    eventId: string,
    options: UseUploadProgressOptions = {}
) {
    const {
        onProgress,
        onComplete,
        onFailed,
        maxStaleTime = 300000, // 5 minutes
        showToasts = true
    } = options;

    const [uploadProgress, setUploadProgress] = useState<UploadProgressState>({});
    const [isMonitoring, setIsMonitoring] = useState(false);
    const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Start monitoring uploads
    const startMonitoring = useCallback((mediaIds: string[], filenames?: string[]) => {
        console.log('📊 Starting upload progress monitoring for:', mediaIds);
        
        const now = new Date();
        setUploadProgress(prev => {
            const updated = { ...prev };
            
            mediaIds.forEach((mediaId, index) => {
                updated[mediaId] = {
                    mediaId,
                    filename: filenames?.[index] || `File ${index + 1}`,
                    stage: 'uploading',
                    percentage: 0,
                    message: 'Starting upload...',
                    status: 'uploading',
                    startTime: now,
                    lastUpdate: now
                };
            });
            
            return updated;
        });
        
        setIsMonitoring(true);

        if (showToasts && mediaIds.length === 1) {
            toast.success('Upload started!', {
                description: `Processing ${filenames?.[0] || 'your file'}...`
            });
        } else if (showToasts && mediaIds.length > 1) {
            toast.success(`${mediaIds.length} uploads started!`, {
                description: 'Processing your files...'
            });
        }
    }, [showToasts]);

    // Stop monitoring specific uploads
    const stopMonitoring = useCallback((mediaIds: string[]) => {
        console.log('📊 Stopping upload progress monitoring for:', mediaIds);
        
        setUploadProgress(prev => {
            const updated = { ...prev };
            mediaIds.forEach(mediaId => {
                delete updated[mediaId];
            });
            return updated;
        });

        // If no more uploads being monitored, stop monitoring
        setUploadProgress(prev => {
            const remainingCount = Object.keys(prev).length - mediaIds.length;
            if (remainingCount <= 0) {
                setIsMonitoring(false);
            }
            return prev;
        });
    }, []);

    // Handle progress updates from WebSocket
    const handleProgressUpdate = useCallback((data: UploadProgressData) => {
        console.log('📊 Upload progress update:', data);

        setUploadProgress(prev => {
            const existing = prev[data.mediaId];
            if (!existing) {
                // Don't create new entries from progress updates
                return prev;
            }

            const updated = {
                ...prev,
                [data.mediaId]: {
                    ...existing,
                    stage: data.stage,
                    percentage: data.percentage,
                    message: data.message || `${data.stage}... ${data.percentage}%`,
                    status: data.stage === 'completed' ? 'completed' as const : 
                           data.stage === 'failed' ? 'failed' as const :
                           data.percentage > 0 ? 'processing' as const : 'uploading' as const,
                    lastUpdate: new Date()
                }
            };

            return updated;
        });

        // Call progress callback
        onProgress?.(data.mediaId, data);

        // Handle completion
        if (data.stage === 'completed') {
            if (showToasts) {
                const filename = uploadProgress[data.mediaId]?.filename || 'File';
                toast.success('Upload completed!', {
                    description: `${filename} is now available in the gallery.`
                });
            }
            
            onComplete?.(data.mediaId);
            
            // Remove from monitoring after a delay
            setTimeout(() => {
                stopMonitoring([data.mediaId]);
            }, 3000);
        }
    }, [uploadProgress, onProgress, onComplete, showToasts, stopMonitoring]);

    // Handle upload failures
    const handleUploadFailed = useCallback((data: { mediaId: string; error: string; eventId: string }) => {
        console.log('❌ Upload failed:', data);

        setUploadProgress(prev => {
            const existing = prev[data.mediaId];
            if (!existing) return prev;

            return {
                ...prev,
                [data.mediaId]: {
                    ...existing,
                    status: 'failed',
                    stage: 'failed',
                    message: `Upload failed: ${data.error}`,
                    lastUpdate: new Date()
                }
            };
        });

        if (showToasts) {
            const filename = uploadProgress[data.mediaId]?.filename || 'File';
            toast.error('Upload failed!', {
                description: `${filename}: ${data.error}`
            });
        }

        onFailed?.(data.mediaId, data.error);

        // Remove from monitoring after a delay
        setTimeout(() => {
            stopMonitoring([data.mediaId]);
        }, 5000);
    }, [uploadProgress, onFailed, showToasts, stopMonitoring]);

    // Handle media ready (for guests)
    const handleMediaReady = useCallback((data: { mediaId: string; eventId: string; message: string }) => {
        if (data.eventId === eventId && uploadProgress[data.mediaId]) {
            handleProgressUpdate({
                mediaId: data.mediaId,
                eventId: data.eventId,
                stage: 'completed',
                percentage: 100,
                message: data.message,
                timestamp: new Date().toISOString()
            });
        }
    }, [eventId, uploadProgress, handleProgressUpdate]);

    // Setup SSE connection for progress updates
    useEffect(() => {
        if (!eventId || !isMonitoring) return;

        console.log('📊 Setting up SSE connection for upload progress:', eventId);
        
        const sseUrl = SSE_UPLOAD_PROGRESS_ROUTE(eventId);
        const eventSource = new EventSource(sseUrl);

        eventSource.onmessage = (event) => {
            // Heartbeats and empty messages have no data
            if (!event.data) return;
            
            try {
                const data = JSON.parse(event.data);
                if (data.mediaId) {
                    handleProgressUpdate(data);
                }
            } catch (err) {
                console.warn('Failed to parse SSE progress data:', err);
            }
        };

        // Custom event listeners for specific SSE event names if needed
        eventSource.addEventListener('upload_progress', (event: any) => {
            try {
                const data = JSON.parse(event.data);
                handleProgressUpdate(data);
            } catch (err) {
                console.error('SSE Error parsing progress data:', err);
            }
        });

        eventSource.addEventListener('upload_failed', (event: any) => {
            try {
                const data = JSON.parse(event.data);
                handleUploadFailed(data);
            } catch (err) {
                console.error('SSE Error parsing failure data:', err);
            }
        });

        eventSource.onerror = (err) => {
            console.error('SSE connection error:', err);
            // Browser automatically tries to reconnect SSE usually
        };

        return () => {
            console.log('📊 Closing SSE connection for event:', eventId);
            eventSource.close();
        };
    }, [eventId, isMonitoring, handleProgressUpdate, handleUploadFailed]);

    // Keep legacy WebSocket listeners for 'media_ready' only (guest-facing triggers)
    useEffect(() => {
        if (!webSocket?.socket) return;
        const socket = webSocket.socket;

        socket.on('media_ready', handleMediaReady);
        socket.on('upload_complete', (data: any) => {
            handleProgressUpdate({
                mediaId: data.mediaId,
                eventId: data.eventId,
                stage: 'completed',
                percentage: 100,
                message: 'Upload completed!',
                timestamp: new Date().toISOString()
            });
        });

        return () => {
            socket.off('media_ready', handleMediaReady);
            socket.off('upload_complete');
        };
    }, [webSocket?.socket, handleMediaReady, handleProgressUpdate]);

    // Cleanup stale progress entries
    useEffect(() => {
        if (!isMonitoring) return;

        const cleanupInterval = setInterval(() => {
            const now = Date.now();
            
            setUploadProgress(prev => {
                const updated = { ...prev };
                let hasChanges = false;

                Object.entries(prev).forEach(([mediaId, progress]) => {
                    const timeSinceLastUpdate = now - progress.lastUpdate.getTime();
                    
                    if (timeSinceLastUpdate > maxStaleTime) {
                        console.log('🧹 Removing stale upload progress:', mediaId);
                        delete updated[mediaId];
                        hasChanges = true;
                    }
                });

                if (hasChanges && Object.keys(updated).length === 0) {
                    setIsMonitoring(false);
                }

                return hasChanges ? updated : prev;
            });
        }, 60000); // Check every minute

        cleanupIntervalRef.current = cleanupInterval;

        return () => {
            if (cleanupIntervalRef.current) {
                clearInterval(cleanupIntervalRef.current);
            }
        };
    }, [isMonitoring, maxStaleTime]);

    // Get summary statistics
    const getSummary = useCallback(() => {
        const progressArray = Object.values(uploadProgress);
        
        return {
            total: progressArray.length,
            uploading: progressArray.filter(p => p.status === 'uploading').length,
            processing: progressArray.filter(p => p.status === 'processing').length,
            completed: progressArray.filter(p => p.status === 'completed').length,
            failed: progressArray.filter(p => p.status === 'failed').length,
            overallProgress: progressArray.length > 0 
                ? Math.round(progressArray.reduce((sum, p) => sum + p.percentage, 0) / progressArray.length)
                : 0
        };
    }, [uploadProgress]);

    // Clear all progress
    const clearAll = useCallback(() => {
        setUploadProgress({});
        setIsMonitoring(false);
    }, []);

    return {
        uploadProgress,
        isMonitoring,
        summary: getSummary(),
        startMonitoring,
        stopMonitoring,
        clearAll
    };
}