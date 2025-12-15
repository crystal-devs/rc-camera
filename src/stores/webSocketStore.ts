// stores/webSocketStore.ts - Industrial Standard Implementation with Race Condition Fix
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { io, Socket } from 'socket.io-client';

// ============================================================================
// Logger Utility - Environment Aware
// ============================================================================
const Logger = {
    debug: (message: string, ...args: any[]) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`🔍 [WS-Debug] ${message}`, ...args);
        }
    },
    info: (message: string, ...args: any[]) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`ℹ️ [WS-Info] ${message}`, ...args);
        }
    },
    warn: (message: string, ...args: any[]) => {
        console.warn(`⚠️ [WS-Warn] ${message}`, ...args);
    },
    error: (message: string, ...args: any[]) => {
        console.error(`❌ [WS-Error] ${message}`, ...args);
    }
};

export interface UserInfo {
    id: string;
    email: string;
    name: string;
    role?: string;
    [key: string]: any;
}

export interface AuthData {
    token?: string;
    shareToken?: string;
    userType: 'admin' | 'guest' | 'photowall';
    eventId?: string;
    guestName?: string;
}

export interface SubscriptionError {
    eventId: string;
    message: string;
    code?: string;
}

export interface WebSocketState {
    socket: Socket | null;
    isConnected: boolean;
    isAuthenticated: boolean;
    subscriptions: Set<string>;
    connectionError: string | null;
    userInfo: UserInfo | null;
    userType: 'admin' | 'guest' | 'photowall' | null;
    reconnectAttempts: number;
    lastConnectionTime: number;
    isConnecting: boolean;
    pendingSubscriptions: Set<string>;
    failedSubscriptions: Set<string>;
    retryCounts: Map<string, number>;
}

export interface WebSocketActions {
    connect: (authToken: string, userType: 'admin' | 'guest' | 'photowall', eventId?: string) => Promise<void>;
    disconnect: () => void;
    subscribe: (eventId: string, shareToken?: string) => Promise<void>;
    unsubscribe: (eventId: string) => Promise<void>;
    switchSubscription: (fromEventId: string, toEventId: string, shareToken?: string) => Promise<void>;
    isSubscribed: (eventId: string) => boolean;
    reconnect: () => Promise<void>;
    syncSubscriptions: () => Promise<void>;
    retrySubscription: (eventId: string, shareToken?: string) => Promise<void>;
    resetConnection: () => void;
    sendHeartbeat: () => void;
}

// ============================================================================
// Connection State Management - Industrial Standard Implementation
// ============================================================================

/**
 * Connection states for state machine pattern
 */
enum ConnectionState {
    IDLE = 'IDLE',
    CONNECTING = 'CONNECTING',
    CONNECTED = 'CONNECTED',
    DISCONNECTING = 'DISCONNECTING',
    DISCONNECTED = 'DISCONNECTED',
    ERROR = 'ERROR'
}

/**
 * Mutex lock for atomic connection operations
 * Prevents race conditions when multiple components try to connect simultaneously
 */
class ConnectionMutex {
    private locked: boolean = false;
    private queue: Array<() => void> = [];

    /**
     * Acquire the lock. If already locked, waits in queue.
     * @returns Promise that resolves when lock is acquired
     */
    async acquire(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (!this.locked) {
                this.locked = true;
                resolve();
            } else {
                this.queue.push(resolve);
            }
        });
    }

    /**
     * Release the lock and process next in queue
     */
    release(): void {
        const next = this.queue.shift();
        if (next) {
            next();
        } else {
            this.locked = false;
        }
    }

    /**
     * Check if lock is currently held
     */
    isLocked(): boolean {
        return this.locked;
    }

    /**
     * Get queue length for monitoring
     */
    getQueueLength(): number {
        return this.queue.length;
    }

    /**
     * Force release (use only for cleanup/error recovery)
     */
    forceRelease(): void {
        this.locked = false;
        this.queue = [];
    }
}

