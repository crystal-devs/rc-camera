import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface WebSocketHandlers {
    handleMediaApproved: (payload: any) => void;
    handleMediaStatusUpdated: (payload: any) => void;
    handleNewMediaUploaded: (payload: any) => void;
    handleMediaRemoved: (payload: any) => void;
    handleMediaProcessingComplete: (payload: any) => void;
}

interface UseGuestWebSocketHandlersOptions {
    socket: any;
    webSocketHandlers: WebSocketHandlers;
}

/**
 * Hook to manage WebSocket event handlers with proper ref usage.
 * Follows Vercel best practices:
 * - Uses refs to avoid unstable dependencies
 * - Deduplicates events with Set stored in ref
 * - Stable event listener registration
 */
export function useGuestWebSocketHandlers({
    socket,
    webSocketHandlers
}: UseGuestWebSocketHandlersOptions) {
    // Use refs for transient values that change frequently
    const processedEventsRef = useRef(new Set<string>());
    const eventTimeoutsRef = useRef(new Map<string, NodeJS.Timeout>());

    // Stable deduplication checker with no dependencies
    const shouldProcessEvent = useCallback((eventType: string, payload: any): boolean => {
        const mediaId = payload.mediaId || payload._id || payload.id || 'unknown';
        const signature = `${eventType}:${mediaId}`;

        if (processedEventsRef.current.has(signature)) {
            return false;
        }

        processedEventsRef.current.add(signature);

        const timeoutId = setTimeout(() => {
            processedEventsRef.current.delete(signature);
            eventTimeoutsRef.current.delete(signature);
        }, 10000);

        eventTimeoutsRef.current.set(signature, timeoutId);
        return true;
    }, []); // Stable - no dependencies

    // Create event handlers with stable callbacks
    const handleMediaApproved = useCallback((payload: any) => {
        if (!shouldProcessEvent('media_approved', payload)) return;
        webSocketHandlers.handleMediaApproved(payload);
        toast.success('New photos approved!', {
            duration: 3000,
            position: 'bottom-center'
        });
    }, [shouldProcessEvent, webSocketHandlers]);

    const handleMediaStatusUpdated = useCallback((payload: any) => {
        if (!shouldProcessEvent('media_status_updated', payload)) return;
        webSocketHandlers.handleMediaStatusUpdated(payload);

        const items = Array.isArray(payload) ? payload : [payload];
        items.forEach(item => {
            if (item.newStatus === 'approved' && item.previousStatus !== 'approved') {
                toast.success('Photo approved!', {
                    duration: 2000,
                    position: 'bottom-center'
                });
            } else if (item.newStatus === 'hidden' || item.newStatus === 'rejected') {
                toast.info('Photo was removed', {
                    duration: 3000,
                    position: 'bottom-center'
                });
            }
        });
    }, [shouldProcessEvent, webSocketHandlers]);

    const handleNewMediaUploaded = useCallback((payload: any) => {
        if (!shouldProcessEvent('new_media_uploaded', payload)) return;
        webSocketHandlers.handleNewMediaUploaded(payload);
        toast.success('New photos added!', {
            duration: 3000,
            position: 'bottom-center'
        });
    }, [shouldProcessEvent, webSocketHandlers]);

    const handleMediaRemoved = useCallback((payload: any) => {
        if (!shouldProcessEvent('media_removed', payload)) return;
        webSocketHandlers.handleMediaRemoved(payload);
        const count = payload.mediaIds?.length || 1;
        toast.info(`${count} photo${count > 1 ? 's' : ''} removed`, {
            duration: 3000,
            position: 'bottom-center'
        });
    }, [shouldProcessEvent, webSocketHandlers]);

    const handleMediaProcessingComplete = useCallback((payload: any) => {
        if (!shouldProcessEvent('media_processing_complete', payload)) return;
        webSocketHandlers.handleMediaProcessingComplete(payload);
        toast.success('High-quality version ready!', {
            duration: 2000,
            position: 'bottom-center'
        });
    }, [shouldProcessEvent, webSocketHandlers]);

    // Register event listeners - only re-runs when socket or handlers change
    useEffect(() => {
        if (!socket) return;

        socket.on('media_approved', handleMediaApproved);
        socket.on('media_status_updated', handleMediaStatusUpdated);
        socket.on('new_media_uploaded', handleNewMediaUploaded);
        socket.on('media_removed', handleMediaRemoved);
        socket.on('guest_media_removed', handleMediaRemoved);
        socket.on('media_processing_complete', handleMediaProcessingComplete);

        return () => {
            socket.off('media_approved', handleMediaApproved);
            socket.off('media_status_updated', handleMediaStatusUpdated);
            socket.off('new_media_uploaded', handleNewMediaUploaded);
            socket.off('media_removed', handleMediaRemoved);
            socket.off('guest_media_removed', handleMediaRemoved);
            socket.off('media_processing_complete', handleMediaProcessingComplete);
        };
    }, [
        socket,
        handleMediaApproved,
        handleMediaStatusUpdated,
        handleNewMediaUploaded,
        handleMediaRemoved,
        handleMediaProcessingComplete
    ]);

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            eventTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
            eventTimeoutsRef.current.clear();
            processedEventsRef.current.clear();
        };
    }, []);
}
