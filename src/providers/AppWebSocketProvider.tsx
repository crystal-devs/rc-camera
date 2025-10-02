// components/providers/AppWebSocketProvider.tsx
'use client';

import { useStore } from '@/lib/store';
import { useWebSocketStore } from '@/stores/webSocketStore';
import React, { useEffect } from 'react';

interface AppWebSocketProviderProps {
  children: React.ReactNode;
}

export function AppWebSocketProvider({ children }: AppWebSocketProviderProps) {
  const { isAuthenticated } = useStore();
  const { resetConnection, disconnect } = useWebSocketStore();

  useEffect(() => {
    // Only handle cleanup when user logs out
    // DO NOT create connections here - let useEventWebSocket handle that
    if (!isAuthenticated) {
      console.log('🔓 User logged out, resetting WebSocket connection');
      resetConnection();
    }
  }, [isAuthenticated, resetConnection]);

  // Global cleanup on app unmount
  useEffect(() => {
    return () => {
      console.log('🔌 App unmounting, disconnecting WebSocket');
      disconnect();
    };
  }, [disconnect]);

  return <>{children}</>;
}