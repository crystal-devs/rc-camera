// hooks/useBulkOperations.ts - Bulk operations to prevent rate limiting
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { bulkUpdateMediaStatus } from '@/services/apis/media.api';
import { useAuthToken } from '@/hooks/use-auth';
import { queryKeys } from '@/lib/queryKeys';

interface BulkOperation {
  mediaIds: string[];
  status: 'approved' | 'pending' | 'rejected' | 'hidden';
  reason?: string;
}

interface UseBulkOperationsOptions {
  eventId: string;
  onSuccess?: (operation: BulkOperation, result: any) => void;
  onError?: (operation: BulkOperation, error: Error) => void;
}

export function useBulkOperations({ eventId, onSuccess, onError }: UseBulkOperationsOptions) {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  
  // Queue for batching rapid operations
  const operationQueueRef = useRef<BulkOperation[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (operation: BulkOperation) => {
      if (!token) throw new Error('Authentication required');
      
      console.log('🔄 Executing bulk operation:', {
        count: operation.mediaIds.length,
        status: operation.status,
        reason: operation.reason
      });

      // Call your existing bulk endpoint
      return await bulkUpdateMediaStatus(
        eventId,
        operation.mediaIds,
        operation.status,
        token,
        { reason: operation.reason }
      );
    },
    onSuccess: (result, operation) => {
      console.log('✅ Bulk operation completed:', {
        count: operation.mediaIds.length,
        status: operation.status
      });

      // Invalidate all related caches
      const statuses = ['approved', 'pending', 'rejected', 'hidden', 'auto_approved'];
      const qualities = ['thumbnail', 'display', 'original'];

      const invalidationPromises = [];

      for (const status of statuses) {
        for (const quality of qualities) {
          invalidationPromises.push(
            queryClient.invalidateQueries({
              queryKey: [...queryKeys.eventPhotos(eventId, status), quality],
              exact: false,
              refetchType: 'all'
            }),
            queryClient.invalidateQueries({
              queryKey: [...queryKeys.eventPhotos(eventId, status), 'infinite', quality],
              exact: false,
              refetchType: 'all'
            })
          );
        }
      }

      // Invalidate counts
      invalidationPromises.push(
        queryClient.invalidateQueries({
          queryKey: queryKeys.eventCounts(eventId),
          exact: false,
          refetchType: 'all'
        })
      );

      Promise.allSettled(invalidationPromises);

      const statusAction = {
        approved: 'approved',
        rejected: 'rejected', 
        hidden: 'hidden',
        pending: 'moved to pending'
      }[operation.status];

      toast.success(`${operation.mediaIds.length} photos ${statusAction} successfully`);
      onSuccess?.(operation, result);
    },
    onError: (error, operation) => {
      console.error('❌ Bulk operation failed:', error);
      
      const statusAction = {
        approved: 'approve',
        rejected: 'reject',
        hidden: 'hide', 
        pending: 'update'
      }[operation.status];

      toast.error(`Failed to ${statusAction} ${operation.mediaIds.length} photos: ${error.message}`);
      onError?.(operation, error);
    }
  });

  // Process queued operations
  const processQueue = useCallback(() => {
    if (operationQueueRef.current.length === 0) return;

    // Group operations by status and reason
    const groupedOps = operationQueueRef.current.reduce((groups, op) => {
      const key = `${op.status}:${op.reason || ''}`;
      if (!groups[key]) {
        groups[key] = {
          status: op.status,
          reason: op.reason,
          mediaIds: []
        };
      }
      groups[key].mediaIds.push(...op.mediaIds);
      return groups;
    }, {} as Record<string, { status: string; reason?: string; mediaIds: string[] }>);

    // Execute grouped operations
    Object.values(groupedOps).forEach(group => {
      // Remove duplicates
      const uniqueMediaIds = [...new Set(group.mediaIds)];
      
      if (uniqueMediaIds.length > 0) {
        bulkUpdateMutation.mutate({
          mediaIds: uniqueMediaIds,
          status: group.status as any,
          reason: group.reason
        });
      }
    });

    // Clear queue
    operationQueueRef.current = [];
  }, [bulkUpdateMutation]);

  // Queue a bulk operation (with auto-batching)
  const queueBulkOperation = useCallback((operation: BulkOperation) => {
    console.log('📝 Queuing bulk operation:', {
      count: operation.mediaIds.length,
      status: operation.status
    });

    operationQueueRef.current.push(operation);

    // Clear existing timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    // Process queue after 500ms of no new operations (industry standard)
    batchTimeoutRef.current = setTimeout(() => {
      processQueue();
    }, 500);
  }, [processQueue]);

  // Execute immediate bulk operation (bypass queue)
  const executeBulkOperation = useCallback((operation: BulkOperation) => {
    console.log('⚡ Executing immediate bulk operation:', {
      count: operation.mediaIds.length,
      status: operation.status
    });

    bulkUpdateMutation.mutate(operation);
  }, [bulkUpdateMutation]);

  // Update single media (will be batched automatically)
  const updateMediaStatus = useCallback((
    mediaId: string, 
    status: 'approved' | 'pending' | 'rejected' | 'hidden',
    reason?: string
  ) => {
    queueBulkOperation({
      mediaIds: [mediaId],
      status,
      reason
    });
  }, [queueBulkOperation]);

  // Update multiple media immediately
  const updateMultipleMediaStatus = useCallback((
    mediaIds: string[],
    status: 'approved' | 'pending' | 'rejected' | 'hidden', 
    reason?: string
  ) => {
    if (mediaIds.length === 0) return;

    if (mediaIds.length === 1) {
      // Single item - use queue for batching
      updateMediaStatus(mediaIds[0], status, reason);
    } else {
      // Multiple items - execute immediately
      executeBulkOperation({
        mediaIds,
        status,
        reason
      });
    }
  }, [updateMediaStatus, executeBulkOperation]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
    
    // Process any remaining queued operations
    if (operationQueueRef.current.length > 0) {
      processQueue();
    }
  }, [processQueue]);

  return {
    // Single operations (auto-batched)
    updateMediaStatus,
    
    // Bulk operations
    updateMultipleMediaStatus,
    queueBulkOperation,
    executeBulkOperation,
    
    // State
    isProcessing: bulkUpdateMutation.isPending,
    queueLength: operationQueueRef.current.length,
    
    // Utilities
    cleanup
  };
}