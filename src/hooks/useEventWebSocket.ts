// hooks/useEventWebSocket.ts - Updated for Subscription Pattern
'use client';

import { useEffect, useRef } from 'react';
import { useWebSocketStore } from '@/stores/webSocketStore';
import { useAuthToken } from '@/hooks/use-auth';

interface UseEventWebSocketOptions {
  userType?: 'admin' | 'guest' | 'photowall';
  shareToken?: string;
  enabled?: boolean;
}

// Global flag to prevent multiple hooks from running simultaneously
let globalInitializationInProgress = false;
let globalInitializationPromise: Promise<void> | null = null;

export function useEventWebSocket(
  eventId: string,
  options: UseEventWebSocketOptions = {}
) {
  const {
    userType = 'admin',
    shareToken,
    enabled = true
  } = options;

  const token = useAuthToken();
  const webSocketStore = useWebSocketStore();
  const mountedRef = useRef(true);
  const currentSubscriptionRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const hasRequiredAuth = userType === 'admin' ? !!token : !!shareToken;

    if (!enabled || !eventId || !hasRequiredAuth) {
      console.log('Missing requirements:', { enabled, eventId, hasRequiredAuth, userType, token: !!token, shareToken: !!shareToken });
      return;
    }

    console.log(`🎯 useEventWebSocket hook called for event: ${eventId}`);

    const initializeConnection = async () => {
      // Prevent multiple hooks from initializing simultaneously
      if (globalInitializationInProgress && globalInitializationPromise) {
        console.log('⏳ Global initialization in progress, waiting...');
        try {
          await globalInitializationPromise;
        } catch (error) {
          console.warn('⚠️ Global initialization failed:', error);
        }
      }

      if (!mountedRef.current) return;

      // Check if we already have the right subscription
      if (webSocketStore.isSubscribed(eventId) && currentSubscriptionRef.current === eventId) {
        console.log(`✅ Already subscribed to event: ${eventId}`);
        return;
      }

      globalInitializationInProgress = true;

      try {
        const authToken = userType === 'admin' ? token : (shareToken || eventId);

        if (!authToken) {
          throw new Error(`No auth token available for ${userType}`);
        }

        console.log(`🔍 Current WebSocket state:`, {
          isConnected: webSocketStore.isConnected,
          isAuthenticated: webSocketStore.isAuthenticated,
          isConnecting: webSocketStore.isConnecting,
          currentSubscriptions: Array.from(webSocketStore.subscriptions),
          isSubscribedToEvent: webSocketStore.isSubscribed(eventId)
        });

        // Step 1: Ensure WebSocket is connected and authenticated
        if (!webSocketStore.isConnected || !webSocketStore.isAuthenticated) {
          console.log('📡 WebSocket not ready, establishing connection...');

          globalInitializationPromise = webSocketStore.connect(authToken, userType, eventId);
          await globalInitializationPromise;

          console.log('✅ WebSocket connection established');
        } else {
          console.log('✅ WebSocket already ready');
        }

        // Step 2: Subscribe to the event if not already subscribed
        if (mountedRef.current && eventId && !webSocketStore.isSubscribed(eventId)) {
          console.log(`📝 Subscribing to event ${eventId}...`);

          // If we have a different subscription, switch to the new one
          if (currentSubscriptionRef.current && currentSubscriptionRef.current !== eventId) {
            await webSocketStore.switchSubscription(
              currentSubscriptionRef.current,
              eventId,
              shareToken
            );
          } else {
            // Just subscribe to the new event
            await webSocketStore.subscribe(eventId, shareToken);
          }

          currentSubscriptionRef.current = eventId;
          console.log(`✅ Successfully subscribed to event ${eventId}`);
        } else if (webSocketStore.isSubscribed(eventId)) {
          console.log(`✅ Already subscribed to event ${eventId}`);
          currentSubscriptionRef.current = eventId;
        }

        hasInitializedRef.current = true;

      } catch (error) {
        console.error(`❌ Failed to initialize WebSocket for event ${eventId}:`, error);

        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();

          // Handle rate limiting
          if (errorMessage.includes('rate limit')) {
            console.log('🛑 Rate limited, will not retry automatically');
            return;
          }

          // Handle auth errors
          if (errorMessage.includes('auth') || errorMessage.includes('token')) {
            console.error('🔒 Authentication issue, check your token');
            return;
          }

          // Handle subscription errors
          if (errorMessage.includes('subscription') || errorMessage.includes('timeout')) {
            console.warn('📝 Subscription issue, marking as not initialized for retry');
            hasInitializedRef.current = false;
            return;
          }
        }

        // For other errors, mark as not initialized so it can retry
        hasInitializedRef.current = false;
      } finally {
        globalInitializationInProgress = false;
        globalInitializationPromise = null;
      }
    };

    // Only initialize if we haven't already or if the eventId changed
    if (!hasInitializedRef.current || currentSubscriptionRef.current !== eventId) {
      initializeConnection();
    }

    return () => {
      // Unsubscribe when component unmounts or eventId changes
      if (currentSubscriptionRef.current && webSocketStore.isSubscribed && mountedRef.current) {
        console.log(`📝 Unsubscribing from ${currentSubscriptionRef.current} due to cleanup`);

        // Only unsubscribe if we're switching to a different event, not on unmount
        if (eventId !== currentSubscriptionRef.current) {
          webSocketStore.unsubscribe(currentSubscriptionRef.current);
        }

        currentSubscriptionRef.current = null;
      }
      hasInitializedRef.current = false;
    };
  }, [eventId, token, userType, shareToken, enabled]);

  // Provide additional subscription utilities
  const subscriptionUtils = {
    isSubscribedToEvent: webSocketStore.isSubscribed(eventId),
    isSubscriptionPending: webSocketStore.pendingSubscriptions.has(eventId),
    hasSubscriptionFailed: webSocketStore.failedSubscriptions.has(eventId),
    currentSubscriptions: Array.from(webSocketStore.subscriptions),
    retrySubscription: async () => {
      if (eventId && !webSocketStore.isSubscribed(eventId)) {
        try {
          await webSocketStore.subscribe(eventId, shareToken);
          console.log(`✅ Retry subscription successful for ${eventId}`);
        } catch (error) {
          console.error(`❌ Retry subscription failed for ${eventId}:`, error);
        }
      }
    }
  };

  return {
    // Original WebSocket state
    socket: webSocketStore.socket,
    isConnected: webSocketStore.isConnected,
    isAuthenticated: webSocketStore.isAuthenticated,
    connectionError: webSocketStore.connectionError,
    userInfo: webSocketStore.userInfo,
    isConnecting: webSocketStore.isConnecting,

    // New subscription-specific state
    ...subscriptionUtils
  };
}