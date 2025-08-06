// hooks/useSimpleWebSocket.ts - Fixed version
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import { useAuthToken } from '@/hooks/use-auth';

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

export function useSimpleWebSocket(
  eventIdOrShareToken: string, // This could be eventId for admin or shareToken for guest
  shareToken?: string, // Optional: only used for guest mode
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

  // Handle status updates
  const handleStatusUpdate = useCallback((payload: StatusUpdatePayload) => {
    console.log(`📸 ${userType} received status update:`, payload);

    const { previousStatus, newStatus, updatedBy, eventId } = payload;

    if (userType === 'admin') {
      // Admin: Show all status changes
      const statusText = {
        approved: '✅ approved',
        rejected: '❌ rejected',
        hidden: '👁️ hidden',
        pending: '⏳ moved to pending',
        auto_approved: '✅ auto-approved'
      }[newStatus] || 'updated';

      toast.success(`Photo ${statusText} by ${updatedBy.name}`, {
        duration: 3000
      });

      // Invalidate all admin queries for this event
      const statuses = ['approved', 'pending', 'rejected', 'hidden', 'auto_approved'];
      statuses.forEach(status => {
        queryClient.invalidateQueries({
          queryKey: ['event-media', eventId, status]
        });
        queryClient.invalidateQueries({
          queryKey: ['event-media', eventId, status, 'infinite']
        });
      });

      // Invalidate counts
      queryClient.invalidateQueries({
        queryKey: ['event-counts', eventId]
      });

    } else if (userType === 'guest') {
      // Guest: Only handle visibility changes (approved/hidden)
      const wasVisible = ['approved', 'auto_approved'].includes(previousStatus);
      const isVisible = ['approved', 'auto_approved'].includes(newStatus);

      if (wasVisible !== isVisible) {
        if (isVisible) {
          toast.success('📸 New photo approved!', { duration: 2000 });
        }

        // Invalidate guest queries - use shareToken if available
        const queryKey = shareToken 
          ? ['guest-media', shareToken]
          : ['event-media', eventIdOrShareToken];

        queryClient.invalidateQueries({ queryKey });

        console.log('🔄 Guest queries invalidated for visibility change');
      }
    }

  }, [eventIdOrShareToken, shareToken, queryClient, userType]);

  // Handle guest specific events
  const handleMediaApproved = useCallback((payload: any) => {
    console.log('📸 Guest: New media approved:', payload);
    toast.success('📸 New photo approved!', { duration: 2000 });
    
    // Invalidate guest queries
    const queryKey = shareToken 
      ? ['guest-media', shareToken]
      : ['event-media', eventIdOrShareToken];
    
    queryClient.invalidateQueries({ queryKey });
  }, [shareToken, eventIdOrShareToken, queryClient]);

  const handleMediaRemoved = useCallback((payload: any) => {
    console.log('📸 Guest: Media removed:', payload);
    
    // Invalidate guest queries
    const queryKey = shareToken 
      ? ['guest-media', shareToken]
      : ['event-media', eventIdOrShareToken];
    
    queryClient.invalidateQueries({ queryKey });
  }, [shareToken, eventIdOrShareToken, queryClient]);

  // Connect function
  const connect = useCallback(() => {
    if (!eventIdOrShareToken) {
      console.log(`⚠️ ${userType}: Cannot connect - missing eventId/shareToken`);
      return;
    }

    // Check auth requirements
    if (userType === 'admin' && !token) {
      console.log('⚠️ Admin needs auth token');
      return;
    }

    if (userType === 'guest' && !shareToken && !eventIdOrShareToken.startsWith('evt_')) {
      console.log('⚠️ Guest needs share token or valid share token format');
      return;
    }

    if (socketRef.current?.connected) {
      console.log(`⚠️ ${userType} already connected`);
      return;
    }

    try {
      console.log(`🔌 ${userType} connecting to WebSocket...`);

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'; // Fixed to 3001
      console.log(`🔌 ${userType} connecting to WebSocket URL:`, wsUrl);
      console.log(`🔌 ${userType} auth params:`, {
        hasToken: !!token,
        hasShareToken: !!(shareToken || eventIdOrShareToken.startsWith('evt_')),
        eventIdOrShareToken: eventIdOrShareToken?.substring(0, 10) + '...',
        shareToken: shareToken?.substring(0, 10) + '...'
      });
      
      const socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        timeout: 15000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      socketRef.current = socket;

      // Connection handlers
      socket.on('connect', () => {
        console.log(`✅ ${userType} connected:`, socket.id);
        console.log(`✅ Socket connected to:`, socket.io);
        setState(prev => ({ ...prev, isConnected: true, connectionError: null }));

        // Authenticate based on user type
        const authData = userType === 'admin'
          ? {
              token,
              eventId: eventIdOrShareToken, // For admin, this should be the actual eventId
              userType: 'admin'
            }
          : {
              shareToken: shareToken || eventIdOrShareToken, // For guest, use shareToken
              eventId: shareToken || eventIdOrShareToken,   // Backend will resolve this
              userType: 'guest',
              guestName: 'Guest User'
            };

        console.log(`🔐 ${userType} sending auth:`, {
          ...authData,
          token: authData.token ? '***' : undefined,
          shareToken: authData.shareToken ? authData.shareToken.substring(0, 8) + '...' : undefined
        });

        socket.emit('authenticate', authData);
      });

      socket.on('disconnect', (reason) => {
        console.log(`🔌 ${userType} disconnected:`, reason);
        setState(prev => ({
          ...prev,
          isConnected: false,
          isAuthenticated: false
        }));
      });

      socket.on('connect_error', (error) => {
        console.error(`❌ ${userType} connection error:`, error);
        setState(prev => ({ ...prev, connectionError: error.message }));
      });

      // Auth handlers
      socket.on('auth_success', (data) => {
        console.log(`✅ ${userType} authenticated:`, data);
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: data.user,
          connectionError: null
        }));

        // Join event room
        const roomEventId = data.eventId || eventIdOrShareToken;
        socket.emit('join_event', roomEventId);
        console.log(`🏠 ${userType} joining event room:`, roomEventId);
      });

      socket.on('auth_error', (error) => {
        console.error(`❌ ${userType} auth failed:`, error);
        setState(prev => ({
          ...prev,
          connectionError: error.message || 'Authentication failed',
          isAuthenticated: false
        }));
      });

      // Status update handlers
      socket.on('media_status_updated', handleStatusUpdate);

      // Guest-specific handlers
      if (userType === 'guest') {
        socket.on('media_approved', handleMediaApproved);
        socket.on('media_removed', handleMediaRemoved);
      }

      socket.on('joined_event', (data) => {
        console.log(`🏠 ${userType} successfully joined event:`, data);
      });

      socket.on('error', (error) => {
        console.error(`❌ ${userType} socket error:`, error);
      });

    } catch (error: any) {
      console.error(`❌ ${userType} failed to connect:`, error);
      setState(prev => ({ ...prev, connectionError: 'Failed to connect' }));
    }
  }, [eventIdOrShareToken, token, shareToken, userType, handleStatusUpdate, handleMediaApproved, handleMediaRemoved]);

  // Disconnect function
  const disconnect = useCallback(() => {
    console.log(`🔌 Disconnecting ${userType}...`);
    mountedRef.current = false;

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
  }, [userType]);

  // Setup and cleanup
  useEffect(() => {
    mountedRef.current = true;

    // Small delay to prevent connection storms
    const timer = setTimeout(connect, 100);

    return () => {
      clearTimeout(timer);
      disconnect();
    };
  }, [connect, disconnect]);

  // Show connection errors
  useEffect(() => {
    if (state.connectionError) {
      console.error(`${userType} WebSocket error:`, state.connectionError);
      toast.error(`Connection failed: ${state.connectionError}`, {
        description: 'Real-time updates may not work',
        duration: 5000
      });
    }
  }, [state.connectionError, userType]);

  // Show authentication success
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      console.log(`✅ ${userType} authenticated as:`, state.user.name);
      if (process.env.NODE_ENV === 'development') {
        toast.success(`Connected as ${state.user.name}`, { duration: 2000 });
      }
    }
  }, [state.isAuthenticated, state.user, userType]);

  return {
    ...state,
    connect,
    disconnect,
    socket: socketRef.current,
  };
}