// stores/webSocketStore.ts - Improved Architecture
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { io, Socket } from 'socket.io-client';

export interface WebSocketState {
    socket: Socket | null;
    isConnected: boolean;
    isAuthenticated: boolean;
    subscriptions: Set<string>; // Changed from currentRooms to subscriptions
    connectionError: string | null;
    userInfo: any | null;
    userType: 'admin' | 'guest' | 'photowall' | null;
    reconnectAttempts: number;
    lastConnectionTime: number;
    isConnecting: boolean;
    // New: Track subscription states
    pendingSubscriptions: Set<string>;
    failedSubscriptions: Set<string>;
}

export interface WebSocketActions {
    connect: (authToken: string, userType: 'admin' | 'guest' | 'photowall', eventId?: string) => Promise<void>;
    disconnect: () => void;

    // New subscription-based methods
    subscribe: (eventId: string, shareToken?: string) => Promise<void>;
    unsubscribe: (eventId: string) => Promise<void>;
    switchSubscription: (fromEventId: string, toEventId: string, shareToken?: string) => Promise<void>;

    // Utility methods
    isSubscribed: (eventId: string) => boolean;
    reconnect: () => Promise<void>;
    resetConnection: () => void;
}

// Global connection promise to prevent multiple simultaneous connection attempts
let connectionPromise: Promise<void> | null = null;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;
const RATE_LIMIT_COOLDOWN = 30000;

