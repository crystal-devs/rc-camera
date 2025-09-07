// hooks/useEventWebSocket.ts - Fixed for Socket.IO compatibility
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import { useAuthToken } from '@/hooks/use-auth';
import { queryKeys } from '@/lib/queryKeys';
import { Photo } from '@/types/PhotoGallery.types';

interface WebSocketUser {
  id: string;
  name: string;
  type: 'admin' | 'moderator' | 'guest';
}

interface WebSocketState {
  isConnected: boolean;
  isAuthenticated: boolean;
  connectionError: string | null;
  user: WebSocketUser | null;
  reconnectAttempts: number;
}

interface WebSocketHook extends WebSocketState {
  connect: () => void;
  disconnect: () => void;
  sendMessage: (event: string, data: any) => void;
}

export function useEventWebSocket(
  eventId: string,
  shareToken?: string,
  setActiveTab?: (tab: 'approved' | 'pending' | 'rejected' | 'hidden') => void
): WebSocketHook {
  const token = useAuthToken();
  const queryClient = useQueryClient();

  // WebSocket state
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isAuthenticated: false,
    connectionError: null,
    user: null,
    reconnectAttempts: 0
  });

  // Socket.IO reference
  const socketRef = useRef<Socket | null>(null);
  const mountedRef = useRef(true);

  // Get Socket.IO server URL
  const getSocketIOUrl = useCallback(() => {
    return process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';
  }, []);

  // Handle media status updates from admin actions
  const handleMediaStatusUpdate = useCallback((payload: any) => {
    console.log('📸 Admin received media status update:', payload);

    const { mediaId, previousStatus, newStatus, updatedBy } = payload;

    // Show toast notification
    const statusActions = {
      approved: '✅ approved',
      rejected: '❌ rejected',
      hidden: '👁️ hidden',
      pending: '⏳ moved to pending',
      auto_approved: '✅ auto-approved'
    };

    const action = statusActions[newStatus as keyof typeof statusActions] || 'updated';
    toast.success(`Photo ${action} by ${updatedBy.name}`, {
      duration: 3000,
      position: 'bottom-right'
    });

    // Invalidate ALL relevant queries across ALL tabs
    const statuses = ['approved', 'pending', 'rejected', 'hidden', 'auto_approved'];

    statuses.forEach(status => {
      // Regular queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.eventPhotos(eventId, status),
        exact: false
      });

      // Infinite queries
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.eventPhotos(eventId, status), 'infinite'],
        exact: false
      });
    });

    // Invalidate counts
    queryClient.invalidateQueries({
      queryKey: queryKeys.eventCounts(eventId),
      exact: false
    });

    // Force refetch to ensure all tabs get updated
    queryClient.refetchQueries({
      queryKey: queryKeys.eventPhotos(eventId, newStatus),
      exact: false
    });

    queryClient.refetchQueries({
      queryKey: queryKeys.eventPhotos(eventId, previousStatus),
      exact: false
    });

  }, [eventId, queryClient]);

  const handleNewMediaUpload = useCallback((payload: any) => {
    console.log('📤 Admin received new media upload:', payload);

    const { uploadedBy, media, status } = payload;

    toast.success(`📸 New photo uploaded by ${uploadedBy.name}`, {
      description: status === 'pending' ? 'Waiting for approval' : 'Auto-approved',
      duration: 4000
    });

    // Invalidate and refetch queries
    queryClient.invalidateQueries({
      queryKey: queryKeys.eventPhotos(eventId, status),
      exact: false
    });

    queryClient.invalidateQueries({
      queryKey: queryKeys.eventCounts(eventId),
      exact: false
    });

    // Force refetch
    queryClient.refetchQueries({
      queryKey: queryKeys.eventPhotos(eventId, status),
      exact: false
    });

  }, [eventId, queryClient]);

  const handleBulkMediaUpdate = useCallback((payload: any) => {
    console.log('📦 Admin received bulk media update:', payload);

    const { action, count, updatedBy } = payload;

    toast.success(`${updatedBy.name} ${action} ${count} photos`, {
      duration: 4000
    });

    // Invalidate all queries
    const statuses = ['approved', 'pending', 'rejected', 'hidden', 'auto_approved'];

    statuses.forEach(status => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.eventPhotos(eventId, status),
        exact: false
      });

      queryClient.refetchQueries({
        queryKey: queryKeys.eventPhotos(eventId, status),
        exact: false
      });
    });

    queryClient.invalidateQueries({
      queryKey: queryKeys.eventCounts(eventId),
      exact: false
    });

  }, [eventId, queryClient]);

  // Connect function
  const connect = useCallback(() => {
    if (!eventId || !token) {
      console.log('⚠️ Admin WebSocket: Cannot connect - missing eventId or token');
      return;
    }

    if (socketRef.current?.connected) {
      console.log('⚠️ Admin Socket.IO already connected');
      return;
    }

    try {
      console.log('🔌 Admin connecting to Socket.IO...', getSocketIOUrl());

      // Create Socket.IO connection
      const socket = io(getSocketIOUrl(), {
        autoConnect: false,
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        forceNew: true
      });

      socketRef.current = socket;

      // Connection event handlers
      socket.on('connect', () => {
        console.log('✅ Admin Socket.IO connected:', socket.id);
        setState(prev => ({
          ...prev,
          isConnected: true,
          connectionError: null,
          reconnectAttempts: 0
        }));

        // Send admin authentication
        const authData = {
          token: shareToken || token,
          eventId: eventId,
          userType: 'admin'
        };

        console.log('🔐 Sending admin authentication');
        socket.emit('authenticate', authData);
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 Admin Socket.IO disconnected:', reason);
        setState(prev => ({
          ...prev,
          isConnected: false,
          isAuthenticated: false
        }));

        // Don't attempt reconnection for manual disconnects
        if (reason === 'io client disconnect') {
          return;
        }

        // Attempt reconnection with exponential backoff
        if (state.reconnectAttempts < 5 && mountedRef.current) {
          const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 30000);

          setState(prev => ({
            ...prev,
            reconnectAttempts: prev.reconnectAttempts + 1
          }));

          setTimeout(() => {
            if (mountedRef.current && !socket.connected) {
              console.log(`🔄 Admin reconnection attempt ${state.reconnectAttempts + 1}`);
              socket.connect();
            }
          }, delay);
        }
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Admin Socket.IO connection error:', error);
        setState(prev => ({
          ...prev,
          connectionError: error.message
        }));
      });

      // Authentication event handlers
      socket.on('auth_success', (data) => {
        console.log('✅ Admin Socket.IO authenticated:', data);
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: data.data?.user,
          connectionError: null
        }));

        // Join the event room
        socket.emit('join_event', eventId);
        console.log('🏠 Admin joining event room:', eventId);
      });

      socket.on('auth_error', (error) => {
        console.error('❌ Admin Socket.IO authentication failed:', error);
        setState(prev => ({
          ...prev,
          connectionError: error.message || 'Authentication failed',
          isAuthenticated: false
        }));
      });

      // Real-time event handlers
      socket.on('media_status_updated', handleMediaStatusUpdate);
      socket.on('new_media_uploaded', handleNewMediaUpload);
      socket.on('bulk_media_update', handleBulkMediaUpdate);

      socket.on('error', (error) => {
        console.error('❌ Admin Socket.IO error:', error);
        toast.error(`Connection error: ${error.message}`);
      });

      // Connect to Socket.IO server
      socket.connect();

    } catch (error) {
      console.error('❌ Failed to create admin Socket.IO connection:', error);
      setState(prev => ({
        ...prev,
        connectionError: 'Failed to connect'
      }));
    }
  }, [eventId, token, shareToken, getSocketIOUrl, handleMediaStatusUpdate, handleNewMediaUpload, handleBulkMediaUpdate, state.reconnectAttempts]);

  // Disconnect function
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting admin Socket.IO...');

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
      user: null,
      reconnectAttempts: 0
    });
  }, []);

  // Send message function
  const sendMessage = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
      console.log('📤 Admin sent Socket.IO message:', { event, data });
    } else {
      console.warn('⚠️ Cannot send message: Socket.IO not connected');
    }
  }, []);

  // Setup and cleanup
  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Handle visibility change to reconnect when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !state.isConnected && mountedRef.current) {
        console.log('👁️ Admin tab became visible, reconnecting...');
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.isConnected, connect]);

  return {
    ...state,
    connect,
    disconnect,
    sendMessage
  };
}