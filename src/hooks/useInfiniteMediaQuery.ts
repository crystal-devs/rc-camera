// hooks/useInfiniteMediaQuery.ts - COMPLETE OPTIMIZED VERSION
'use client';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';
import { getEventMediaWithGuestToken } from '@/services/apis/media.api';
import { MediaFetchOptions } from '@/types/events';

interface UseOptimizedInfiniteMediaQueryProps {
    shareToken: string;
    auth: string | null;
    limit?: number;
    enabled?: boolean;
}

interface TransformedPhoto {
    id: string;
    takenBy: string;
    imageUrl: string;
    thumbnail: string;
    createdAt: string;
    originalFilename: string;
    processingStatus: string;
    processingProgress: number;
    approval: {
        status: string;
    };
    processing: {
        status: string;
        thumbnails_generated: boolean;
        variants_generated: boolean;
    };
    progressiveUrls: {
        placeholder: string;
        thumbnail: string;
        display: string;
        full: string;
        original: string;
    };
    metadata: {
        width: number;
        height: number;
        fileName: string;
        fileType: string;
        fileSize: number;
    };
    stats: {
        views: number;
        downloads: number;
        shares: number;
        likes: number;
        comments_count: number;
    };
}

interface MediaPage {
    photos: TransformedPhoto[];
    hasNext: boolean;
    total: number;
    page: number;
}

interface ApiMediaItem {
    _id: string;
    type: 'image' | 'video';
    url: string;
    optimized_url?: string;
    has_variants: boolean;
    processing_status: 'completed' | 'processing' | 'failed';
    approval_status: 'approved' | 'pending' | 'rejected' | 'hidden' | 'auto_approved';
    size_mb: number;
    original_filename: string;
    format: string;
    uploader_type: string;
    uploader_display_name: string;
    dimensions: {
        width: number;
        height: number;
        aspect_ratio: number;
    };
    stats: {
        views: number;
        downloads: number;
        shares: number;
        likes: number;
        comments_count: number;
    };
    created_at: string;
    updated_at: string;
    responsive_urls: {
        thumbnail: string;
        medium: string;
        large: string;
        original: string;
        preferred: string;
    };
    available_variants: {
        small: { webp: boolean; jpeg: boolean };
        medium: { webp: boolean; jpeg: boolean };
        large: { webp: boolean; jpeg: boolean };
    };
    requested_optimized_url?: string;
    uploaded_by: string;
    guest_access: boolean;
}

interface MediaResponse {
    data: ApiMediaItem[];
    total?: number;
    hasMore?: boolean;
    nextCursor?: string;
    pagination?: {
        hasNext?: boolean;
        total?: number;
        totalCount?: number;
    };
    other?: {
        pagination?: {
            hasNext?: boolean;
            totalCount?: number;
        };
    };
}

