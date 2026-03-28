import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Slim guest WebSocket event handlers (v2).
 *
 * Guests receive only 2 meaningful events from the server:
 *   new_photos_available  – N new approved photos exist; show a banner
 *   photo_removed         – A photo (by ID) was removed; remove from local state
 *
 * This replaces the old 6-event system (media_approved, media_status_updated,
 * new_media_uploaded, media_removed, guest_media_removed, media_processing_complete).
 */

interface WebSocketHandlers {
    /** Called when N new approved photos are available. Guests should show a refresh banner. */
    handleNewPhotosAvailable: (payload: { eventId: string; count: number }) => void;
    /** Called when a visible photo is removed. Remove it silently from local state. */
    handlePhotoRemoved: (payload: { mediaId: string; eventId: string }) => void;
}

interface UseGuestWebSocketHandlersOptions {
    socket: any;
    webSocketHandlers: WebSocketHandlers;
}

export function useGuestWebSocketHandlers({
    socket,
    webSocketHandlers
}: UseGuestWebSocketHandlersOptions) {
    // Deduplication: prevent double-firing for the same mediaId within 10s
    const processedEventsRef = useRef(new Set<string>());
    const eventTimeoutsRef = useRef(new Map<string, NodeJS.Timeout>());

    const deduplicate = useCallback((eventType: string, identifier: string): boolean => {
        const key = `${eventType}:${identifier}`;
        if (processedEventsRef.current.has(key)) return false;

        processedEventsRef.current.add(key);

        const timeoutId = setTimeout(() => {
            processedEventsRef.current.delete(key);
            eventTimeoutsRef.current.delete(key);
        }, 10_000);

        eventTimeoutsRef.current.set(key, timeoutId);
        return true;
    }, []);

    // ── new_photos_available ────────────────────────────────────────────────
    const handleNewPhotosAvailable = useCallback((payload: any) => {
        const count = payload?.count ?? 1;
        const key = `${payload?.eventId}:${Date.now().toString().slice(0, -3)}`; // dedupe per second

        if (!deduplicate('new_photos_available', key)) return;

        webSocketHandlers.handleNewPhotosAvailable({ eventId: payload?.eventId, count });

        toast.success(
            count === 1
                ? 'A new photo was added — tap to refresh'
                : `${count} new photo${count > 1 ? 's' : ''} added — tap to refresh`,
            { duration: 4000, position: 'bottom-center' }
        );
    }, [deduplicate, webSocketHandlers]);

    // ── photo_removed ───────────────────────────────────────────────────────
    const handlePhotoRemoved = useCallback((payload: any) => {
        const mediaId = payload?.mediaId;
        if (!mediaId) return;
        if (!deduplicate('photo_removed', mediaId)) return;

        webSocketHandlers.handlePhotoRemoved({ mediaId, eventId: payload?.eventId });
        // No toast for removal — silent UX is less disruptive
    }, [deduplicate, webSocketHandlers]);

    // Register listeners
    useEffect(() => {
        if (!socket) return;

        socket.on('new_photos_available', handleNewPhotosAvailable);
        socket.on('photo_removed', handlePhotoRemoved);

        return () => {
            socket.off('new_photos_available', handleNewPhotosAvailable);
            socket.off('photo_removed', handlePhotoRemoved);
        };
    }, [socket, handleNewPhotosAvailable, handlePhotoRemoved]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            eventTimeoutsRef.current.forEach(t => clearTimeout(t));
            eventTimeoutsRef.current.clear();
            processedEventsRef.current.clear();
        };
    }, []);
}
