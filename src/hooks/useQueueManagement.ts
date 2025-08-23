// hooks/useQueueManagement.ts
// Frontend hook for queue management and real-time updates

'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface QueueItem {
  mediaId: string;
  filename: string;
  uploader: {
    id: string;
    name: string;
    type: 'admin' | 'guest';
  };
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'paused';
  stage: string;
  progress: number;
  size: number;
  queuePosition?: number;
  estimatedTime?: number;
  startTime?: string;
  completedTime?: string;
  error?: string;
  retryCount: number;
  jobId?: string;
  thumbnail?: string;
}

export interface QueueStats {
  total: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  paused: number;
  averageProcessingTime: number;
  queueThroughput: number;
}

export interface UseQueueManagementOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableWebSocket?: boolean;
  onQueueAlert?: (alert: any) => void;
}

export function useQueueManagement(
  eventId: string,
  webSocket: any,
  options: UseQueueManagementOptions = {}
) {
  const {
    autoRefresh = true,
    refreshInterval = 10000,
    enableWebSocket = true,
    onQueueAlert
  } = options;

  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    total: 0,
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    paused: 0,
    averageProcessingTime: 0,
    queueThroughput: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPerformingAction, setIsPerformingAction] = useState<string | null>(null);

  // Fetch queue data from API
  const fetchQueueData = useCallback(async (status: 'all' | 'active' | 'completed' | 'failed' = 'all') => {
    try {
      setError(null);
      
      const response = await fetch(`/api/events/${eventId}/upload-queue?status=${status}&limit=100`);
      const result = await response.json();
      
      if (!result.status) {
        throw new Error(result.message || 'Failed to fetch queue data');
      }

      setQueueItems(result.data.items);
      setStats(result.data.stats);
      
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to fetch queue data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  // Fetch queue statistics only
  const fetchQueueStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/upload-queue/stats`);
      const result = await response.json();
      
      if (result.status) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch queue stats:', err);
    }
  }, [eventId]);

  // Retry failed upload
  const retryUpload = useCallback(async (mediaId: string) => {
    try {
      setIsPerformingAction(mediaId);
      
      const response = await fetch(`/api/events/${eventId}/upload-queue/${mediaId}/retry`, {
        method: 'POST'
      });
      const result = await response.json();
      
      if (!result.status) {
        throw new Error(result.message || 'Failed to retry upload');
      }

      toast.success('Upload retry initiated', {
        description: `Retry count: ${result.data.retryCount}`
      });

      // Refresh data
      await fetchQueueData();
      
    } catch (err: any) {
      toast.error('Failed to retry upload', {
        description: err.message
      });
    } finally {
      setIsPerformingAction(null);
    }
  }, [eventId, fetchQueueData]);

  // Pause/Resume upload
  const pauseResumeUpload = useCallback(async (mediaId: string, action: 'pause' | 'resume') => {
    try {
      setIsPerformingAction(mediaId);
      
      const response = await fetch(`/api/events/${eventId}/upload-queue/${mediaId}/pause-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });
      const result = await response.json();
      
      if (!result.status) {
        throw new Error(result.message || `Failed to ${action} upload`);
      }

      toast.success(`Upload ${action}d successfully`);

      // Update local state immediately
      setQueueItems(prev => prev.map(item => 
        item.mediaId === mediaId 
          ? { ...item, status: action === 'pause' ? 'paused' : 'queued' as any }
          : item
      ));
      
    } catch (err: any) {
      toast.error(`Failed to ${action} upload`, {
        description: err.message
      });
    } finally {
      setIsPerformingAction(null);
    }
  }, [eventId]);

  // Cancel upload
  const cancelUpload = useCallback(async (mediaId: string) => {
    try {
      setIsPerformingAction(mediaId);
      
      const response = await fetch(`/api/events/${eventId}/upload-queue/${mediaId}/cancel`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (!result.status) {
        throw new Error(result.message || 'Failed to cancel upload');
      }

      toast.success('Upload cancelled successfully', {
        description: result.data.filename
      });

      // Remove from local state immediately
      setQueueItems(prev => prev.filter(item => item.mediaId !== mediaId));
      
    } catch (err: any) {
      toast.error('Failed to cancel upload', {
        description: err.message
      });
    } finally {
      setIsPerformingAction(null);
    }
  }, [eventId]);

  // Clear queue history
  const clearQueueHistory = useCallback(async (olderThanHours: number = 24) => {
    try {
      const response = await fetch(`/api/events/${eventId}/upload-queue/history?olderThan=${olderThanHours}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (!result.status) {
        throw new Error(result.message || 'Failed to clear queue history');
      }

      toast.success('Queue history cleared', {
        description: `Cleared ${result.data.clearedCount} items`
      });

      // Refresh data
      await fetchQueueData();
      
    } catch (err: any) {
      toast.error('Failed to clear queue history', {
        description: err.message
      });
    }
  }, [eventId, fetchQueueData]);

  // Batch operations
  const retryAllFailed = useCallback(async () => {
    const failedItems = queueItems.filter(item => item.status === 'failed');
    
    if (failedItems.length === 0) {
      toast.info('No failed uploads to retry');
      return;
    }

    const retryPromises = failedItems.map(item => retryUpload(item.mediaId));
    
    try {
      await Promise.allSettled(retryPromises);
      toast.success(`Initiated retry for ${failedItems.length} failed uploads`);
    } catch (err) {
      toast.error('Some retries failed');
    }
  }, [queueItems, retryUpload]);

  const pauseAllActive = useCallback(async () => {
    const activeItems = queueItems.filter(item => 
      ['queued', 'processing'].includes(item.status)
    );
    
    if (activeItems.length === 0) {
      toast.info('No active uploads to pause');
      return;
    }

    const pausePromises = activeItems.map(item => 
      pauseResumeUpload(item.mediaId, 'pause')
    );
    
    try {
      await Promise.allSettled(pausePromises);
      toast.success(`Paused ${activeItems.length} active uploads`);
    } catch (err) {
      toast.error('Some uploads failed to pause');
    }
  }, [queueItems, pauseResumeUpload]);

  const resumeAllPaused = useCallback(async () => {
    const pausedItems = queueItems.filter(item => item.status === 'paused');
    
    if (pausedItems.length === 0) {
      toast.info('No paused uploads to resume');
      return;
    }

    const resumePromises = pausedItems.map(item => 
      pauseResumeUpload(item.mediaId, 'resume')
    );
    
    try {
      await Promise.allSettled(resumePromises);
      toast.success(`Resumed ${pausedItems.length} paused uploads`);
    } catch (err) {
      toast.error('Some uploads failed to resume');
    }
  }, [queueItems, pauseResumeUpload]);

  // WebSocket event handlers
  useEffect(() => {
    if (!enableWebSocket || !webSocket?.socket) return;

    const socket = webSocket.socket;

    const handleQueueUpdate = (data: any) => {
      console.log('📊 Queue update received:', data);
      
      setQueueItems(prev => {
        const index = prev.findIndex(item => item.mediaId === data.mediaId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...data };
          return updated;
        }
        return prev;
      });
    };

    const handleQueueStats = (data: any) => {
      console.log('📈 Queue stats received:', data);
      if (data.stats) {
        setStats(data.stats);
      }
    };

    const handleQueueAlert = (data: any) => {
      console.log('🚨 Queue alert received:', data);
      
      const { alert } = data;
      
      if (onQueueAlert) {
        onQueueAlert(alert);
      } else {
        // Default alert handling
        const severity = alert.severity || 'warning';
        const title = `Queue ${severity.charAt(0).toUpperCase() + severity.slice(1)}`;
        
        if (severity === 'critical' || severity === 'error') {
          toast.error(title, { description: alert.message });
        } else {
          toast.warning(title, { description: alert.message });
        }
      }
    };

    const handlePerformanceMetrics = (data: any) => {
      console.log('📊 Performance metrics received:', data);
      // You can use this data to show real-time performance indicators
    };

    const handleBatchOperation = (data: any) => {
      console.log('🔄 Batch operation update:', data);
      
      const { operation } = data;
      
      if (operation.status === 'completed') {
        toast.success(`Batch ${operation.type} completed`, {
          description: `Affected ${operation.affectedCount} items`
        });
        fetchQueueData(); // Refresh data
      } else if (operation.status === 'failed') {
        toast.error(`Batch ${operation.type} failed`, {
          description: operation.error || 'Operation failed'
        });
      }
    };

    // Set up event listeners
    socket.on('queue_update', handleQueueUpdate);
    socket.on('queue_stats', handleQueueStats);
    socket.on('queue_alert', handleQueueAlert);
    socket.on('performance_metrics', handlePerformanceMetrics);
    socket.on('batch_operation', handleBatchOperation);

    return () => {
      socket.off('queue_update', handleQueueUpdate);
      socket.off('queue_stats', handleQueueStats);
      socket.off('queue_alert', handleQueueAlert);
      socket.off('performance_metrics', handlePerformanceMetrics);
      socket.off('batch_operation', handleBatchOperation);
    };
  }, [enableWebSocket, webSocket?.socket, onQueueAlert, fetchQueueData]);

  // Auto refresh
  useEffect(() => {
    fetchQueueData(); // Initial fetch

    if (autoRefresh && !enableWebSocket) {
      const interval = setInterval(() => {
        fetchQueueStats(); // Only fetch stats if WebSocket is handling item updates
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [fetchQueueData, fetchQueueStats, autoRefresh, enableWebSocket, refreshInterval]);

  // Filter functions
  const getActiveItems = useCallback(() => {
    return queueItems.filter(item => 
      ['queued', 'processing', 'paused'].includes(item.status)
    );
  }, [queueItems]);

  const getCompletedItems = useCallback(() => {
    return queueItems.filter(item => item.status === 'completed');
  }, [queueItems]);

  const getFailedItems = useCallback(() => {
    return queueItems.filter(item => item.status === 'failed');
  }, [queueItems]);

  const getProcessingItems = useCallback(() => {
    return queueItems.filter(item => item.status === 'processing');
  }, [queueItems]);

  return {
    // Data
    queueItems,
    stats,
    isLoading,
    error,
    isPerformingAction,

    // Actions
    retryUpload,
    pauseResumeUpload,
    cancelUpload,
    clearQueueHistory,

    // Batch actions
    retryAllFailed,
    pauseAllActive,
    resumeAllPaused,

    // Utilities
    refresh: fetchQueueData,
    refreshStats: fetchQueueStats,
    getActiveItems,
    getCompletedItems,
    getFailedItems,
    getProcessingItems,

    // Computed values
    hasFailedUploads: stats.failed > 0,
    hasActiveUploads: stats.queued + stats.processing > 0,
    hasPausedUploads: stats.paused > 0,
    isQueueHealthy: stats.failed === 0 || (stats.total > 0 && (stats.failed / stats.total) < 0.1),
    queueEfficiency: stats.total > 0 ? (stats.completed / stats.total) * 100 : 100
  };
}