const transformApiPhoto = (apiItem: ApiMediaItem | any): TransformedPhoto | null => {
    try {
        if (!apiItem) {
            return null;
        }

        // Get the item ID (handle both _id and id)
        const itemId = apiItem._id || apiItem.id;
        if (!itemId) {
            return null;
        }

        // Handle already transformed items or new API format
        const isNewFormat = !!apiItem._id || !!apiItem.responsive_urls;

        let thumbnailUrl, mediumUrl, largeUrl, originalUrl, preferredUrl;
        let width, height, fileSize, fileName, fileType, uploadedBy, createdAt, approvalStatus;

        if (isNewFormat) {
            // New API format
            thumbnailUrl = apiItem.responsive_urls?.thumbnail || apiItem.thumbnailUrl;
            mediumUrl = apiItem.responsive_urls?.medium || apiItem.mediumUrl;
            largeUrl = apiItem.responsive_urls?.large || apiItem.largeUrl;
            originalUrl = apiItem.responsive_urls?.original || apiItem.url || apiItem.originalUrl;
            preferredUrl = apiItem.responsive_urls?.preferred || apiItem.preferredUrl;

            width = apiItem.dimensions?.width || 1920;
            height = apiItem.dimensions?.height || 2400;
            fileSize = apiItem.size_mb || 0;
            fileName = apiItem.original_filename || 'unknown';
            fileType = apiItem.format || 'jpeg';
            uploadedBy = apiItem.uploader_display_name || apiItem.uploaded_by || 'Guest';
            createdAt = apiItem.created_at || new Date().toISOString();
            approvalStatus = apiItem.approval_status || 'approved';
        } else {
            // Already transformed format
            thumbnailUrl = apiItem.thumbnailUrl || apiItem.thumbnail;
            mediumUrl = apiItem.mediumUrl;
            largeUrl = apiItem.largeUrl;
            originalUrl = apiItem.originalUrl || apiItem.src;
            preferredUrl = apiItem.preferredUrl || apiItem.src;

            width = apiItem.dimensions?.width || apiItem.width || 1920;
            height = apiItem.dimensions?.height || apiItem.height || 2400;
            fileSize = apiItem.metadata?.fileSize || 0;
            fileName = apiItem.originalFilename || apiItem.metadata?.fileName || 'unknown';
            fileType = apiItem.metadata?.fileType || 'jpeg';
            uploadedBy = apiItem.uploaded_by || apiItem.takenBy || 'Guest';
            createdAt = apiItem.uploadedAt || apiItem.createdAt || new Date().toISOString();
            approvalStatus = apiItem.approval?.status || 'approved';
        }

        const transformed: TransformedPhoto = {
            id: itemId,
            takenBy: uploadedBy,
            imageUrl: preferredUrl || mediumUrl || originalUrl,
            thumbnail: thumbnailUrl || mediumUrl || originalUrl,
            createdAt: createdAt,
            originalFilename: fileName,
            processingStatus: apiItem.processing_status || apiItem.processingStatus || 'completed',
            processingProgress: 0,
            approval: {
                status: approvalStatus
            },
            processing: {
                status: apiItem.processing_status || apiItem.processingStatus || 'completed',
                thumbnails_generated: !!thumbnailUrl,
                variants_generated: !!(mediumUrl && largeUrl)
            },
            progressiveUrls: {
                placeholder: thumbnailUrl || mediumUrl || originalUrl,
                thumbnail: thumbnailUrl || mediumUrl || originalUrl,
                display: mediumUrl || originalUrl,
                full: largeUrl || originalUrl,
                original: originalUrl
            },
            metadata: {
                width: width,
                height: height,
                fileName: fileName,
                fileType: fileType,
                fileSize: fileSize
            },
            stats: apiItem.stats || {
                views: 0,
                downloads: 0,
                shares: 0,
                likes: 0,
                comments_count: 0
            }
        };

        return transformed;
    } catch (error) {
        console.error('Error transforming API photo:', error);
        return null;
    }
};

function getPaginationInfo(response: MediaResponse, limit: number, approvedCount: number): { hasNext: boolean; total: number } {
    let hasNext = false;
    let total = 0;

    // Priority 1: Check response.pagination
    if (response.pagination) {
        hasNext = Boolean(response.pagination.hasNext);
        total = response.pagination.totalCount || response.pagination.total || 0;
        return { hasNext, total };
    }

    // Priority 2: Check response.other.pagination  
    if (response.other?.pagination) {
        hasNext = Boolean(response.other.pagination.hasNext);
        total = response.other.pagination.totalCount || 0;
        return { hasNext, total };
    }

    // Priority 3: Use top-level fields
    if (response.hasMore !== undefined) {
        hasNext = Boolean(response.hasMore);
        total = response.total || 0;
        return { hasNext, total };
    }

    // Fallback: Estimate based on returned data length
    hasNext = (response.data?.length || 0) === limit;
    total = approvedCount;

    return { hasNext, total };
}

