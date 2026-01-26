/**
 * Query cache utility functions for PhotoGallery
 * Centralizes TanStack Query cache manipulation logic
 */

import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Photo } from '@/types/PhotoGallery.types';

type MediaStatus = 'approved' | 'pending' | 'rejected' | 'hidden' | 'auto_approved';
type QualityLevel = 'small' | 'medium' | 'large' | 'original';

const QUALITY_LEVELS: QualityLevel[] = ['small', 'medium', 'large', 'original'];

/**
 * Updates photo cache after successful upload
 * Distributes photos to appropriate status caches based on approval status
 */
export function updatePhotoCacheAfterUpload(
    queryClient: QueryClient,
    eventId: string,
    photos: Photo[]
): void {
    // Group photos by their approval status
    const approvedPhotos = photos.filter(
        (p) => p.approval?.status === 'approved' || p.approval?.status === 'auto_approved'
    );
    const pendingPhotos = photos.filter((p) => p.approval?.status === 'pending');

    // Update approved cache
    if (approvedPhotos.length > 0) {
        updateStatusCache(queryClient, eventId, 'approved', approvedPhotos, 'prepend');
    }

    // Update pending cache
    if (pendingPhotos.length > 0) {
        updateStatusCache(queryClient, eventId, 'pending', pendingPhotos, 'prepend');
    }
}

/**
 * Updates cache for a specific status with new photos
 */
function updateStatusCache(
    queryClient: QueryClient,
    eventId: string,
    status: MediaStatus,
    photos: Photo[],
    position: 'prepend' | 'append' = 'prepend'
): void {
    QUALITY_LEVELS.forEach((quality) => {
        // Update infinite query cache
        const infiniteCacheKey = [...queryKeys.eventPhotos(eventId, status), 'infinite', quality];
        queryClient.setQueryData(infiniteCacheKey, (oldData: any) => {
            if (!oldData?.pages) {
                return {
                    pages: [{ photos, nextPage: undefined, hasMore: false }],
                    pageParams: [1],
                };
            }

            const firstPage = oldData.pages[0] || { photos: [] };
            const newPhotos = position === 'prepend'
                ? [...photos, ...(firstPage.photos || [])]
                : [...(firstPage.photos || []), ...photos];

            return {
                ...oldData,
                pages: [{ ...firstPage, photos: newPhotos }, ...oldData.pages.slice(1)],
            };
        });

        // Update regular query cache
        const regularCacheKey = [...queryKeys.eventPhotos(eventId, status), quality];
        queryClient.setQueryData(regularCacheKey, (oldData: any) => {
            if (!oldData) return photos;
            return position === 'prepend' ? [...photos, ...oldData] : [...oldData, ...photos];
        });
    });
}

/**
 * Removes photos from cache for a specific status
 */
export function removePhotosFromCache(
    queryClient: QueryClient,
    eventId: string,
    photoIds: string[],
    status: MediaStatus
): void {
    QUALITY_LEVELS.forEach((quality) => {
        // Update infinite query cache
        const infiniteCacheKey = [...queryKeys.eventPhotos(eventId, status), 'infinite', quality];
        queryClient.setQueryData(infiniteCacheKey, (oldData: any) => {
            if (!oldData?.pages) return oldData;
            return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                    ...page,
                    photos: page.photos.filter((p: any) => !photoIds.includes(p.id)),
                })),
            };
        });

        // Update regular query cache
        const regularCacheKey = [...queryKeys.eventPhotos(eventId, status), quality];
        queryClient.setQueryData(regularCacheKey, (oldData: any) => {
            if (!oldData) return oldData;
            return oldData.filter((p: any) => !photoIds.includes(p.id));
        });
    });
}

/**
 * Moves photos between status caches (e.g., from pending to approved)
 */
export function movePhotosBetweenCaches(
    queryClient: QueryClient,
    eventId: string,
    photoIds: string[],
    fromStatus: MediaStatus,
    toStatus: MediaStatus
): void {
    // Remove from old status
    removePhotosFromCache(queryClient, eventId, photoIds, fromStatus);

    // Invalidate new status to refetch
    QUALITY_LEVELS.forEach((quality) => {
        queryClient.invalidateQueries({
            queryKey: [...queryKeys.eventPhotos(eventId, toStatus), 'infinite', quality],
            exact: false,
            refetchType: 'all',
        });

        queryClient.invalidateQueries({
            queryKey: [...queryKeys.eventPhotos(eventId, toStatus), quality],
            exact: false,
            refetchType: 'all',
        });
    });
}

/**
 * Invalidates all photo caches for an event
 */
export function invalidateAllPhotoCaches(
    queryClient: QueryClient,
    eventId: string
): Promise<void> {
    return queryClient.invalidateQueries({
        queryKey: queryKeys.eventPhotos(eventId),
        exact: false,
        refetchType: 'all',
    });
}

/**
 * Invalidates media counts cache
 */
export function invalidateMediaCounts(
    queryClient: QueryClient,
    eventId: string
): Promise<void> {
    return queryClient.invalidateQueries({
        queryKey: queryKeys.eventCounts(eventId),
        exact: false,
        refetchType: 'all',
    });
}
