// hooks/useSimpleWebSocket.ts - Enhanced with real-time media events

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import { useAuthToken } from '@/hooks/use-auth';

// Types
interface WebSocketState {
  isConnected: boolean;
  isAuthenticated: boolean;
  connectionError: string | null;
  user: { id: string; name: string; type: string } | null;
}

interface StatusUpdatePayload {
  mediaId: string;
  eventId: string;
  previousStatus: string;
  newStatus: string;
  updatedBy: { name: string; type: string };
  timestamp: Date;
  mediaData?: {
    url?: string;
    thumbnail?: string;
    filename?: string;
  };
}

interface RoomStatsPayload {
  eventId: string;
  guestCount?: number;
  adminCount?: number;
  total?: number;
}

interface MediaApprovedPayload {
  mediaId: string;
  eventId: string;
  mediaData?: any;
  timestamp: Date;
}

interface MediaRemovedPayload {
  mediaId: string;
  eventId: string;
  reason: string;
  timestamp: Date;
}

// 🚀 NEW: Real-time media events
interface NewMediaUploadedPayload {
  mediaId: string;
  eventId: string;
  uploadedBy: {
    id: string;
    name: string;
    type: string;
  };
  media: {
    url: string;
    thumbnailUrl?: string;
    filename: string;
    originalFilename?: string;
    type: 'image' | 'video';
    size: number;
    format?: string;
  };
  status: 'pending' | 'approved' | 'auto_approved' | 'rejected';
  uploadedAt: Date;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp?: Date;
}

interface MediaProcessingCompletePayload {
  mediaId: string;
  eventId: string;
  processingStatus: 'completed';
  progress: 100;
  stage: 'completed';
  variantsGenerated: boolean;
  variants: {
    thumbnail?: string;
    display?: string;
    full?: string;
  };
  timestamp: Date;
}

interface MediaUploadFailedPayload {
  mediaId: string;
  eventId: string;
  processingStatus: 'failed';
  progress: 0;
  stage: 'completed';
  variantsGenerated: boolean;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
}

interface EventStatsUpdatePayload {
  eventId: string;
  stats: {
    totalMedia: number;
    pendingApproval: number;
    approved: number;
    autoApproved?: number;
    rejected: number;
    hidden?: number;
    deleted?: number;
    totalUploaders: number;
    activeGuests: number;
    activeAdmins?: number;
    totalConnections?: number;
  };
  breakdown?: {
    mediaByType?: { [key: string]: number };
    mediaByStatus?: { [key: string]: number };
  };
  updatedAt: Date;
  timestamp?: Date;
}

interface MediaRemovedPayload {
  mediaId: string;
  eventId: string;
  reason: string;
  removedBy?: string;
  timestamp: Date;
  guest_context?: {
    should_remove_from_display: boolean;
    reason_display: string;
  };
}

interface HeartbeatAckPayload {
  timestamp: number;
  latency: number;
}

interface ConnectionSettings {
  heartbeatInterval: number;
  heartbeatTimeout: number;
}

interface AdminNewUploadNotificationPayload {
  eventId: string;
  uploadedBy: {
    id: string;
    name: string;
    type: string;
    email?: string;
  };
  media?: {
    id: string;
    url: string;
    filename: string;
    type: 'image' | 'video';
    size: number;
    approvalStatus: string;
  };
  mediaItems?: Array<{
    id: string;
    url: string;
    filename: string;
    type: 'image' | 'video';
    size: number;
    approvalStatus: string;
  }>;
  bulkUpload?: {
    totalCount: number;
    successCount: number;
    requiresApproval: boolean;
  };
  requiresApproval: boolean;
  uploadedAt: Date;
  timestamp: Date;
}

interface GuestUploadSummaryPayload {
  eventId: string;
  newUploadsCount: number;
  uploaderName: string;
  timestamp: Date;
}