export const useWebSocketStore = create<WebSocketState & WebSocketActions>()(
    persist(
        (set, get) => ({
            // State
            socket: null,
            isConnected: false,
            isAuthenticated: false,
            subscriptions: new Set(),
            connectionError: null,
            userInfo: null,
            userType: null,
            reconnectAttempts: 0,
            lastConnectionTime: 0,
            isConnecting: false,
            pendingSubscriptions: new Set(),
            failedSubscriptions: new Set(),

            // Actions
            connect: async (authToken: string, userType: 'admin' | 'guest' | 'photowall', eventId?: string) => {
                const { socket, isConnected, isConnecting } = get();

                console.log(`🔍 Connect called - Connected: ${isConnected}, Authenticated: ${get().isAuthenticated}`);

                // If already connected and authenticated, return immediately
                if (socket?.connected && isConnected && get().isAuthenticated) {
                    console.log('✅ Using existing WebSocket connection');
                    return;
                }

                // If already connecting, wait for the existing connection attempt
                if (isConnecting && connectionPromise) {
                    console.log('⏳ Connection already in progress, waiting...');
                    return connectionPromise;
                }

                // Rate limiting check
                const now = Date.now();
                const timeSinceLastAttempt = now - get().lastConnectionTime;
                if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS && timeSinceLastAttempt < RATE_LIMIT_COOLDOWN) {
                    const remainingTime = Math.ceil((RATE_LIMIT_COOLDOWN - timeSinceLastAttempt) / 1000);
                    throw new Error(`Rate limited. Try again in ${remainingTime} seconds`);
                }

                if (timeSinceLastAttempt > RATE_LIMIT_COOLDOWN) {
                    connectionAttempts = 0;
                }

                connectionAttempts++;

                // Clean up any existing socket
                if (socket) {
                    console.log('🧹 Cleaning up existing socket');
                    socket.removeAllListeners();
                    socket.disconnect();
                    set({ socket: null });
                }

                console.log(`🔌 Creating new WebSocket connection for ${userType} (attempt ${connectionAttempts})`);

                set({
                    isConnecting: true,
                    connectionError: null,
                    lastConnectionTime: now,
                    subscriptions: new Set(), // Reset subscriptions on new connection
                    pendingSubscriptions: new Set(),
                    failedSubscriptions: new Set()
                });

                if (!authToken) {
                    set({ isConnecting: false });
                    throw new Error(`No auth token provided for ${userType}`);
                }

                const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
                console.log(`🌐 Connecting to: ${wsUrl}`);

                const newSocket = io(wsUrl, {
                    transports: ['websocket', 'polling'],
                    timeout: 15000, // Increased timeout for better reliability
                    reconnection: false,
                    forceNew: true,
                    auth: {
                        token: userType === 'admin' ? authToken : undefined,
                        shareToken: userType !== 'admin' ? authToken : undefined,
                        userType
                    }
                });

                set({ socket: newSocket, userType });

                connectionPromise = new Promise<void>((resolve, reject) => {
                    const cleanup = () => {
                        set({ isConnecting: false });
                        connectionPromise = null;
                    };

                    const timeout = setTimeout(() => {
                        console.log('⏰ Connection timeout reached');
                        cleanup();
                        reject(new Error('Connection timeout'));
                    }, 15000);

                    newSocket.on('connect', () => {
                        console.log('✅ WebSocket connected:', newSocket.id);
                        set({ isConnected: true, connectionError: null });

                        const authData = userType === 'admin'
                            ? { token: authToken, userType: 'admin', eventId: eventId || '' }
                            : { shareToken: authToken, userType, guestName: 'Guest User', eventId: eventId || authToken };

                        console.log('🔐 Sending authentication...');
                        newSocket.emit('authenticate', authData);
                    });

                    newSocket.on('auth_success', (data) => {
                        console.log('✅ WebSocket authenticated:', data);

                        // DEBUGGING: Log the received user data
                        console.log('🔍 Auth success user data:', {
                            id: data.user?.id,
                            name: data.user?.name,
                            type: data.user?.type,
                            fullData: data
                        });

                        clearTimeout(timeout);
                        set({
                            isAuthenticated: true,
                            userInfo: data.user || data, // This should now include the ID
                            connectionError: null,
                            reconnectAttempts: 0
                        });
                        connectionAttempts = 0;
                        cleanup();
                        resolve();
                    });

                    newSocket.on('auth_error', (error) => {
                        console.error('❌ WebSocket auth failed:', error);
                        clearTimeout(timeout);
                        set({
                            connectionError: error.message || 'Authentication failed',
                            isAuthenticated: false
                        });
                        cleanup();
                        reject(new Error(error.message || 'Authentication failed'));
                    });

                    // New: Handle subscription confirmations
                    newSocket.on('subscription_success', (data) => {
                        const eventId = data.eventId || data;
                        console.log(`✅ Subscription confirmed: ${eventId}`);

                        const newSubscriptions = new Set(get().subscriptions);
                        const newPending = new Set(get().pendingSubscriptions);

                        newSubscriptions.add(eventId);
                        newPending.delete(eventId);

                        set({
                            subscriptions: newSubscriptions,
                            pendingSubscriptions: newPending
                        });
                    });

                    newSocket.on('subscription_error', (data) => {
                        const eventId = data.eventId || data;
                        console.error(`❌ Subscription failed: ${eventId}`, data);

                        const newPending = new Set(get().pendingSubscriptions);
                        const newFailed = new Set(get().failedSubscriptions);

                        newPending.delete(eventId);
                        newFailed.add(eventId);

                        set({
                            pendingSubscriptions: newPending,
                            failedSubscriptions: newFailed
                        });
                    });

                    newSocket.on('disconnect', (reason) => {
                        console.log('🔌 WebSocket disconnected:', reason);
                        set({
                            isConnected: false,
                            isAuthenticated: false,
                            subscriptions: new Set(),
                            pendingSubscriptions: new Set(),
                            failedSubscriptions: new Set()
                        });

                        if (process.env.NODE_ENV === 'production') {
                            if (reason === 'io server disconnect' || reason === 'transport close') {
                                setTimeout(() => {
                                    const currentState = get();
                                    if (currentState.reconnectAttempts < 3) {
                                        console.log('🔄 Attempting auto-reconnect...');
                                        currentState.reconnect();
                                    }
                                }, 5000);
                            }
                        }
                    });

                    newSocket.on('connect_error', (error) => {
                        console.error('❌ WebSocket connection error:', error);
                        const errorMessage = error.message || error.toString();
                        set({ connectionError: errorMessage });

                        if (errorMessage.toLowerCase().includes('rate limit')) {
                            clearTimeout(timeout);
                            cleanup();
                            reject(new Error('Rate limit exceeded'));
                            return;
                        }

                        const attempts = get().reconnectAttempts + 1;
                        set({ reconnectAttempts: attempts });

                        if (attempts >= 3) {
                            clearTimeout(timeout);
                            cleanup();
                            reject(new Error(`Connection failed after ${attempts} attempts: ${errorMessage}`));
                        }
                    });

                    // Comprehensive event logging
                    newSocket.onAny((eventName, ...args) => {
                        console.log(`📡 Socket event: ${eventName}`, args);
                    });
                });

                return connectionPromise;
            },

            // New: Subscription-based room management
            subscribe: async (eventId: string, shareToken?: string) => {
                const { socket, isAuthenticated, subscriptions, pendingSubscriptions } = get();

                console.log(`📝 Attempting to subscribe to: ${eventId}`);

                if (!socket || !socket.connected || !isAuthenticated) {
                    throw new Error('WebSocket not ready for subscriptions');
                }

                if (subscriptions.has(eventId)) {
                    console.log(`✅ Already subscribed to: ${eventId}`);
                    return;
                }

                if (pendingSubscriptions.has(eventId)) {
                    console.log(`⏳ Subscription already pending for: ${eventId}`);
                    return;
                }

                // Add to pending
                const newPending = new Set(pendingSubscriptions);
                newPending.add(eventId);
                set({ pendingSubscriptions: newPending });

                console.log(`📝 Subscribing to: ${eventId}`);
                socket.emit('subscribe_to_event', { eventId, shareToken });

                // Set timeout for subscription
                setTimeout(() => {
                    const currentPending = get().pendingSubscriptions;
                    if (currentPending.has(eventId)) {
                        console.warn(`⚠️ Subscription timeout for: ${eventId}`);
                        const newPending = new Set(currentPending);
                        const newFailed = new Set(get().failedSubscriptions);

                        newPending.delete(eventId);
                        newFailed.add(eventId);

                        set({
                            pendingSubscriptions: newPending,
                            failedSubscriptions: newFailed
                        });
                    }
                }, 8000);
            },

            unsubscribe: async (eventId: string) => {
                const { socket, subscriptions } = get();

                if (!socket || !subscriptions.has(eventId)) {
                    return;
                }

                console.log(`📝 Unsubscribing from: ${eventId}`);
                socket.emit('unsubscribe_from_event', { eventId });

                const newSubscriptions = new Set(subscriptions);
                newSubscriptions.delete(eventId);
                set({ subscriptions: newSubscriptions });
            },

            switchSubscription: async (fromEventId: string, toEventId: string, shareToken?: string) => {
                console.log(`🔄 Switching subscription from ${fromEventId} to ${toEventId}`);

                if (fromEventId === toEventId) {
                    console.log('✅ Same event, no switch needed');
                    return;
                }

                const { socket, isAuthenticated, isConnected } = get();

                if (!socket || !isConnected || !isAuthenticated) {
                    throw new Error('WebSocket not ready for subscription operations');
                }

                try {
                    // Instead of sequential operations, do them in parallel
                    const promises = [];

                    if (fromEventId && get().subscriptions.has(fromEventId)) {
                        promises.push(get().unsubscribe(fromEventId));
                    }

                    if (toEventId) {
                        promises.push(get().subscribe(toEventId, shareToken));
                    }

                    await Promise.allSettled(promises);
                    console.log(`✅ Successfully switched subscriptions: ${fromEventId} → ${toEventId}`);
                } catch (error) {
                    console.error(`❌ Subscription switch failed:`, error);
                    throw error;
                }
            },

            isSubscribed: (eventId: string) => {
                return get().subscriptions.has(eventId);
            },

            reconnect: async () => {
                const { userType } = get();
                if (!userType) {
                    console.warn('⚠️ Cannot reconnect: no user type stored');
                    return;
                }

                const authToken = typeof window !== 'undefined'
                    ? localStorage.getItem('rc-token') || localStorage.getItem('authToken')
                    : null;

                if (!authToken) {
                    console.warn('⚠️ Cannot reconnect: no auth token found');
                    return;
                }

                try {
                    await get().connect(authToken, userType);
                } catch (error) {
                    console.error('❌ Reconnection failed:', error);
                }
            },

            resetConnection: () => {
                const { socket } = get();
                console.log('🔄 Resetting WebSocket connection');

                if (socket) {
                    socket.removeAllListeners();
                    socket.disconnect();
                }

                connectionPromise = null;
                connectionAttempts = 0;

                set({
                    socket: null,
                    isConnected: false,
                    isAuthenticated: false,
                    subscriptions: new Set(),
                    connectionError: null,
                    userInfo: null,
                    userType: null,
                    reconnectAttempts: 0,
                    isConnecting: false,
                    pendingSubscriptions: new Set(),
                    failedSubscriptions: new Set()
                });
            },

            disconnect: () => {
                const { socket } = get();
                console.log('🔌 Manually disconnecting WebSocket');

                if (socket) {
                    socket.removeAllListeners();
                    socket.disconnect();
                }

                connectionPromise = null;
                connectionAttempts = 0;

                set({
                    socket: null,
                    isConnected: false,
                    isAuthenticated: false,
                    subscriptions: new Set(),
                    connectionError: null,
                    userInfo: null,
                    isConnecting: false,
                    pendingSubscriptions: new Set(),
                    failedSubscriptions: new Set()
                });
            }
        }),
        {
            name: 'websocket-store',
            version: 2, // Increment version for new subscription model
            partialize: (state) => ({
                userType: state.userType,
                lastConnectionTime: state.lastConnectionTime,
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.socket = null;
                    state.isConnected = false;
                    state.isAuthenticated = false;
                    state.subscriptions = new Set();
                    state.connectionError = null;
                    state.userInfo = null;
                    state.reconnectAttempts = 0;
                    state.isConnecting = false;
                    state.pendingSubscriptions = new Set();
                    state.failedSubscriptions = new Set();
                }
            }
        }
    )
);