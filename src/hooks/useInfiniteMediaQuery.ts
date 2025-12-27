// hooks/useInfiniteMediaQuery.ts - Clean and simple
'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState, useCallback } from 'react';
import { getEventMediaWithGuestToken } from '@/services/apis/media.api';
import { MediaFetchOptions, transformApiPhoto } from '@/types/events';

// Industry standard: Centralized cache configuration
const CACHE_CONFIG = {
    staleTime: Infinity,          // Data never becomes stale automatically
    gcTime: 24 * 60 * 60 * 1000,  // Keep unused data in memory for 24 hours
    refetchOnWindowFocus: false,  // Do not refetch when switching tabs
    refetchOnMount: false,        // Do not refetch on component mount if data exists
    refetchOnReconnect: false,    // Do not refetch on network reconnect
    retry: 2,
    networkMode: 'online' as const
};

interface UseInfiniteMediaQueryProps {
    shareToken: string;
    auth: string | null;
    limit?: number;
    enabled?: boolean;
}

export const useInfiniteMediaQuery = ({
    shareToken,
    auth,
    limit = 20,
    enabled = true
}: UseInfiniteMediaQueryProps) => {
    const queryKey = ['guest-media', shareToken];

    // Buffered changes state for WebSocket updates
    const [bufferedChanges, setBufferedChanges] = useState<any[]>([]);

    const fetchMediaPage = async ({ pageParam = 1 }) => {
        if (!shareToken) {
            throw new Error('Share token is required');
        }

        const options: Partial<MediaFetchOptions> = {
            page: pageParam,
            limit,
            scroll_type: 'pagination',
            quality: 'thumbnail'
        };

        try {
            const response = await getEventMediaWithGuestToken(shareToken, auth, options);

            if (!response?.data || !Array.isArray(response.data)) {
                return {
                    photos: [],
                    hasNext: false,
                    total: 0,
                    page: pageParam
                };
            }

            // Filter only approved photos
            const approvedPhotos = response.data.filter((photo: any) => {
                const status = photo.approval?.status || (photo.approval_status ? 'approved' : 'pending');
                return status === 'approved' || status === 'auto_approved' || photo.approval_status === true;
            });

            // Transform photos to TransformedPhoto format
            const transformedPhotos = approvedPhotos.map((photo: any) => transformApiPhoto({
                ...photo,
                albumId: photo.album_id,
                eventId: photo.event_id,
                imageUrl: photo.url,
                thumbnail: photo.thumbnail_url || photo.url,
                createdAt: photo.created_at
            } as any));

            // Simple pagination logic
            const hasNext = (response as any).other?.pagination?.hasNext ?? (approvedPhotos.length === limit);
            const total = (response as any).other?.pagination?.totalCount ?? approvedPhotos.length;

            console.log(transformedPhotos, 'transformedPhotos')
            return {
                photos: transformedPhotos,
                hasNext,
                total,
                page: pageParam
            };

        } catch (error) {
            console.error(`Error fetching page ${pageParam}:`, error);
            return {
                photos: [],
                hasNext: false,
                total: 0,
                page: pageParam
            };
        }
    };

    const infiniteQuery = useInfiniteQuery({
        queryKey,
        queryFn: fetchMediaPage,
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            return lastPage.hasNext ? lastPage.page + 1 : undefined;
        },
        enabled: enabled && !!shareToken,
        ...CACHE_CONFIG
    });

    // WebSocket handlers
    const webSocketHandlers = {
        handleMediaApproved: useCallback((payload: any) => {
            setBufferedChanges((prev) => [
                ...prev,
                { type: 'approved', photo: payload, reason: 'approval' }
            ]);
        }, []),
        handleMediaStatusUpdated: useCallback((payload: any) => {
            setBufferedChanges((prev) => [
                ...prev,
                { type: 'status_updated', photo: payload, reason: 'status_change' }
            ]);
        }, []),
        handleNewMediaUploaded: useCallback((payload: any) => {
            setBufferedChanges((prev) => [
                ...prev,
                { type: 'uploaded', photo: payload, reason: 'upload' }
            ]);
        }, []),
        handleMediaRemoved: useCallback((payload: any) => {
            setBufferedChanges((prev) => [
                ...prev,
                { type: 'removed', photo: payload, reason: 'removal' }
            ]);
        }, []),
        handleMediaProcessingComplete: useCallback((payload: any) => {
            setBufferedChanges((prev) => [
                ...prev,
                { type: 'processing_complete', photo: payload, reason: 'processing' }
            ]);
        }, [])
    };

    // Buffered changes utilities
    const bufferedCount = bufferedChanges.length;
    const applyBufferedChanges = useCallback(() => {
        infiniteQuery.refetch();
        setBufferedChanges([]);
    }, [infiniteQuery]);

    const clearBufferedChanges = useCallback(() => {
        setBufferedChanges([]);
    }, []);

    // Cleanup function
    const cleanup = useCallback(() => {
        setBufferedChanges([]);
    }, []);

    // Optimized photo flattening with memoization
    const allPhotos = useMemo(() => {
        if (!infiniteQuery.data?.pages?.length) return [];

        const seenIds = new Set<string>();
        return infiniteQuery.data.pages.reduce<any[]>((acc, page) => {
            const validPhotos = page.photos.filter((photo: any) => {
                if (seenIds.has(photo.id)) return false;
                seenIds.add(photo.id);
                return true;
            });
            return acc.concat(validPhotos);
        }, []);
    }, [infiniteQuery.data?.pages]);

    const totalPhotos = useMemo(() => {
        if (!infiniteQuery.data?.pages?.length) return 0;
        return Math.max(...infiniteQuery.data.pages.map(page => page.total));
    }, [infiniteQuery.data?.pages]);

    console.log(allPhotos, 'allPhotosallPhotosallPhotos')
    return {
        photos: allPhotos,
        totalPhotos,
        isInitialLoading: infiniteQuery.isLoading,
        isLoadingMore: infiniteQuery.isFetchingNextPage,
        hasNextPage: infiniteQuery.hasNextPage ?? false,
        isError: infiniteQuery.isError,
        error: infiniteQuery.error,
        loadMore: infiniteQuery.fetchNextPage,
        refresh: infiniteQuery.refetch,
        webSocketHandlers,
        cleanup,
        bufferedChanges,
        bufferedCount,
        applyBufferedChanges,
        clearBufferedChanges
    };
};