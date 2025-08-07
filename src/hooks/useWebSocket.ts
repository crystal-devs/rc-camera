// hooks/useSimpleWebSocket.ts - Clean production version
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

          const queryKey = shareToken
            ? ['guest-media', shareToken]
            : ['guest-media', eventIdOrShareToken];

          queryClient.invalidateQueries({
            queryKey,
            exact: true
          });
        }
      }
    }, 150);
  }, [eventIdOrShareToken, shareToken, queryClient, userType]);

  // Handle guest specific events
  const handleMediaApproved = useCallback((payload: MediaApprovedPayload) => {
    if (userType === 'guest') {
      toast.success('📸 New photo approved!', { duration: 2000 });

      const queryKey = shareToken
        ? ['guest-media', shareToken]
        : ['guest-media', eventIdOrShareToken];

      queryClient.invalidateQueries({
        queryKey,
        exact: true
      });
    }
  }, [shareToken, eventIdOrShareToken, queryClient, userType]);

  const handleMediaRemoved = useCallback((payload: MediaRemovedPayload) => {
    if (userType === 'guest') {
      const queryKey = shareToken
        ? ['guest-media', shareToken]
        : ['guest-media', eventIdOrShareToken];

      queryClient.invalidateQueries({
        queryKey,
        exact: true
      });
    }
  }, [shareToken, eventIdOrShareToken, queryClient, userType]);

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

      // Guest-specific handlers
      if (userType === 'guest') {
        socket.on('media_approved', handleMediaApproved);
        socket.on('media_removed', handleMediaRemoved);
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