export const useInfiniteMediaQuery = ({
    shareToken,
    auth,
    limit = 20,
    enabled = true
}: UseOptimizedInfiniteMediaQueryProps) => {
    const queryClient = useQueryClient();
    const queryKey = ['guest-media', shareToken];
    
    // INDUSTRY STANDARD: Debouncing refs for WebSocket events
    const invalidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingEventsRef = useRef<Set<string>>(new Set());

    // Fetch function
    const fetchMediaPage = useCallback(async ({ pageParam = 1 }): Promise<MediaPage> => {
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

            console.log(response, 'responseresponse')
            if (!response?.data || !Array.isArray(response.data)) {
                return {
                    photos: [],
                    hasNext: false,
                    total: 0,
                    page: pageParam
                };
            }

            // Transform photos using the local transform function with error handling
            const transformedPhotos = response.data.reduce<TransformedPhoto[]>((acc, item, index) => {
                try {
                    const transformedPhoto = transformApiPhoto(item);
                    if (transformedPhoto) {
                        acc.push(transformedPhoto);
                    }
                    return acc;
                } catch (error) {
                    console.error(`Failed to transform photo at index ${index}:`, error);
                    return acc;
                }
            }, []);

            // For guests: Filter only approved photos
            const approvedPhotos = transformedPhotos.filter(photo => {
                if (!photo.approval) {
                    return true;
                }
                return photo.approval.status === 'approved' || photo.approval.status === 'auto_approved';
            });

            // Determine pagination with priority fallback system
            const paginationInfo = getPaginationInfo(response as any, limit, approvedPhotos.length);

            const result: MediaPage = {
                photos: approvedPhotos,
                hasNext: paginationInfo.hasNext,
                total: paginationInfo.total,
                page: pageParam
            };

            return result;

        } catch (error) {
            console.error(`Error fetching page ${pageParam}:`, error);

            // Return empty page on error
            return {
                photos: [],
                hasNext: false,
                total: 0,
                page: pageParam
            };
        }
    }, [shareToken, auth, limit]);

    // INDUSTRY STANDARD: Query with optimized WebSocket configuration
    const infiniteQuery = useInfiniteQuery({
        queryKey,
        queryFn: fetchMediaPage,
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            return lastPage.hasNext ? lastPage.page + 1 : undefined;
        },
        enabled: enabled && !!shareToken,
        // INDUSTRY STANDARD: Optimized for real-time updates
        staleTime: 0, // Always consider stale for real-time data
        gcTime: 5 * 60 * 1000, // 5 minutes cache
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        refetchOnReconnect: true,
        networkMode: 'online',
        retry: 2,
    });

    // INDUSTRY STANDARD: Debounced invalidation to prevent duplicate API calls
    const debouncedInvalidate = useCallback((eventType: string, mediaId?: string) => {
        // Track the event
        const eventKey = mediaId ? `${eventType}:${mediaId}` : eventType;
        pendingEventsRef.current.add(eventKey);

        // Clear existing timeout
        if (invalidationTimeoutRef.current) {
            clearTimeout(invalidationTimeoutRef.current);
        }

        // Set new timeout - 200ms is industry standard for UI responsiveness
        invalidationTimeoutRef.current = setTimeout(() => {
            const eventCount = pendingEventsRef.current.size;
            console.log(`🔄 Invalidating media queries for ${eventCount} pending events:`, Array.from(pendingEventsRef.current));
            
            // Clear pending events
            pendingEventsRef.current.clear();
            
            // Single invalidation for all pending events
            queryClient.invalidateQueries({
                queryKey: ['guest-media', shareToken],
                exact: false,
                refetchType: 'active'
            });
        }, 200);
    }, [queryClient, shareToken]);

    // INDUSTRY STANDARD: Optimistic updates for immediate UI feedback
    const handleOptimisticUpdate = useCallback((mediaId: string, updates: Partial<TransformedPhoto>) => {
        queryClient.setQueryData(queryKey, (oldData: any) => {
            if (!oldData?.pages) return oldData;

            return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                    ...page,
                    photos: page.photos.map((photo: TransformedPhoto) =>
                        photo.id === mediaId ? { ...photo, ...updates } : photo
                    )
                }))
            };
        });
    }, [queryClient, queryKey]);

    // INDUSTRY STANDARD: Optimistic removal for immediate UI feedback
    const handleOptimisticRemoval = useCallback((mediaIds: string[]) => {
        queryClient.setQueryData(queryKey, (oldData: any) => {
            if (!oldData?.pages) return oldData;

            return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                    ...page,
                    photos: page.photos.filter((photo: TransformedPhoto) => 
                        !mediaIds.includes(photo.id)
                    )
                }))
            };
        });
    }, [queryClient, queryKey]);

    // Individual handler callbacks - FIXED: Moved outside of useMemo to maintain hook order
    const handleMediaStatusUpdated = useCallback((payload: any) => {
        console.log('📝 Media status updated:', payload.mediaId, payload.previousStatus, '→', payload.newStatus);
        
        // OPTIMISTIC UPDATE: Handle visibility changes immediately
        if (payload.mediaId) {
            if (payload.newStatus === 'hidden' || payload.newStatus === 'rejected') {
                // Remove from UI immediately
                handleOptimisticRemoval([payload.mediaId]);
            } else if (payload.newStatus === 'approved' && payload.previousStatus !== 'approved') {
                // Don't add optimistically - let refetch handle it properly since we need full data
                // Just mark this event for potential deduplication
                pendingEventsRef.current.add(`approval:${payload.mediaId}`);
            }
        }

        // Debounced refetch for data consistency
        debouncedInvalidate('status_update', payload.mediaId);
    }, [debouncedInvalidate, handleOptimisticRemoval]);

    const handleMediaApproved = useCallback((payload: any) => {
        // Check if we already handled this as a status update
        const approvalKey = `approval:${payload.mediaId}`;
        if (pendingEventsRef.current.has(approvalKey)) {
            console.log('⏭️ Skipping duplicate approval event for:', payload.mediaId, '(already handled by status update)');
            return;
        }
        
        console.log('✅ Media approved:', payload.mediaId);
        debouncedInvalidate('approved', payload.mediaId);
    }, [debouncedInvalidate]);

    const handleNewMediaUploaded = useCallback((payload: any) => {
        console.log('📸 New media uploaded');
        // Always refetch for new uploads since we need complete data
        debouncedInvalidate('new_upload');
    }, [debouncedInvalidate]);

    const handleMediaRemoved = useCallback((payload: any) => {
        console.log('🗑️ Media removed');
        
        // Get media IDs to remove
        const mediaIds = payload.mediaIds || (payload.mediaId ? [payload.mediaId] : []);
        
        if (mediaIds.length > 0) {
            // Remove from UI immediately
            handleOptimisticRemoval(mediaIds);
        }

        // Debounced refetch for count accuracy
        debouncedInvalidate('removed');
    }, [debouncedInvalidate, handleOptimisticRemoval]);

    const handleMediaProcessingComplete = useCallback((payload: any) => {
        console.log('⚡ Processing complete:', payload.mediaId);
        
        // OPTIMISTIC UPDATE: Update processing status immediately
        if (payload.mediaId) {
            handleOptimisticUpdate(payload.mediaId, {
                processingStatus: 'completed',
                processing: {
                    status: 'completed',
                    thumbnails_generated: true,
                    variants_generated: true
                }
            });
        }

        // Light debounce for processing updates
        debouncedInvalidate('processing', payload.mediaId);
    }, [debouncedInvalidate, handleOptimisticUpdate]);

    // WebSocket event handlers object - FIXED: Simple object creation, no nested callbacks
    const webSocketHandlers = useMemo(() => ({
        handleMediaStatusUpdated,
        handleMediaApproved,
        handleNewMediaUploaded,
        handleMediaRemoved,
        handleMediaProcessingComplete,
    }), [
        handleMediaStatusUpdated,
        handleMediaApproved,
        handleNewMediaUploaded,
        handleMediaRemoved,
        handleMediaProcessingComplete
    ]);

    // Optimized photo flattening with memoization
    const allPhotos = useMemo(() => {
        if (!infiniteQuery.data?.pages?.length) return [];

        const seenIds = new Set<string>();
        return infiniteQuery.data.pages.reduce<TransformedPhoto[]>((acc, page) => {
            const validPhotos = page.photos.filter(photo => {
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

    // Cleanup function
    const cleanup = useCallback(() => {
        if (invalidationTimeoutRef.current) {
            clearTimeout(invalidationTimeoutRef.current);
            invalidationTimeoutRef.current = null;
        }
        pendingEventsRef.current.clear();
        console.log('🧹 WebSocket query cleanup completed');
    }, []);

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
    };
};