// utils/websocketUtils.ts - WebSocket utility functions
import { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/queryKeys';
import { Photo } from '@/types/PhotoGallery.types';

// WebSocket event handlers
export class WebSocketEventHandlers {
  constructor(private queryClient: QueryClient, private eventId: string, private setActiveTab?: (tab: string) => void) {}

  /**
   * Handle media status update events
   */
  handleMediaStatusUpdate = (payload: any) => {
    console.log('📸 Processing media status update:', payload);

    const { mediaId, previousStatus, newStatus, updatedBy } = payload;

    // Show appropriate toast notification
    const statusActions = {
      approved: '✅ approved',
      rejected: '❌ rejected',
      hidden: '👁️ hidden',
      pending: '⏳ moved to pending',
      auto_approved: '✅ auto-approved'
    };

    const action = statusActions[newStatus as keyof typeof statusActions] || 'updated';
    const userName = updatedBy.name || 'Someone';

    toast.success(`Photo ${action} by ${userName}`, {
      duration: 3000,
      position: 'bottom-right',
      action: this.setActiveTab && newStatus !== this.queryClient.getQueryData(['activeTab', this.eventId])
        ? {
            label: `View in ${newStatus} tab`,
            onClick: () => this.setActiveTab?.(newStatus)
          }
        : undefined
    });

    // Invalidate all status-related queries
    this.invalidateAllStatusQueries();

    // Optimistically update cache
    this.optimisticallyUpdateMediaStatus(payload);
  };

  /**
   * Handle new media upload events
   */
  handleNewMediaUpload = (payload: any) => {
    console.log('📤 Processing new media upload:', payload);

    const { uploadedBy, media, status } = payload;

    // Show notification based on uploader type
    if (uploadedBy.type === 'guest') {
      toast.info(`📸 New photo uploaded by ${uploadedBy.name}`, {
        description: status === 'pending' ? 'Waiting for approval' : 'Auto-approved',
        duration: 5000
      });
    } else {
      toast.success(`📸 Photo uploaded successfully`, {
        duration: 3000
      });
    }

    // Invalidate relevant queries
    this.queryClient.invalidateQueries({
      queryKey: queryKeys.eventPhotos(this.eventId, status)
    });

    this.queryClient.invalidateQueries({
      queryKey: [...queryKeys.eventPhotos(this.eventId, status), 'infinite']
    });

    this.queryClient.invalidateQueries({
      queryKey: queryKeys.eventCounts(this.eventId)
    });
  };

  /**
   * Handle media processing updates
   */
  handleMediaProcessingUpdate = (payload: any) => {
    console.log('⚙️ Processing media processing update:', payload);

    const { processingStatus, progress, error } = payload;

    if (processingStatus === 'completed') {
      toast.success('Photo processing completed', {
        description: 'All image sizes are now available'
      });
    } else if (processingStatus === 'failed') {
      toast.error('Photo processing failed', {
        description: error || 'Please try uploading again'
      });
    } else if (processingStatus === 'processing' && progress) {
      console.log(`Processing progress: ${progress}%`);
    }
  };

  /**
   * Handle user join/leave events
   */
  handleUserActivity = (payload: any, eventType: 'joined' | 'left') => {
    const { user } = payload;

    if (user.type === 'guest') {
      const message = eventType === 'joined'
        ? `👋 ${user.name} joined the event`
        : `👋 ${user.name} left the event`;

      console.log(message);
    }
  };

  /**
   * Handle bulk operations
   */
  handleBulkMediaUpdate = (payload: any) => {
    console.log('📦 Processing bulk media update:', payload);

    const { action, count, updatedBy } = payload;

    const actionMessages = {
      approve: `approved ${count} photos`,
      reject: `rejected ${count} photos`,
      delete: `deleted ${count} photos`,
      hide: `hidden ${count} photos`
    };

    const message = actionMessages[action as keyof typeof actionMessages] || `updated ${count} photos`;

    toast.success(`${updatedBy.name} ${message}`, {
      duration: 4000
    });

    // Invalidate all queries since multiple items changed
    this.invalidateAllStatusQueries();
  };

  /**
   * Handle WebSocket errors
   */
  handleWebSocketError = (error: any) => {
    console.error('❌ WebSocket error:', error);

    const errorMessages = {
      'AUTH_FAILED': 'Authentication failed',
      'INVALID_EVENT': 'Event not found or access denied',
      'PERMISSION_DENIED': 'Permission denied',
      'RATE_LIMITED': 'Too many requests - please slow down',
      'EVENT_ENDED': 'Event has ended',
      'SERVER_ERROR': 'Server error occurred'
    };

    const message = errorMessages[error.code as keyof typeof errorMessages] || error.message || 'Connection error';

    toast.error(`Connection issue: ${message}`, {
      duration: 5000,
      action: {
        label: 'Retry',
        onClick: () => window.location.reload()
      }
    });
  };

  /**
   * Private helper methods
   */
  private invalidateAllStatusQueries() {
    const statuses = ['approved', 'pending', 'rejected', 'hidden', 'auto_approved'];

    statuses.forEach(status => {
      // Regular queries
      this.queryClient.invalidateQueries({
        queryKey: queryKeys.eventPhotos(this.eventId, status)
      });

      // Infinite queries
      this.queryClient.invalidateQueries({
        queryKey: [...queryKeys.eventPhotos(this.eventId, status), 'infinite']
      });
    });

    // Counts
    this.queryClient.invalidateQueries({
      queryKey: queryKeys.eventCounts(this.eventId)
    });
  }

  private optimisticallyUpdateMediaStatus(payload: any) {
    const { mediaId, previousStatus, newStatus, media, updatedBy, updatedAt } = payload;

    // Update regular queries
    const statuses = ['approved', 'pending', 'rejected', 'hidden', 'auto_approved'];
    statuses.forEach(status => {
      const queryKey = queryKeys.eventPhotos(this.eventId, status);
      this.queryClient.setQueryData<Photo[]>(queryKey, (oldData) => {
        if (!oldData) return oldData;

        // Remove from previous status cache
        if (status === previousStatus) {
          return oldData.filter(photo => photo.id !== mediaId);
        }

        // Add to new status cache if we have media data
        if (status === newStatus && media) {
          const updatedPhoto: Photo = {
            id: mediaId,
            imageUrl: media.url,
            thumbnailUrl: media.thumbnailUrl || media.url,
            title: media.filename,
            description: '',
            uploadedBy: updatedBy.name,
            uploadedAt: updatedAt,
            status: newStatus,
            type: media.type
          };
          return [updatedPhoto, ...oldData];
        }

        return oldData;
      });
    });

    // Update infinite queries
    statuses.forEach(status => {
      const queryKey = [...queryKeys.eventPhotos(this.eventId, status), 'infinite'];
      this.queryClient.setQueryData<{
        pages: { photos: Photo[]; nextPage?: number; hasMore: boolean }[];
        pageParams: number[];
      }>(queryKey, (oldData) => {
        if (!oldData) return oldData;

        // Deep clone to avoid mutating cached data
        const newData = {
          pages: oldData.pages.map(page => ({ ...page, photos: [...page.photos] })),
          pageParams: [...oldData.pageParams]
        };

        if (status === previousStatus) {
          // Remove from previous status pages
          newData.pages = newData.pages.map(page => ({
            ...page,
            photos: page.photos.filter(photo => photo.id !== mediaId)
          }));
        }

        if (status === newStatus && media) {
          // Add to first page of new status
          const updatedPhoto: Photo = {
            id: mediaId,
            imageUrl: media.url,
            thumbnailUrl: media.thumbnailUrl || media.url,
            title: media.filename,
            description: '',
            uploadedBy: updatedBy.name,
            uploadedAt: updatedAt,
            status: newStatus,
            type: media.type
          };
          newData.pages[0].photos.unshift(updatedPhoto);
        }

        return newData;
      });
    });

    // Update media counts
    this.queryClient.setQueryData<{
      approved: number;
      pending: number;
      rejected: number;
      hidden: number;
      auto_approved: number;
      total: number;
    }>(queryKeys.eventCounts(this.eventId), (oldCounts) => {
      if (!oldCounts) return oldCounts;

      const newCounts = { ...oldCounts };
      if (previousStatus && newCounts[previousStatus as keyof typeof newCounts] !== undefined) {
        newCounts[previousStatus as keyof typeof newCounts] = Math.max(
          0,
          newCounts[previousStatus as keyof typeof newCounts] - 1
        );
      }
      if (newStatus && newCounts[newStatus as keyof typeof newCounts] !== undefined) {
        newCounts[newStatus as keyof typeof newCounts] =
          (newCounts[newStatus as keyof typeof newCounts] || 0) + 1;
      }
      newCounts.total = newCounts.approved + newCounts.pending + newCounts.rejected + newCounts.hidden + newCounts.auto_approved;

      console.log('📊 Updated media counts in cache:', newCounts);
      return newCounts;
    });
  }
}

// Hook to use WebSocket event handlers
export function useWebSocketEventHandlers(eventId: string, queryClient: QueryClient, setActiveTab?: (tab: string) => void) {
  return new WebSocketEventHandlers(queryClient, eventId, setActiveTab);
}

// WebSocket connection status utilities
export const WebSocketStatus = {
  getStatusColor: (isConnected: boolean, isAuthenticated: boolean) => {
    if (!isConnected) return 'red';
    if (!isAuthenticated) return 'yellow';
    return 'green';
  },

  getStatusText: (isConnected: boolean, isAuthenticated: boolean) => {
    if (!isConnected) return 'Offline';
    if (!isAuthenticated) return 'Connecting...';
    return 'Live';
  },

  getStatusIcon: (isConnected: boolean) => {
    return isConnected ? 'WifiIcon' : 'WifiOffIcon';
  }
};

// WebSocket reconnection utilities
export const WebSocketReconnection = {
  exponentialBackoff: (attempt: number, baseDelay = 1000, maxDelay = 30000) => {
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delay + Math.random() * 1000; // Add jitter
  },

  shouldReconnect: (error: any, attempt: number, maxAttempts = 5) => {
    const nonRecoverableErrors = ['AUTH_FAILED', 'PERMISSION_DENIED', 'INVALID_EVENT'];
    if (nonRecoverableErrors.includes(error?.code)) {
      return false;
    }

    return attempt < maxAttempts;
  }
};

// Type definitions for WebSocket events
export interface WebSocketEventMap {
  'media_status_updated': (payload: any) => void;
  'new_media_uploaded': (payload: any) => void;
  'media_processing_update': (payload: any) => void;
  'bulk_media_update': (payload: any) => void;
  'guest_joined': (payload: any) => void;
  'guest_left': (payload: any) => void;
  'auth_success': (payload: any) => void;
  'auth_error': (payload: any) => void;
  'error': (payload: any) => void;
}
