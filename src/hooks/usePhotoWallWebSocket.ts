// hooks/usePhotoWallWebSocket.ts - NEW SUBSCRIPTION-BASED HOOK
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useWebSocketStore } from '@/stores/webSocketStore';
import { PhotoWallItem } from '@/services/apis/photowall.api';

interface UsePhotoWallWebSocketProps {
  shareToken: string;
  eventId?: string;
  enabled?: boolean;
}

interface PhotoWallWebSocketHandlers {
  onNewMedia: (item: PhotoWallItem) => void;
  onMediaRemoved: (mediaId: string) => void;
  onProcessingComplete: (data: any) => void;
  onStatsUpdate: (stats: { totalImages: number; viewerCount: number }) => void;
}

export const usePhotoWallWebSocket = (
  props: UsePhotoWallWebSocketProps,
  handlers: PhotoWallWebSocketHandlers
) => {
  const { shareToken, eventId, enabled = true } = props;
  const { onNewMedia, onMediaRemoved, onProcessingComplete, onStatsUpdate } = handlers;

  // INDUSTRY STANDARD: Event deduplication
  const processedEventsRef = useRef<Set<string>>(new Set());
  const eventCleanupTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Get WebSocket store state and actions
  const {
    socket,
    isConnected,
    isAuthenticated,
    connect,
    subscribe,
    unsubscribe,
    isSubscribed,
    connectionError
  } = useWebSocketStore();

  // INDUSTRY STANDARD: Event signature for deduplication
  const createEventSignature = useCallback((eventType: string, payload: any): string => {
    const mediaId = payload.mediaId || payload._id || payload.id || 'unknown';
    const timestamp = payload.timestamp || Date.now();
    const timeWindow = Math.floor(timestamp / 2000) * 2000; // 2-second window
    return `${eventType}:${mediaId}:${timeWindow}`;
  }, []);

  // INDUSTRY STANDARD: Check if event should be processed
  const shouldProcessEvent = useCallback((eventType: string, payload: any): boolean => {
    const signature = createEventSignature(eventType, payload);
    
    if (processedEventsRef.current.has(signature)) {
      console.log(`⏭️ PhotoWall: Skipping duplicate ${eventType} event:`, signature);
      return false;
    }

    processedEventsRef.current.add(signature);

    // Cleanup old signatures after 10 seconds
    const timeoutId = setTimeout(() => {
      processedEventsRef.current.delete(signature);
      eventCleanupTimeoutsRef.current.delete(signature);
    }, 10000);

    eventCleanupTimeoutsRef.current.set(signature, timeoutId);
    return true;
  }, [createEventSignature]);

  // INDUSTRY STANDARD: WebSocket connection management
  useEffect(() => {
    if (!enabled || !shareToken) return;

    const initializeConnection = async () => {
      try {
        console.log('📺 PhotoWall: Initializing WebSocket connection');
        
        // Connect with photowall user type
        await connect(shareToken, 'photowall', eventId);
        
        // Subscribe to the event
        if (eventId) {
          await subscribe(eventId, shareToken);
        }
      } catch (error) {
        console.error('📺 PhotoWall: Connection failed:', error);
      }
    };

    initializeConnection();

    // Cleanup on unmount
    return () => {
      if (eventId) {
        unsubscribe(eventId);
      }
    };
  }, [enabled, shareToken, eventId, connect, subscribe, unsubscribe]);

  // INDUSTRY STANDARD: Event handlers with deduplication
  useEffect(() => {
    if (!socket || !isConnected || !isAuthenticated) return;

    const handleNewMediaUploaded = (payload: any) => {
      if (!shouldProcessEvent('new_media_uploaded', payload)) return;
      
      console.log('📺 PhotoWall: Processing new media upload:', payload);

      // Transform to PhotoWall format
      const newItem: PhotoWallItem = {
        id: payload.mediaId || payload.media?.id || `temp_${Date.now()}`,
        imageUrl: payload.media?.url || payload.media?.responsive_urls?.preferred || payload.media?.thumbnailUrl || '',
        uploaderName: payload.uploadedBy?.name || payload.uploader_display_name || 'Anonymous',
        uploadedAt: payload.uploadedAt || payload.created_at || new Date().toISOString(),
        isNew: true
      };

      onNewMedia(newItem);
    };

    const handleMediaRemoved = (payload: any) => {
      if (!shouldProcessEvent('media_removed', payload)) return;
      
      console.log('📺 PhotoWall: Processing media removal:', payload);
      
      const mediaId = payload.mediaId || payload._id || payload.id;
      if (mediaId) {
        onMediaRemoved(mediaId);
      }
    };

    const handleProcessingComplete = (payload: any) => {
      if (!shouldProcessEvent('media_processing_complete', payload)) return;
      
      console.log('📺 PhotoWall: Processing completion event:', payload);
      onProcessingComplete(payload);
    };

    const handleEventStatsUpdate = (payload: any) => {
      if (!shouldProcessEvent('event_stats_update', payload)) return;
      
      console.log('📺 PhotoWall: Event stats update:', payload);
      
      if (payload.stats) {
        onStatsUpdate({
          totalImages: payload.stats.approved || payload.stats.totalMedia || 0,
          viewerCount: 0 // Will be updated by room stats
        });
      }
    };

    const handleRoomStats = (payload: any) => {
      // No deduplication for room stats - they can change frequently
      console.log('📺 PhotoWall: Room stats update:', payload);
      
      onStatsUpdate({
        totalImages: 0, // Keep existing count
        viewerCount: payload.guestCount || payload.photowall_count || payload.total || 0
      });
    };

    // Set up event listeners using same events as guest page
    socket.on('new_media_uploaded', handleNewMediaUploaded);
    socket.on('media_removed', handleMediaRemoved);
    socket.on('guest_media_removed', handleMediaRemoved);
    socket.on('media_processing_complete', handleProcessingComplete);
    socket.on('event_stats_update', handleEventStatsUpdate);
    socket.on('room_user_counts', handleRoomStats);

    // Cleanup listeners
    return () => {
      socket.off('new_media_uploaded', handleNewMediaUploaded);
      socket.off('media_removed', handleMediaRemoved);
      socket.off('guest_media_removed', handleMediaRemoved);
      socket.off('media_processing_complete', handleProcessingComplete);
      socket.off('event_stats_update', handleEventStatsUpdate);
      socket.off('room_user_counts', handleRoomStats);
    };
  }, [socket, isConnected, isAuthenticated, shouldProcessEvent, onNewMedia, onMediaRemoved, onProcessingComplete, onStatsUpdate]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      eventCleanupTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      eventCleanupTimeoutsRef.current.clear();
      processedEventsRef.current.clear();
    };
  }, []);

  return {
    isConnected,
    isAuthenticated,
    connectionError,
    isSubscribed: eventId ? isSubscribed(eventId) : false,
    // Expose subscription status for debugging
    subscriptionStatus: {
      isSubscribed: eventId ? isSubscribed(eventId) : false,
      eventId: eventId || null
    }
  };
};