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
  userType: 'admin' | 'guest' = 'admin'
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

      } else if (userType === 'guest') {
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
    if (userType === 'guest' && payload.status === 'auto_approved') {
      devLog.info('📸 New media uploaded for guests:', payload);

      // Show toast notification
      toast.success(`📸 New photo from ${payload.uploadedBy.name}!`, {
        duration: 3000,
        description: 'High-quality version processing...'
      });

      // Invalidate and refetch guest media
      queryClient.invalidateQueries({
        queryKey: getGuestQueryKey(),
        exact: true
      });

      // Optionally, prefetch the new image to improve loading
      if (payload.media.url) {
        const img = new Image();
        img.src = payload.media.url;
      }
    }
  }, [userType, queryClient, getGuestQueryKey]);

  // 🚀 NEW: Handle media processing completion (better quality available)
  const handleMediaProcessingComplete = useCallback((payload: MediaProcessingCompletePayload) => {
    if (userType === 'guest') {
      devLog.info('✨ High-quality version ready:', payload);

      // Show subtle notification about better quality
      toast.success('✨ High-quality version ready!', {
        duration: 2000,
        description: 'Photo updated with better quality'
      });

      // Invalidate queries to fetch updated URLs
      queryClient.invalidateQueries({
        queryKey: getGuestQueryKey(),
        exact: true
      });

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
    if (userType === 'guest') {
      toast.success('📸 New photo approved!', { duration: 2000 });

      queryClient.invalidateQueries({
        queryKey: getGuestQueryKey(),
        exact: true
      });
    }
  }, [queryClient, userType, getGuestQueryKey]);

  const handleMediaRemoved = useCallback((payload: MediaRemovedPayload) => {
    if (userType === 'guest') {
      devLog.info('🗑️ Media removed for guests:', payload);

      // Show toast notification about removal
      const friendlyReason = payload.guest_context?.reason_display || 'Photo was removed';
      toast.info(`📷 ${friendlyReason}`, {
        duration: 3000,
        description: payload.removedBy ? `By ${payload.removedBy}` : undefined
      });

      // 🚀 FIX: Use the EXACT same query key as useInfiniteMediaQuery
      const queryKey = ['guest-media', shareToken || eventIdOrShareToken];

      console.log('🔍 DEBUG - Using query key:', queryKey);

      // 🚀 FIX: Check if cache exists, if not just invalidate
      const currentData = queryClient.getQueryData(queryKey);
      console.log('🔍 DEBUG - Current cache data:', currentData);

      if (!currentData) {
        console.log('🔍 DEBUG - No cache data found, forcing invalidation and refetch');

        // Force invalidate and refetch since cache is empty
        queryClient.invalidateQueries({
          queryKey,
          exact: true
        });

        // Also try to refetch immediately
        queryClient.refetchQueries({
          queryKey,
          exact: true
        });

        devLog.info(`✅ Forced cache invalidation and refetch for media ${payload.mediaId}`);
        return;
      }

      // 🚀 If cache exists, try to update it
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData || !oldData.pages) {
          console.log('🔍 DEBUG - Invalid cache structure, falling back to invalidation');
          return oldData;
        }

        console.log('🔍 DEBUG - Updating cache with pages:', oldData.pages.length);

        const updatedPages = oldData.pages.map((page: any, pageIndex: number) => {
          if (!page.photos || !Array.isArray(page.photos)) {
            return page;
          }

          const originalLength = page.photos.length;

          // Filter out the deleted photo
          const filteredPhotos = page.photos.filter((photo: any) => {
            const shouldRemove = (
              photo._id === payload.mediaId ||
              photo.id === payload.mediaId ||
              photo._id?.toString() === payload.mediaId ||
              photo.id?.toString() === payload.mediaId
            );

            if (shouldRemove) {
              console.log(`🔍 DEBUG - REMOVING photo:`, {
                photo_id: photo.id,
                photo_id_field: photo._id,
                payload_mediaId: payload.mediaId,
                filename: photo.original_filename
              });
            }

            return !shouldRemove;
          });

          console.log(`🔍 DEBUG - Page ${pageIndex}: ${originalLength} -> ${filteredPhotos.length} photos`);

          return {
            ...page,
            photos: filteredPhotos,
            total: Math.max(0, (page.total || 0) - (originalLength - filteredPhotos.length))
          };
        });

        const result = {
          ...oldData,
          pages: updatedPages
        };

        console.log('🔍 DEBUG - Updated cache result:', result);
        return result;
      });

      // 🚀 ALSO invalidate as backup to ensure consistency
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey,
          exact: true
        });
      }, 100);

      devLog.info(`✅ Updated cache and invalidated queries for media ${payload.mediaId}`);
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

    if (userType === 'guest' && !shareToken && !eventIdOrShareToken.startsWith('evt_')) {
      devLog.warn('⚠️ Guest needs share token or valid share token format');
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
            userType: 'guest' as const,
            guestName: 'Guest User'
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