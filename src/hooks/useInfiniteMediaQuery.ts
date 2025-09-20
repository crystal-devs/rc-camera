// hooks/useInfiniteMediaQuery.ts - UPDATED with buffering logic
'use client';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';
import { getEventMediaWithGuestToken } from '@/services/apis/media.api';
import { MediaFetchOptions } from '@/types/events';

interface UseOptimizedInfiniteMediaQueryProps {
    shareToken: string;
    auth: string | null;
    limit?: number;
    enabled?: boolean;
    onViewportStateChange?: (state: ViewportInfo) => void; // NEW: Callback for viewport changes
}

interface ViewportInfo {
    visibleStartIndex: number;
    visibleEndIndex: number;
    bufferStartIndex: number;
    bufferEndIndex: number;
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

// NEW: Buffered change structure
interface BufferedChange {
    id: string;
    type: 'approval' | 'new_upload';
    photo: TransformedPhoto;
    timestamp: number;
    reason: string;
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
    enabled = true,
    onViewportStateChange
}: UseOptimizedInfiniteMediaQueryProps) => {
    const queryClient = useQueryClient();
    const queryKey = ['guest-media', shareToken];
    
    // INDUSTRY STANDARD: Debouncing refs for WebSocket events
    const invalidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingEventsRef = useRef<Set<string>>(new Set());

    // NEW: Buffering state for real-time changes
    const [bufferedChanges, setBufferedChanges] = useState<BufferedChange[]>([]);
    const [viewportInfo, setViewportInfo] = useState<ViewportInfo>({
        visibleStartIndex: 0,
        visibleEndIndex: 0,
        bufferStartIndex: 0,
        bufferEndIndex: 20
    });

    // NEW: Update viewport info and notify parent
    const updateViewportInfo = useCallback((newInfo: Partial<ViewportInfo>) => {
        setViewportInfo(prev => {
            const updated = { ...prev, ...newInfo };
            onViewportStateChange?.(updated);
            return updated;
        });
    }, [onViewportStateChange]);

    // NEW: Check if index is within buffer zone (visible + 20 items)
    const isWithinBufferZone = useCallback((targetIndex: number): boolean => {
        return targetIndex >= viewportInfo.bufferStartIndex && 
               targetIndex <= viewportInfo.bufferEndIndex;
    }, [viewportInfo]);

    // NEW: Find the index where a new photo should be inserted
    const findInsertionIndex = useCallback((newPhoto: TransformedPhoto, allPhotos: TransformedPhoto[]): number => {
        // Insert by timestamp (newest first)
        const newTimestamp = new Date(newPhoto.createdAt).getTime();
        
        for (let i = 0; i < allPhotos.length; i++) {
            const photoTimestamp = new Date(allPhotos[i].createdAt).getTime();
            if (newTimestamp > photoTimestamp) {
                return i;
            }
        }
        
        return allPhotos.length; // Insert at end if oldest
    }, []);

    // NEW: Apply buffered changes to the photo list
    const applyBufferedChanges = useCallback(() => {
        if (bufferedChanges.length === 0) return;

        console.log(`📋 Applying ${bufferedChanges.length} buffered changes`);
        
        queryClient.setQueryData(queryKey, (oldData: any) => {
            if (!oldData?.pages) return oldData;

            let updatedPages = [...oldData.pages];
            
            bufferedChanges.forEach(change => {
                if (change.type === 'approval' || change.type === 'new_upload') {
                    // Find all photos across pages
                    const allPhotos = updatedPages.flatMap(page => page.photos);
                    
                    // Check if photo already exists (avoid duplicates)
                    const existingIndex = allPhotos.findIndex(p => p.id === change.photo.id);
                    if (existingIndex !== -1) {
                        console.log(`⚠️ Photo ${change.photo.id} already exists, skipping`);
                        return;
                    }
                    
                    // Find insertion point
                    const insertionIndex = findInsertionIndex(change.photo, allPhotos);
                    
                    // Insert the photo at the correct position
                    const itemsPerPage = limit;
                    const targetPageIndex = Math.floor(insertionIndex / itemsPerPage);
                    const positionInPage = insertionIndex % itemsPerPage;
                    
                    if (targetPageIndex < updatedPages.length) {
                        // Insert in existing page
                        const updatedPage = { ...updatedPages[targetPageIndex] };
                        updatedPage.photos = [...updatedPage.photos];
                        updatedPage.photos.splice(positionInPage, 0, change.photo);
                        updatedPage.total += 1;
                        updatedPages[targetPageIndex] = updatedPage;
                    } else {
                        // Create new page if needed
                        const newPage = {
                            photos: [change.photo],
                            hasNext: false,
                            total: allPhotos.length + 1,
                            page: targetPageIndex + 1
                        };
                        updatedPages.push(newPage);
                    }
                }
            });

            return { ...oldData, pages: updatedPages };
        });

        // Clear buffered changes
        setBufferedChanges([]);
    }, [bufferedChanges, queryClient, queryKey, limit, findInsertionIndex]);

    // NEW: Clear specific buffered changes
    const clearBufferedChanges = useCallback(() => {
        setBufferedChanges([]);
    }, []);

    // Fetch function (unchanged)
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

    // UPDATED: Smart insertion with buffering logic
    const handleSmartInsertion = useCallback((newPhoto: TransformedPhoto, reason: string) => {
        const allPhotos = infiniteQuery.data?.pages.flatMap(page => page.photos) || [];
        const insertionIndex = findInsertionIndex(newPhoto, allPhotos);
        
        // Check if insertion point is within buffer zone
        if (isWithinBufferZone(insertionIndex)) {
            console.log(`📸 Inserting photo immediately at index ${insertionIndex} (within buffer zone)`);
            
            // Insert immediately
            queryClient.setQueryData(queryKey, (oldData: any) => {
                if (!oldData?.pages) return oldData;

                const allPhotos = oldData.pages.flatMap((page: any) => page.photos);
                const targetIndex = findInsertionIndex(newPhoto, allPhotos);
                
                // Insert at correct position
                const itemsPerPage = limit;
                const targetPageIndex = Math.floor(targetIndex / itemsPerPage);
                const positionInPage = targetIndex % itemsPerPage;
                
                const updatedPages = [...oldData.pages];
                
                if (targetPageIndex < updatedPages.length) {
                    const updatedPage = { ...updatedPages[targetPageIndex] };
                    updatedPage.photos = [...updatedPage.photos];
                    updatedPage.photos.splice(positionInPage, 0, newPhoto);
                    updatedPage.total += 1;
                    updatedPages[targetPageIndex] = updatedPage;
                }
                
                return { ...oldData, pages: updatedPages };
            });
        } else {
            console.log(`📋 Buffering photo at index ${insertionIndex} (outside buffer zone)`);
            
            // Buffer the change
            setBufferedChanges(prev => {
                // Avoid duplicates
                if (prev.some(change => change.photo.id === newPhoto.id)) {
                    return prev;
                }
                
                return [...prev, {
                    id: newPhoto.id,
                    type: reason.includes('upload') ? 'new_upload' : 'approval',
                    photo: newPhoto,
                    timestamp: Date.now(),
                    reason
                }];
            });
        }
    }, [infiniteQuery.data?.pages, isWithinBufferZone, findInsertionIndex, queryClient, queryKey, limit]);

    // Individual handler callbacks - UPDATED with buffering logic
    const handleMediaStatusUpdated = useCallback((payload: any) => {
        console.log('📝 Media status updated:', payload.mediaId, payload.previousStatus, '→', payload.newStatus);
        
        // OPTIMISTIC UPDATE: Handle visibility changes immediately
        if (payload.mediaId) {
            if (payload.newStatus === 'hidden' || payload.newStatus === 'rejected') {
                // Remove from UI immediately
                handleOptimisticRemoval([payload.mediaId]);
            } else if (payload.newStatus === 'approved' && payload.previousStatus !== 'approved') {
                // EDGE CASE SOLUTION: If previously hidden and now approved, use smart insertion
                if (payload.previousStatus === 'hidden' || payload.previousStatus === 'rejected') {
                    // For hide→approve scenario, we need the full photo data
                    // Mark for potential smart insertion, but we need full photo data from refetch
                    pendingEventsRef.current.add(`smart_approval:${payload.mediaId}`);
                    debouncedInvalidate('status_update_approval', payload.mediaId);
                } else {
                    // Regular approval, mark for deduplication
                    pendingEventsRef.current.add(`approval:${payload.mediaId}`);
                    debouncedInvalidate('status_update', payload.mediaId);
                }
            } else {
                // Other status changes
                debouncedInvalidate('status_update', payload.mediaId);
            }
        }
    }, [handleOptimisticRemoval, debouncedInvalidate]);

    const handleMediaApproved = useCallback((payload: any) => {
        // Check if we already handled this as a status update
        const approvalKey = `approval:${payload.mediaId}`;
        const smartApprovalKey = `smart_approval:${payload.mediaId}`;
        
        if (pendingEventsRef.current.has(approvalKey)) {
            console.log('⏭️ Skipping duplicate approval event for:', payload.mediaId, '(already handled by status update)');
            return;
        }
        
        if (pendingEventsRef.current.has(smartApprovalKey)) {
            console.log('⚡ Processing smart approval for:', payload.mediaId, '(hide→approve scenario)');
            
            // For hide→approve, we have full photo data in the payload
            if (payload.mediaData) {
                const transformedPhoto = transformApiPhoto(payload.mediaData);
                if (transformedPhoto) {
                    handleSmartInsertion(transformedPhoto, 'hide_then_approve');
                }
            } else {
                // Fallback to refetch if no media data
                debouncedInvalidate('smart_approval', payload.mediaId);
            }
            return;
        }
        
        console.log('✅ Media approved:', payload.mediaId);
        
        // NEW: Use smart insertion for new approvals
        if (payload.mediaData) {
            const transformedPhoto = transformApiPhoto(payload.mediaData);
            if (transformedPhoto) {
                handleSmartInsertion(transformedPhoto, 'approval');
            }
        } else {
            // Fallback to refetch if no media data
            debouncedInvalidate('approved', payload.mediaId);
        }
    }, [debouncedInvalidate, handleSmartInsertion]);

    const handleNewMediaUploaded = useCallback((payload: any) => {
        console.log('📸 New media uploaded');
        
        // NEW: Use smart insertion for new uploads
        if (payload.media || payload.mediaData) {
            const mediaData = payload.media || payload.mediaData;
            const transformedPhoto = transformApiPhoto(mediaData);
            if (transformedPhoto) {
                handleSmartInsertion(transformedPhoto, 'new_upload');
            }
        } else {
            // Fallback to refetch if no media data
            debouncedInvalidate('new_upload');
        }
    }, [handleSmartInsertion, debouncedInvalidate]);

    const handleMediaRemoved = useCallback((payload: any) => {
        console.log('🗑️ Media removed');
        
        // Get media IDs to remove
        const mediaIds = payload.mediaIds || (payload.mediaId ? [payload.mediaId] : []);
        
        if (mediaIds.length > 0) {
            // Remove from UI immediately (always immediate for removals)
            handleOptimisticRemoval(mediaIds);
            
            // Also remove from buffered changes if present
            setBufferedChanges(prev => 
                prev.filter(change => !mediaIds.includes(change.photo.id))
            );
        }

        // Debounced refetch for count accuracy
        debouncedInvalidate('removed');
    }, [handleOptimisticRemoval, debouncedInvalidate]);

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

    // WebSocket event handlers object
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
        setBufferedChanges([]);
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
        // NEW: Buffering functionality
        bufferedChanges,
        bufferedCount: bufferedChanges.length,
        applyBufferedChanges,
        clearBufferedChanges,
        updateViewportInfo, // For external viewport tracking
        viewportInfo
    };
};