// hooks/use-photo-wall-socket.ts - Optimized Version

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UsePhotoWallSocketProps {
  shareToken: string;
  currentIndex: number;
  sessionId?: string;
  onNewMedia?: (data: any) => void;
  onViewerUpdate?: (count: number) => void;
  onSettingsUpdate?: (settings: any) => void;
  onDirectMediaUpload?: (data: any) => void;
  onDirectProcessingComplete?: (data: any) => void;
}

export const usePhotoWallSocket = ({
  shareToken,
  currentIndex,
  sessionId,
  onNewMedia,
  onViewerUpdate,
  onSettingsUpdate,
  onDirectMediaUpload,
  onDirectProcessingComplete,
}: UsePhotoWallSocketProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  
  // Refs to prevent infinite loops and store stable references
  const currentIndexRef = useRef(currentIndex);
  const callbacksRef = useRef({
    onNewMedia,
    onViewerUpdate,
    onSettingsUpdate,
    onDirectMediaUpload,
    onDirectProcessingComplete,
  });
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPositionSyncRef = useRef<number>(0);
  const socketInstanceRef = useRef<Socket | null>(null);

  // Update refs when values change (prevent stale closures)
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    callbacksRef.current = {
      onNewMedia,
      onViewerUpdate,
      onSettingsUpdate,
      onDirectMediaUpload,
      onDirectProcessingComplete,
    };
  }, [onNewMedia, onViewerUpdate, onSettingsUpdate, onDirectMediaUpload, onDirectProcessingComplete]);

  // FIXED: Stable socket connection with proper cleanup
  useEffect(() => {
    if (!shareToken) return;

    // Prevent duplicate connections
    if (socketInstanceRef.current?.connected) {
      console.log('📺 Socket already connected, skipping...');
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
    console.log('🔌 Initializing photo wall socket connection to:', socketUrl);
    
    const newSocket = io(socketUrl, {
      path: '/socket.io/photo-wall',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
      timeout: 20000,
      forceNew: true,
      query: {
        shareToken,
        sessionId: sessionId || `photowall_${Date.now()}`,
        type: 'photowall'
      }
    });

    socketInstanceRef.current = newSocket;
    setSocket(newSocket);

    // Store globally with unique key to prevent conflicts
    (window as any)[`photoWallSocket_${shareToken}`] = newSocket;

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('📺 Connected to photo wall WebSocket');
      setIsConnected(true);
      
      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Join the photo wall room
      newSocket.emit('join-wall', {
        shareToken,
        currentIndex: currentIndexRef.current,
        sessionId: sessionId || `photowall_${Date.now()}`,
        lastFetchTime: new Date().toISOString(),
        type: 'photowall_viewer'
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('📺 Disconnected from photo wall WebSocket:', reason);
      setIsConnected(false);
      setIsAuthenticated(false);
      
      // Set up reconnect timeout for certain disconnect reasons
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect...');
          newSocket.connect();
        }, 5000);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔥 Photo wall socket connection error:', error);
      setIsConnected(false);
      setIsAuthenticated(false);
    });

    // Photo wall specific events with error handling
    newSocket.on('wall-joined', (data) => {
      console.log('📺 Joined wall successfully:', data);
      setViewerCount(data.totalViewers || 0);
      setIsAuthenticated(true);
    });

    newSocket.on('new-media-inserted', (data) => {
      try {
        console.log('📺 New media inserted event:', data);
        callbacksRef.current.onNewMedia?.(data);
      } catch (error) {
        console.error('Error handling new-media-inserted:', error);
      }
    });

    newSocket.on('viewer-update', (data) => {
      try {
        console.log('📺 Viewer update:', data);
        const count = data.totalViewers || 0;
        setViewerCount(count);
        callbacksRef.current.onViewerUpdate?.(count);
      } catch (error) {
        console.error('Error handling viewer-update:', error);
      }
    });

    newSocket.on('settings-updated', (data) => {
      try {
        console.log('📺 Settings updated event:', data);
        callbacksRef.current.onSettingsUpdate?.(data);
      } catch (error) {
        console.error('Error handling settings-updated:', error);
      }
    });

    // Room stats events
    newSocket.on('room_user_counts', (data) => {
      try {
        console.log('📊 Room user counts update:', data);
        setViewerCount(data.total || data.guestCount || 0);
      } catch (error) {
        console.error('Error handling room_user_counts:', error);
      }
    });

    // Direct media upload events with error handling
    newSocket.on('new_media_uploaded', (data) => {
      try {
        console.log('📸 Direct new_media_uploaded event:', data);
        callbacksRef.current.onDirectMediaUpload?.(data);
      } catch (error) {
        console.error('Error handling new_media_uploaded:', error);
      }
    });

    newSocket.on('media_processing_complete', (data) => {
      try {
        console.log('✨ Direct media_processing_complete event:', data);
        callbacksRef.current.onDirectProcessingComplete?.(data);
      } catch (error) {
        console.error('Error handling media_processing_complete:', error);
      }
    });

    // Additional events
    newSocket.on('event_stats_update', (data) => {
      console.log('📊 Event stats update:', data);
    });

    newSocket.on('guest_media_removed', (data) => {
      console.log('🗑️ Guest media removed:', data);
    });

    newSocket.on('media_removed', (data) => {
      console.log('🗑️ Media removed:', data);
    });

    // Error handling
    newSocket.on('error', (error) => {
      console.error('📺 Photo wall socket error:', error);
    });

    newSocket.on('wall-error', (error) => {
      console.error('📺 Photo wall specific error:', error);
    });

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up photo wall socket connection');
      
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Disconnect and cleanup
      newSocket.removeAllListeners();
      newSocket.disconnect();
      
      // Clear global reference
      delete (window as any)[`photoWallSocket_${shareToken}`];
      
      // Clear refs
      socketInstanceRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setIsAuthenticated(false);
    };
  }, [shareToken, sessionId]); // Only depend on shareToken and sessionId

  // FIXED: Throttled position sync to prevent spam
  const syncPosition = useCallback((newIndex: number) => {
    const now = Date.now();
    
    // Throttle position sync - max once per 500ms
    if (now - lastPositionSyncRef.current < 500) {
      return;
    }
    
    if (socket?.connected && sessionId && isAuthenticated) {
      lastPositionSyncRef.current = now;
      console.log('🔄 Syncing position:', newIndex);
      
      socket.emit('sync-position', {
        shareToken,
        currentIndex: newIndex,
        sessionId,
        timestamp: now
      });
    }
  }, [socket, sessionId, isAuthenticated, shareToken]);

  const sendControl = useCallback((action: string, payload?: any) => {
    if (socket?.connected && isAuthenticated) {
      console.log('🎮 Sending wall control:', action, payload);
      socket.emit('wall-control', {
        shareToken,
        action,
        payload,
        timestamp: Date.now()
      });
    }
  }, [socket, isAuthenticated, shareToken]);

  const refreshRoom = useCallback(() => {
    if (socket?.connected && isAuthenticated) {
      console.log('🔄 Requesting room refresh');
      socket.emit('refresh-room', {
        shareToken,
        sessionId,
        timestamp: Date.now()
      });
    }
  }, [socket, isAuthenticated, shareToken, sessionId]);

  const requestLatestMedia = useCallback(() => {
    if (socket?.connected && isAuthenticated) {
      console.log('📸 Requesting latest media');
      socket.emit('request-latest-media', {
        shareToken,
        sessionId,
        timestamp: Date.now()
      });
    }
  }, [socket, isAuthenticated, shareToken, sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    socket,
    isConnected,
    isAuthenticated,
    viewerCount,
    syncPosition,
    sendControl,
    refreshRoom,
    requestLatestMedia,
  };
};