// Environment-based logging utility
const isDev = process.env.NODE_ENV === 'development';
const devLog = {
  info: (...args: any[]) => isDev && console.log(...args),
  warn: (...args: any[]) => isDev && console.warn(...args),
  error: (...args: any[]) => console.error(...args), // Always log errors
};

export function useSimpleWebSocket(
  eventIdOrShareToken: string,
  shareToken?: string,
  userType: 'admin' | 'guest' | 'photowall' = 'admin'
) {
  const token = useAuthToken();
  const queryClient = useQueryClient();

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isAuthenticated: false,
    connectionError: null,
    user: null
  });

  const socketRef = useRef<Socket | null>(null);
  const mountedRef = useRef(true);
  const statusUpdateTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const connectionSettingsRef = useRef<ConnectionSettings | null>(null);

  // Get the correct query key for guest media
  const getGuestQueryKey = useCallback(() => {
    return ['guest-media', shareToken || eventIdOrShareToken];
  }, [shareToken, eventIdOrShareToken]);

  // Debounced status update handler
  const debouncedHandleStatusUpdate = useCallback((payload: StatusUpdatePayload) => {
    clearTimeout(statusUpdateTimeoutRef.current);

    statusUpdateTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;

      const { previousStatus, newStatus, updatedBy, eventId } = payload;

      if (userType === 'admin') {
        const statusText: Record<string, string> = {
          approved: '✅ approved',
          rejected: '❌ rejected',
          hidden: '👁️ hidden',
          pending: '⏳ moved to pending',
          auto_approved: '✅ auto-approved',
          deleted: '🗑️ deleted'
        };

        const statusMessage = statusText[newStatus] || 'updated';
        toast.success(`Photo ${statusMessage} by ${updatedBy.name}`, {
          duration: 3000
        });

        // Invalidate admin queries
        const statuses = ['approved', 'pending', 'rejected', 'hidden', 'auto_approved', 'deleted'];
        statuses.forEach(status => {
          queryClient.invalidateQueries({
            queryKey: ['event-media', eventId, status],
            exact: true
          });
          queryClient.invalidateQueries({
            queryKey: ['event-media', eventId, status, 'infinite'],
            exact: true
          });
        });

        queryClient.invalidateQueries({
          queryKey: ['event-counts', eventId],
          exact: true
        });

      } else if (userType === 'guest' || userType === 'photowall') {
        const wasVisible = ['approved', 'auto_approved'].includes(previousStatus);
        const isVisible = ['approved', 'auto_approved'].includes(newStatus);

        if (wasVisible !== isVisible) {
          if (isVisible) {
            toast.success('📸 New photo approved!', { duration: 2000 });
          }

          queryClient.invalidateQueries({
            queryKey: getGuestQueryKey(),
            exact: true
          });
        }
      }
    }, 150);
  }, [eventIdOrShareToken, queryClient, userType, getGuestQueryKey]);

  // 🚀 NEW: Handle new media uploaded (for guests)
  const handleNewMediaUploaded = useCallback((payload: NewMediaUploadedPayload) => {
    if ((userType === 'guest' && payload.status === 'auto_approved') || userType === 'photowall') {
      devLog.info(`📸 New media uploaded for ${userType}:`, payload);

      // Different toast messages for different user types
      if (userType === 'photowall') {
        toast.success(`📺 New photo from ${payload.uploadedBy.name}`, {
          duration: 2000,
          description: 'Added to slideshow'
        });
      } else {
        toast.success(`📸 New photo from ${payload.uploadedBy.name}!`, {
          duration: 3000,
          description: 'High-quality version processing...'
        });
      }

      // For photo walls, we might not need to invalidate queries since they manage their own state
      if (userType === 'guest') {
        queryClient.invalidateQueries({
          queryKey: getGuestQueryKey(),
          exact: true
        });
      }

      // Prefetch the new image for better performance
      if (payload.media.url) {
        const img = new Image();
        img.src = payload.media.url;
      }
    }
  }, [userType, queryClient, getGuestQueryKey]);

  // 🚀 NEW: Handle media processing completion (better quality available)
  const handleMediaProcessingComplete = useCallback((payload: MediaProcessingCompletePayload) => {
    if (userType === 'guest' || userType === 'photowall') {
      devLog.info(`✨ High-quality version ready for ${userType}:`, payload);

      // Different handling for photo walls vs guests
      if (userType === 'photowall') {
        // Photo walls might want to update the image URL in their slideshow
        toast.info('✨ Higher quality version ready', {
          duration: 1500,
          description: 'Photo updated in slideshow'
        });
      } else {
        toast.success('✨ High-quality version ready!', {
          duration: 2000,
          description: 'Photo updated with better quality'
        });

        // Only invalidate for guests, photo walls handle this internally
        queryClient.invalidateQueries({
          queryKey: getGuestQueryKey(),
          exact: true
        });
      }

      // Prefetch the new high-quality image
      if (payload.variants.display) {
        const img = new Image();
        img.src = payload.variants.display;
      }
    }
  }, [userType, queryClient, getGuestQueryKey]);

  // 🚀 NEW: Handle media upload failed
  const handleMediaUploadFailed = useCallback((payload: MediaUploadFailedPayload) => {
    if (userType === 'guest') {
      devLog.warn('❌ Media processing failed:', payload);
      // We might not need to show anything to guests for failed processing
      // since they wouldn't see failed uploads anyway
    }
  }, [userType]);

  // 🚀 NEW: Handle event stats update
  const handleEventStatsUpdate = useCallback((payload: EventStatsUpdatePayload) => {
    devLog.info('📊 Event stats updated:', payload);

    // For guests, we might want to update some UI element showing total photos
    if (userType === 'guest') {
      // This could be used to update a counter in the UI
      // The component can listen for this via a custom event or state management
    }
  }, [userType]);

  // Handle guest specific events (existing)
  const handleMediaApproved = useCallback((payload: MediaApprovedPayload) => {
    if (userType === 'guest' || userType === 'photowall') {
      toast.success('📸 New photo approved!', { duration: 2000 });

      queryClient.invalidateQueries({
        queryKey: getGuestQueryKey(),
        exact: true
      });
    }
  }, [queryClient, userType, getGuestQueryKey]);

  const handleMediaRemoved = useCallback((payload: MediaRemovedPayload) => {
    if (userType === 'guest' || userType === 'photowall') {
      devLog.info(`🗑️ Media removed for ${userType}:`, payload);

      const friendlyReason = payload.guest_context?.reason_display || 'Photo was removed';

      // Different toast handling for photo walls
      if (userType === 'photowall') {
        toast.warning(`📺 ${friendlyReason}`, {
          duration: 2000,
          description: 'Removed from slideshow'
        });
        // Photo walls will handle removal in their own state management
        return;
      }

      // Existing guest logic
      toast.info(`📷 ${friendlyReason}`, {
        duration: 3000,
        description: payload.removedBy ? `By ${payload.removedBy}` : undefined
      });

      // Rest of your existing guest media removal logic...
      const queryKey = ['guest-media', shareToken || eventIdOrShareToken];

      const currentData = queryClient.getQueryData(queryKey);

      if (!currentData) {
        queryClient.invalidateQueries({ queryKey, exact: true });
        queryClient.refetchQueries({ queryKey, exact: true });
        return;
      }

      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;

        const updatedPages = oldData.pages.map((page: any) => {
          if (!page.photos || !Array.isArray(page.photos)) return page;

          const originalLength = page.photos.length;
          const filteredPhotos = page.photos.filter((photo: any) => {
            const shouldRemove = (
              photo._id === payload.mediaId ||
              photo.id === payload.mediaId ||
              photo._id?.toString() === payload.mediaId ||
              photo.id?.toString() === payload.mediaId
            );
            return !shouldRemove;
          });

          return {
            ...page,
            photos: filteredPhotos,
            total: Math.max(0, (page.total || 0) - (originalLength - filteredPhotos.length))
          };
        });

        return { ...oldData, pages: updatedPages };
      });

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey, exact: true });
      }, 100);
    }
  }, [userType, queryClient, shareToken, eventIdOrShareToken]);

  // Handle room stats updates
  const handleRoomStats = useCallback((payload: RoomStatsPayload) => {
    devLog.info('📊 Room stats received:', payload);
  }, []);

  // Handle heartbeat acknowledgment
  const handleHeartbeatAck = useCallback((data: HeartbeatAckPayload) => {
    devLog.info(`💓 Heartbeat latency: ${data.latency}ms`);
  }, []);

  // Handle unhealthy connection
  const handleConnectionUnhealthy = useCallback((data: { message: string }) => {
    devLog.warn('⚠️ Connection marked as unhealthy:', data.message);

    // Attempt reconnection for unhealthy connections
    if (socketRef.current?.connected) {
      devLog.info('🔄 Attempting to reconnect due to unhealthy connection...');
      socketRef.current.disconnect();
      setTimeout(() => {
        if (mountedRef.current) {
          connect();
        }
      }, 1000);
    }
  }, []);

  const handleAdminNewUploadNotification = useCallback((payload: AdminNewUploadNotificationPayload) => {
    if (userType !== 'admin') return;

    devLog.info('📤 Admin: New guest upload notification:', payload);

    const { uploadedBy, requiresApproval, bulkUpload } = payload;

    if (bulkUpload) {
      // Bulk upload notification
      const { totalCount, requiresApproval: needsApproval } = bulkUpload;

      toast.success(
        `📸 ${uploadedBy.name} uploaded ${totalCount} photo${totalCount > 1 ? 's' : ''}`,
        {
          duration: 5000,
          description: needsApproval
            ? `${totalCount} photo${totalCount > 1 ? 's' : ''} awaiting approval`
            : 'Photos are now visible to guests',
          action: {
            label: needsApproval ? 'Review' : 'View',
            onClick: () => {
              // You can add navigation logic here to go to the pending tab
              // For example: router.push(`/admin/events/${payload.eventId}?tab=pending`)
              devLog.info('Navigate to review uploads');
            }
          }
        }
      );
    } else if (payload.media) {
      // Single upload notification
      const { media } = payload;

      toast.success(
        `📸 ${uploadedBy.name} uploaded a photo`,
        {
          duration: 4000,
          description: requiresApproval
            ? `"${media.filename}" awaiting approval`
            : `"${media.filename}" is now visible`,
          action: {
            label: requiresApproval ? 'Review' : 'View',
            onClick: () => {
              devLog.info('Navigate to review upload:', media.id);
            }
          }
        }
      );
    }

    // 🚀 Invalidate admin queries to refresh counts and pending items
    if (requiresApproval) {
      // Refresh pending tab and counts
      queryClient.invalidateQueries({
        queryKey: ['event-media', payload.eventId, 'pending'],
      });

      queryClient.invalidateQueries({
        queryKey: ['event-counts', payload.eventId],
      });
    } else {
      // Refresh approved tab if auto-approved
      queryClient.invalidateQueries({
        queryKey: ['event-media', payload.eventId, 'approved'],
      });
    }

    // 🚀 Optional: Play notification sound for admins
    if (typeof window !== 'undefined' && window.AudioContext) {
      try {
        // You can add a subtle notification sound here
        // const audio = new Audio('/notification-sound.mp3');
        // audio.volume = 0.3;
        // audio.play().catch(() => {}); // Ignore if sound fails
      } catch (e) {
        // Ignore audio errors
      }
    }

  }, [userType, queryClient]);

  const handleGuestUploadSummary = useCallback((payload: GuestUploadSummaryPayload) => {
    if (userType !== 'admin') return;

    devLog.info('📊 Admin: Guest upload summary:', payload);

    // This is a lighter notification - maybe just update a badge or counter
    // You could use this to update a notification badge in the UI

    // Optional: Show a subtle toast for summary
    toast.info(
      `📈 Upload activity`,
      {
        duration: 2000,
        description: `${payload.uploaderName} completed ${payload.newUploadsCount} upload${payload.newUploadsCount > 1 ? 's' : ''}`,
      }
    );

    // Refresh counts to update any dashboard counters
    queryClient.invalidateQueries({
      queryKey: ['event-counts', payload.eventId],
    });

  }, [userType, queryClient]);

  // Start heartbeat mechanism
  const startHeartbeat = useCallback(() => {
    const settings = connectionSettingsRef.current;
    const interval = settings?.heartbeatInterval || 30000;

    clearInterval(heartbeatIntervalRef.current);

    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('heartbeat', { timestamp: Date.now() });
      }
    }, interval);

    devLog.info(`💓 Heartbeat started with ${interval}ms interval`);
  }, []);

  // Stop heartbeat mechanism
  const stopHeartbeat = useCallback(() => {
    clearInterval(heartbeatIntervalRef.current);
    devLog.info('💓 Heartbeat stopped');
  }, []);

  // Connect function
  const connect = useCallback(() => {
    if (!eventIdOrShareToken) {
      devLog.warn(`⚠️ ${userType}: Cannot connect - missing eventId/shareToken`);
      return;
    }

    if (userType === 'admin' && !token) {
      devLog.warn('⚠️ Admin needs auth token');
      return;
    }

    if ((userType === 'guest' || userType === 'photowall') && !shareToken && !eventIdOrShareToken.startsWith('evt_')) {
      devLog.warn(`⚠️ ${userType} needs share token or valid share token format`);
      return;
    }

    if (socketRef.current?.connected) {
      devLog.warn(`⚠️ ${userType} already connected`);
      return;
    }

    try {
      devLog.info(`🔌 ${userType} connecting to WebSocket...`);

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

      const socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        timeout: 15000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      socketRef.current = socket;

      // Connection handlers
      socket.on('connect', () => {
        devLog.info(`✅ ${userType} connected:`, socket.id);

        if (!mountedRef.current) return;

        setState(prev => ({ ...prev, isConnected: true, connectionError: null }));

        const authData = userType === 'admin'
          ? {
            token,
            eventId: eventIdOrShareToken,
            userType: 'admin' as const
          }
          : {
            shareToken: shareToken || eventIdOrShareToken,
            eventId: shareToken || eventIdOrShareToken,
            userType: userType === 'photowall' ? 'photowall' as const : 'guest' as const,
            guestName: userType === 'photowall' ? 'Photo Wall Display' : 'Guest User'
          };

        socket.emit('authenticate', authData);
      });

      socket.on('disconnect', (reason) => {
        devLog.info(`🔌 ${userType} disconnected:`, reason);

        if (!mountedRef.current) return;

        stopHeartbeat();

        setState(prev => ({
          ...prev,
          isConnected: false,
          isAuthenticated: false
        }));

        // Auto-reconnect for unexpected disconnections
        if (reason === 'io server disconnect') {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current && !socketRef.current?.connected) {
              devLog.info(`🔄 ${userType} attempting reconnection...`);
              connect();
            }
          }, 2000);
        }
      });

      socket.on('connect_error', (error) => {
        devLog.error(`❌ ${userType} connection error:`, error);

        if (!mountedRef.current) return;

        setState(prev => ({ ...prev, connectionError: error.message }));
      });

      // Auth handlers
      socket.on('auth_success', (data) => {
        devLog.info(`✅ ${userType} authenticated:`, data);

        if (!mountedRef.current) return;

        // Store connection settings if provided
        if (data.connectionSettings) {
          connectionSettingsRef.current = data.connectionSettings;
        }

        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: data.user,
          connectionError: null
        }));

        // Start heartbeat after successful authentication
        startHeartbeat();

        // Join event room
        const roomEventId = data.eventId || eventIdOrShareToken;
        socket.emit('join_event', roomEventId);
        devLog.info(`🏠 ${userType} joining event room:`, roomEventId);
      });

      socket.on('auth_error', (error) => {
        devLog.error(`❌ ${userType} auth failed:`, error);

        if (!mountedRef.current) return;

        setState(prev => ({
          ...prev,
          connectionError: error.message || 'Authentication failed',
          isAuthenticated: false
        }));
      });

      // Event handlers
      socket.on('media_status_updated', debouncedHandleStatusUpdate);

      // 🚀 NEW: Real-time media event handlers
      socket.on('new_media_uploaded', handleNewMediaUploaded);
      socket.on('media_processing_complete', handleMediaProcessingComplete);
      socket.on('media_upload_failed', handleMediaUploadFailed);
      socket.on('event_stats_update', handleEventStatsUpdate);

      if (userType === 'admin') {
        socket.on('admin_new_upload_notification', handleAdminNewUploadNotification);
        socket.on('guest_upload_summary', handleGuestUploadSummary);

        devLog.info('✅ Admin event handlers registered');
      }

      // Guest-specific handlers (existing)
      if (userType === 'guest') {
        socket.on('media_approved', handleMediaApproved);
        socket.on('media_removed', handleMediaRemoved);
        socket.on('guest_media_removed', handleMediaRemoved);
      }

      socket.on('joined_event', (data) => {
        devLog.info(`🏠 ${userType} successfully joined event:`, data);
      });

      socket.on('room_user_counts', handleRoomStats);

      // Enhanced heartbeat handlers
      socket.on('heartbeat_ack', handleHeartbeatAck);
      socket.on('connection_unhealthy', handleConnectionUnhealthy);

      // Legacy ping support
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      socket.on('error', (error) => {
        devLog.error(`❌ ${userType} socket error:`, error);
      });

    } catch (error: any) {
      devLog.error(`❌ ${userType} failed to connect:`, error);

      if (mountedRef.current) {
        setState(prev => ({ ...prev, connectionError: 'Failed to connect' }));
      }
    }
  }, [
    eventIdOrShareToken,
    token,
    shareToken,
    userType,
    debouncedHandleStatusUpdate,
    handleNewMediaUploaded,
    handleMediaProcessingComplete,
    handleMediaUploadFailed,
    handleEventStatsUpdate,
    handleMediaApproved,
    handleAdminNewUploadNotification,
    handleGuestUploadSummary,
    handleMediaRemoved,
    handleRoomStats,
    handleHeartbeatAck,
    handleConnectionUnhealthy,
    startHeartbeat,
    stopHeartbeat
  ]);

  // Disconnect function
  const disconnect = useCallback(() => {
    devLog.info(`🔌 Disconnecting ${userType}...`);

    mountedRef.current = false;

    // Clear all timeouts and intervals
    clearTimeout(statusUpdateTimeoutRef.current);
    clearTimeout(reconnectTimeoutRef.current);
    stopHeartbeat();

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setState({
      isConnected: false,
      isAuthenticated: false,
      connectionError: null,
      user: null
    });
  }, [userType, stopHeartbeat]);

  // Setup and cleanup
  useEffect(() => {
    mountedRef.current = true;
    const timer = setTimeout(connect, 100);

    return () => {
      clearTimeout(timer);
      disconnect();
    };
  }, [connect, disconnect]);

  // Show connection errors
  useEffect(() => {
    if (state.connectionError && mountedRef.current) {
      devLog.error(`${userType} WebSocket error:`, state.connectionError);
      toast.error(`Connection failed: ${state.connectionError}`, {
        description: 'Real-time updates may not work',
        duration: 5000
      });
    }
  }, [state.connectionError, userType]);

  // Show authentication success
  useEffect(() => {
    if (state.isAuthenticated && state.user && mountedRef.current && isDev) {
      toast.success(`Connected as ${state.user.name}`, { duration: 2000 });
    }
  }, [state.isAuthenticated, state.user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(statusUpdateTimeoutRef.current);
      clearTimeout(reconnectTimeoutRef.current);
      clearInterval(heartbeatIntervalRef.current);
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    socket: socketRef.current,
  };
}