// Global singleton instances
const connectionMutex = new ConnectionMutex();
let currentConnectionState: ConnectionState = ConnectionState.IDLE;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;
const RATE_LIMIT_COOLDOWN = 30000;
const CONNECTION_TIMEOUT = 15000;

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
            retryCounts: new Map(),

            // Actions
            connect: async (authToken: string, userType: 'admin' | 'guest' | 'photowall', eventId?: string) => {
                // ============================================================
                // CRITICAL SECTION: Mutex-protected connection establishment
                // ============================================================

                const queuePosition = connectionMutex.getQueueLength();
                if (queuePosition > 0) {
                    Logger.debug(`Connection request queued (position: ${queuePosition})`);
                }

                // Acquire mutex lock - this is atomic and prevents race conditions
                await connectionMutex.acquire();

                try {
                    const { socket, isConnected, isAuthenticated } = get();

                    Logger.debug(`[MUTEX ACQUIRED] Connection state check:`, {
                        state: currentConnectionState,
                        isConnected,
                        isAuthenticated,
                        socketConnected: socket?.connected,
                        mutexLocked: connectionMutex.isLocked()
                    });

                    // Fast path: Already connected and authenticated
                    if (currentConnectionState === ConnectionState.CONNECTED &&
                        socket?.connected &&
                        isConnected &&
                        isAuthenticated) {
                        Logger.info('Using existing WebSocket connection (mutex protected)');
                        return;
                    }

                    // Check if we're already connecting (shouldn't happen with mutex, but defensive)
                    if (currentConnectionState === ConnectionState.CONNECTING) {
                        Logger.warn('Already connecting (unexpected with mutex)');
                        return;
                    }

                    // Rate limiting check
                    const now = Date.now();
                    const timeSinceLastAttempt = now - get().lastConnectionTime;
                    if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS && timeSinceLastAttempt < RATE_LIMIT_COOLDOWN) {
                        const remainingTime = Math.ceil((RATE_LIMIT_COOLDOWN - timeSinceLastAttempt) / 1000);
                        currentConnectionState = ConnectionState.ERROR;
                        throw new Error(`Rate limited. Try again in ${remainingTime} seconds`);
                    }

                    if (timeSinceLastAttempt > RATE_LIMIT_COOLDOWN) {
                        connectionAttempts = 0;
                    }

                    connectionAttempts++;
                    currentConnectionState = ConnectionState.CONNECTING;

                    // Clean up any existing socket
                    if (socket) {
                        Logger.debug('Cleaning up existing socket');
                        socket.offAny(); // CRITICAL: Remove catch-all listeners
                        socket.removeAllListeners();
                        socket.disconnect();
                        set({ socket: null });
                    }

                    Logger.info(`Creating new WebSocket connection for ${userType} (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`);

                    set({
                        isConnecting: true,
                        connectionError: null,
                        lastConnectionTime: now,
                        subscriptions: new Set(),
                        pendingSubscriptions: new Set(),
                        failedSubscriptions: new Set()
                    });

                    if (!authToken) {
                        currentConnectionState = ConnectionState.ERROR;
                        set({ isConnecting: false });
                        throw new Error(`No auth token provided for ${userType}`);
                    }

                    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
                    Logger.info(`Connecting to: ${wsUrl}`);

                    const newSocket = io(wsUrl, {
                        transports: ['websocket', 'polling'],
                        timeout: CONNECTION_TIMEOUT,
                        reconnection: false,
                        forceNew: true,
                        auth: {
                            token: userType === 'admin' ? authToken : undefined,
                            shareToken: userType !== 'admin' ? authToken : undefined,
                            userType
                        }
                    });

                    set({ socket: newSocket, userType });

                    // Setup connection promise with timeout
                    await new Promise<void>((resolve, reject) => {
                        const cleanup = () => {
                            set({ isConnecting: false });
                        };

                        const timeout = setTimeout(() => {
                            Logger.warn('Connection timeout reached');
                            currentConnectionState = ConnectionState.ERROR;
                            cleanup();
                            reject(new Error('Connection timeout'));
                        }, CONNECTION_TIMEOUT);

                        newSocket.on('connect', () => {
                            Logger.info('WebSocket connected:', newSocket.id);
                            set({ isConnected: true, connectionError: null });

                            // Build auth data - only include eventId if it's provided
                            const authData: AuthData = userType === 'admin'
                                ? {
                                    token: authToken,
                                    userType: 'admin',
                                    ...(eventId && { eventId }) // Only add if truthy
                                }
                                : {
                                    shareToken: authToken,
                                    userType,
                                    guestName: 'Guest User',
                                    ...(eventId && { eventId }) // Only add if truthy
                                };

                            Logger.debug('Sending authentication with data:', {
                                userType,
                                hasToken: !!authToken,
                                hasEventId: !!eventId,
                                eventId: eventId || 'none'
                            });
                            newSocket.emit('authenticate', authData);
                        });

                        newSocket.on('auth_success', (data: { user: UserInfo } | UserInfo) => {
                            Logger.info('WebSocket authenticated:', data);
                            clearTimeout(timeout);

                            currentConnectionState = ConnectionState.CONNECTED;
                            set({
                                isAuthenticated: true,
                                userInfo: 'user' in data ? data.user : data,
                                connectionError: null,
                                reconnectAttempts: 0
                            });

                            // Start periodic sync every 30 seconds
                            const syncInterval = setInterval(() => {
                                if (get().isConnected && get().isAuthenticated) {
                                    get().syncSubscriptions();
                                    get().sendHeartbeat();
                                }
                            }, 30000);

                            // Store interval ID for cleanup
                            (newSocket as any)._syncInterval = syncInterval;

                            connectionAttempts = 0;
                            cleanup();
                            resolve();
                        });

                        newSocket.on('auth_error', (error: Error) => {
                            Logger.error('WebSocket auth failed:', error);
                            clearTimeout(timeout);

                            currentConnectionState = ConnectionState.ERROR;
                            set({
                                connectionError: error.message || 'Authentication failed',
                                isAuthenticated: false
                            });

                            cleanup();
                            reject(new Error(error.message || 'Authentication failed'));
                        });

                        // Subscription event handlers
                        newSocket.on('subscription_success', (data: { eventId: string } | string) => {
                            const eventId = typeof data === 'string' ? data : data.eventId;
                            Logger.info(`Subscription confirmed: ${eventId}`);

                            const newSubscriptions = new Set(get().subscriptions);
                            const newPending = new Set(get().pendingSubscriptions);

                            newSubscriptions.add(eventId);
                            newPending.delete(eventId);

                            set({
                                subscriptions: newSubscriptions,
                                pendingSubscriptions: newPending
                            });
                        });

                        newSocket.on('subscription_error', (data: SubscriptionError | string) => {
                            const eventId = typeof data === 'string' ? data : data.eventId;
                            const errorMessage = typeof data === 'string' ? data : data.message || 'Unknown error';
                            Logger.error(`Subscription failed: ${eventId}`, data);

                            const newPending = new Set(get().pendingSubscriptions);
                            const newFailed = new Set(get().failedSubscriptions);

                            newPending.delete(eventId);
                            newFailed.add(eventId);

                            set({
                                pendingSubscriptions: newPending,
                                failedSubscriptions: newFailed
                            });

                            // Only retry for recoverable errors
                            const isRecoverableError = !errorMessage.toLowerCase().includes('not found') &&
                                                      !errorMessage.toLowerCase().includes('unauthorized') &&
                                                      !errorMessage.toLowerCase().includes('forbidden');

                            if (isRecoverableError) {
                                // Trigger retry logic for recoverable errors
                                get().retrySubscription(eventId, (data as any)?.shareToken);
                            } else {
                                Logger.warn(`Not retrying subscription for ${eventId}: ${errorMessage}`);
                                // Reset retry count for non-recoverable errors
                                const newRetryCounts = new Map(get().retryCounts);
                                newRetryCounts.delete(eventId);
                                set({ retryCounts: newRetryCounts });
                            }
                        });

                        // Sync complete handler
                        newSocket.on('sync_complete', (data: { synced: string[] }) => {
                            Logger.info('Subscription sync complete:', data);

                            // Update local state to match server
                            set({
                                subscriptions: new Set(data.synced),
                                pendingSubscriptions: new Set(),
                                failedSubscriptions: new Set()
                            });
                        });

                        newSocket.on('disconnect', (reason) => {
                            Logger.info('WebSocket disconnected:', reason);
                            currentConnectionState = ConnectionState.DISCONNECTED;

                            // Clear periodic sync interval
                            if ((newSocket as any)._syncInterval) {
                                clearInterval((newSocket as any)._syncInterval);
                            }

                            set({
                                isConnected: false,
                                isAuthenticated: false,
                                subscriptions: new Set(),
                                pendingSubscriptions: new Set(),
                                failedSubscriptions: new Set()
                            });

                            // Enable reconnection in all environments for better DX
                            if (reason === 'io server disconnect' || reason === 'transport close') {
                                setTimeout(() => {
                                    const currentState = get();
                                    if (currentState.reconnectAttempts < 3) {
                                        Logger.info('Attempting auto-reconnect...');
                                        currentState.reconnect();
                                    }
                                }, 5000);
                            }
                        });

                        newSocket.on('connect_error', (error) => {
                            Logger.error('WebSocket connection error:', error);
                            const errorMessage = error.message || error.toString();
                            set({ connectionError: errorMessage });

                            if (errorMessage.toLowerCase().includes('rate limit')) {
                                clearTimeout(timeout);
                                currentConnectionState = ConnectionState.ERROR;
                                cleanup();
                                reject(new Error('Rate limit exceeded'));
                                return;
                            }

                            const attempts = get().reconnectAttempts + 1;
                            set({ reconnectAttempts: attempts });

                            if (attempts >= 3) {
                                clearTimeout(timeout);
                                currentConnectionState = ConnectionState.ERROR;
                                cleanup();
                                reject(new Error(`Connection failed after ${attempts} attempts: ${errorMessage}`));
                            }
                        });

                        // Event logging (only in development)
                        if (process.env.NODE_ENV === 'development') {
                            newSocket.onAny((eventName, ...args) => {
                                Logger.debug(`Socket event: ${eventName}`, args);
                            });
                        }
                    });

                } catch (error) {
                    currentConnectionState = ConnectionState.ERROR;
                    Logger.error('Connection failed:', error);
                    throw error;
                } finally {
                    // CRITICAL: Always release the mutex
                    connectionMutex.release();
                    Logger.debug(`[MUTEX RELEASED] Queue length: ${connectionMutex.getQueueLength()}`);
                }
            },

            retrySubscription: async (eventId: string, shareToken?: string) => {
                const { retryCounts, subscribe, isConnected, isAuthenticated, socket } = get();
                const currentRetries = retryCounts.get(eventId) || 0;
                const MAX_RETRIES = 3;

                // Don't retry if connection is not ready
                if (!socket || !isConnected || !isAuthenticated) {
                    Logger.warn(`Skipping retry for ${eventId}: WebSocket not ready`);
                    return;
                }

                if (currentRetries >= MAX_RETRIES) {
                    Logger.error(`❌ Max retries reached for subscription: ${eventId}`);
                    // Reset retry count after max attempts to allow future retries if conditions change
                    const newRetryCounts = new Map(retryCounts);
                    newRetryCounts.delete(eventId);
                    set({ retryCounts: newRetryCounts });
                    return;
                }

                const delay = Math.pow(2, currentRetries) * 1000; // 1s, 2s, 4s
                Logger.info(`Retrying subscription for ${eventId} in ${delay}ms (Attempt ${currentRetries + 1}/${MAX_RETRIES})`);

                // Update retry count
                const newRetryCounts = new Map(retryCounts);
                newRetryCounts.set(eventId, currentRetries + 1);
                set({ retryCounts: newRetryCounts });

                setTimeout(() => {
                    // Double-check connection before retrying
                    const currentState = get();
                    if (currentState.isConnected && currentState.isAuthenticated) {
                        subscribe(eventId, shareToken);
                    } else {
                        Logger.warn(`Skipping retry for ${eventId}: Connection lost during delay`);
                        // Reset retry count if connection is lost
                        const resetCounts = new Map(currentState.retryCounts);
                        resetCounts.delete(eventId);
                        set({ retryCounts: resetCounts });
                    }
                }, delay);
            },

            // Subscription-based room management
            subscribe: async (eventId: string, shareToken?: string) => {
                const { socket, isAuthenticated, subscriptions, pendingSubscriptions } = get();

                Logger.debug(`Attempting to subscribe to: ${eventId}`);

                if (!socket || !socket.connected || !isAuthenticated) {
                    throw new Error('WebSocket not ready for subscriptions');
                }

                // Validate eventId
                if (!eventId || typeof eventId !== 'string' || eventId.trim().length === 0) {
                    Logger.error(`Invalid eventId for subscription: ${eventId}`);
                    throw new Error('Invalid event ID');
                }

                if (subscriptions.has(eventId)) {
                    Logger.debug(`Already subscribed to: ${eventId}`);
                    return;
                }

                if (pendingSubscriptions.has(eventId)) {
                    Logger.debug(`Subscription already pending for: ${eventId}`);
                    return;
                }

                // Add to pending
                const newPending = new Set(pendingSubscriptions);
                newPending.add(eventId);

                // Initialize retry count if not present
                const newRetryCounts = new Map(get().retryCounts);
                if (!newRetryCounts.has(eventId)) {
                    newRetryCounts.set(eventId, 0);
                }

                set({
                    pendingSubscriptions: newPending,
                    retryCounts: newRetryCounts
                });

                Logger.info(`Subscribing to: ${eventId}`);
                socket.emit('subscribe_to_event', { eventId, shareToken });

                // Set timeout for subscription
                setTimeout(() => {
                    const currentPending = get().pendingSubscriptions;
                    if (currentPending.has(eventId)) {
                        Logger.warn(`Subscription timeout for: ${eventId}`);
                        const newPending = new Set(currentPending);
                        const newFailed = new Set(get().failedSubscriptions);

                        newPending.delete(eventId);
                        newFailed.add(eventId);

                        set({
                            pendingSubscriptions: newPending,
                            failedSubscriptions: newFailed
                        });

                        // Trigger retry on timeout
                        get().retrySubscription(eventId, shareToken);
                    }
                }, 8000);
            },

            unsubscribe: async (eventId: string) => {
                const { socket, subscriptions } = get();

                if (!socket || !subscriptions.has(eventId)) {
                    return;
                }

                Logger.info(`Unsubscribing from: ${eventId}`);
                socket.emit('unsubscribe_from_event', { eventId });

                const newSubscriptions = new Set(subscriptions);
                newSubscriptions.delete(eventId);
                set({ subscriptions: newSubscriptions });
            },

            switchSubscription: async (fromEventId: string, toEventId: string, shareToken?: string) => {
                Logger.info(`Switching subscription from ${fromEventId} to ${toEventId}`);

                if (fromEventId === toEventId) {
                    Logger.debug('Same event, no switch needed');
                    return;
                }

                const { socket, isAuthenticated, isConnected } = get();

                if (!socket || !isConnected || !isAuthenticated) {
                    throw new Error('WebSocket not ready for subscription operations');
                }

                try {
                    const promises = [];

                    if (fromEventId && get().subscriptions.has(fromEventId)) {
                        promises.push(get().unsubscribe(fromEventId));
                    }

                    if (toEventId) {
                        promises.push(get().subscribe(toEventId, shareToken));
                    }

                    await Promise.allSettled(promises);
                    Logger.info(`Successfully switched subscriptions: ${fromEventId} → ${toEventId}`);
                } catch (error) {
                    Logger.error(`Subscription switch failed:`, error);
                    throw error;
                }
            },

            isSubscribed: (eventId: string) => {
                return get().subscriptions.has(eventId);
            },

            syncSubscriptions: async () => {
                const { socket, subscriptions, isAuthenticated, isConnected } = get();

                if (!socket || !isConnected || !isAuthenticated) {
                    Logger.warn('Cannot sync: WebSocket not ready');
                    return;
                }

                Logger.info('Syncing subscriptions with server...');

                socket.emit('sync_subscriptions', {
                    subscriptions: Array.from(subscriptions)
                });
            },

            reconnect: async () => {
                const { userType } = get();
                if (!userType) {
                    Logger.warn('Cannot reconnect: no user type stored');
                    return;
                }

                const authToken = typeof window !== 'undefined'
                    ? localStorage.getItem('rc-token')
                    : null;

                if (!authToken) {
                    Logger.warn('Cannot reconnect: no auth token found');
                    return;
                }

                try {
                    await get().connect(authToken, userType);
                } catch (error) {
                    Logger.error('Reconnection failed:', error);
                }
            },

            resetConnection: () => {
                const { socket } = get();
                Logger.info('Resetting WebSocket connection');

                if (socket) {
                    socket.offAny(); // CRITICAL: Remove catch-all listeners
                    socket.removeAllListeners();
                    socket.disconnect();
                }

                // Force release mutex in case of stuck state
                connectionMutex.forceRelease();
                currentConnectionState = ConnectionState.IDLE;
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
                    failedSubscriptions: new Set(),
                    retryCounts: new Map()
                });
            },

            disconnect: () => {
                const { socket } = get();
                Logger.info('Manually disconnecting WebSocket');

                currentConnectionState = ConnectionState.DISCONNECTING;

                if (socket) {
                    socket.offAny(); // CRITICAL: Remove catch-all listeners
                    socket.removeAllListeners();
                    socket.disconnect();
                }

                connectionMutex.forceRelease();
                currentConnectionState = ConnectionState.DISCONNECTED;
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
                    failedSubscriptions: new Set(),
                    retryCounts: new Map()
                });
            },

            sendHeartbeat: () => {
                const { socket, isConnected } = get();
                if (socket && isConnected) {
                    socket.emit('heartbeat', { timestamp: Date.now() });
                    Logger.debug('💓 Heartbeat sent');
                }
            }
        }),
        {
            name: 'websocket-store',
            version: 3, // Incremented for mutex implementation
            partialize: (state) => ({
                userType: state.userType,
                lastConnectionTime: state.lastConnectionTime,
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // Reset runtime state on rehydration
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

                    // Reset global state
                    currentConnectionState = ConnectionState.IDLE;
                    connectionMutex.forceRelease();
                }
            }
        }
    )
);
