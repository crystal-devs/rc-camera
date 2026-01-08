/**
 * useBulkPhotoOperations - Bulk operations for photos
 * Handles approve, reject, hide, delete, and download operations
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { bulkDeleteMedia, bulkUpdateMediaStatus } from '@/services/apis/media.api';
import { useAuthToken } from '@/hooks/use-auth';
import { Photo } from '@/types/PhotoGallery.types';
import { UserPermissions } from '../utils/permissionUtils';
import { removePhotosFromCache, invalidateMediaCounts } from '../utils/cacheUtils';
import { queryKeys } from '@/lib/queryKeys';

type MediaStatus = 'approved' | 'pending' | 'rejected' | 'hidden';

interface UseBulkPhotoOperationsProps {
    eventId: string;
    permissions: UserPermissions;
    onSuccess?: () => void;
}

export function useBulkPhotoOperations({
    eventId,
    permissions,
    onSuccess,
}: UseBulkPhotoOperationsProps) {
    const queryClient = useQueryClient();
    const token = useAuthToken();

    // Bulk status update mutation
    const bulkStatusMutation = useMutation({
        mutationFn: async (params: {
            mediaIds: string[];
            status: MediaStatus;
            reason?: string;
        }) => {
            if (!token) throw new Error('Authentication required');
            return await bulkUpdateMediaStatus(eventId, params.mediaIds, params.status, token, {
                reason: params.reason,
                hideReason: params.status === 'hidden' ? params.reason : undefined,
            });
        },
        onSuccess: (result: any, variables) => {
            const { updatedMediaIds, newStatus } = result.data || {};

            if (updatedMediaIds && newStatus) {
                const allStatuses: MediaStatus[] = ['approved', 'pending', 'rejected', 'hidden'];
                const qualities = ['small', 'medium', 'large', 'original'];

                // Remove from all old status caches
                for (const oldStatus of allStatuses) {
                    if (oldStatus === newStatus) continue;
                    removePhotosFromCache(queryClient, eventId, updatedMediaIds, oldStatus);
                }

                // Invalidate new status cache to refetch
                for (const quality of qualities) {
                    queryClient.invalidateQueries({
                        queryKey: [...queryKeys.eventPhotos(eventId, newStatus), 'infinite', quality],
                        exact: false,
                        refetchType: 'all',
                    });

                    queryClient.invalidateQueries({
                        queryKey: [...queryKeys.eventPhotos(eventId, newStatus), quality],
                        exact: false,
                        refetchType: 'all',
                    });
                }

                invalidateMediaCounts(queryClient, eventId);
            }

            toast.success(
                `Successfully updated ${result.data?.modifiedCount || variables.mediaIds.length} media items to ${variables.status}`
            );
            onSuccess?.();
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update media status');
        },
    });

    // Bulk delete mutation
    const bulkDeleteMutation = useMutation({
        mutationFn: async (mediaIds: string[]) => {
            if (!token) throw new Error('Authentication required');
            return await bulkDeleteMedia(eventId, mediaIds, token);
        },
        onSuccess: (result, mediaIds) => {
            if (result.deleted > 0) {
                // Remove from all caches
                const allStatuses: MediaStatus[] = ['approved', 'pending', 'rejected', 'hidden'];
                for (const status of allStatuses) {
                    removePhotosFromCache(queryClient, eventId, mediaIds, status);
                }

                invalidateMediaCounts(queryClient, eventId);
                toast.success(`Successfully deleted ${result.deleted} photo${result.deleted > 1 ? 's' : ''}`);
                onSuccess?.();
            }

            if (result.failed > 0) {
                toast.error(`Failed to delete ${result.failed} photo${result.failed > 1 ? 's' : ''}`);
            }
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to delete photos');
        },
    });

    // Bulk status update handler
    const handleBulkStatusUpdate = useCallback(
        async (selectedPhotos: Set<string>, status: MediaStatus, reason?: string) => {
            if (!permissions.moderate) {
                toast.error("You don't have permission to moderate photos.");
                return;
            }

            if (selectedPhotos.size === 0) {
                toast.error('No photos selected.');
                return;
            }

            if (selectedPhotos.size > 100) {
                toast.error('Cannot update more than 100 photos at once.');
                return;
            }

            await bulkStatusMutation.mutateAsync({
                mediaIds: Array.from(selectedPhotos),
                status,
                reason,
            });
        },
        [permissions.moderate, bulkStatusMutation]
    );

    // Bulk delete handler
    const handleBulkDelete = useCallback(
        async (selectedPhotos: Set<string>) => {
            if (!permissions.delete) {
                toast.error("You don't have permission to delete photos.");
                return;
            }

            if (selectedPhotos.size === 0) {
                toast.error('No photos selected.');
                return;
            }

            const confirmed = confirm(
                `Delete ${selectedPhotos.size} photo${selectedPhotos.size > 1 ? 's' : ''} permanently?`
            );
            if (!confirmed) return;

            await bulkDeleteMutation.mutateAsync(Array.from(selectedPhotos));
        },
        [permissions.delete, bulkDeleteMutation]
    );

    // Bulk download handler
    const handleBulkDownload = useCallback(
        async (selectedPhotos: Set<string>, photos: Photo[]) => {
            if (!permissions.download) {
                toast.error("You don't have permission to download photos.");
                return;
            }

            if (selectedPhotos.size === 0) {
                toast.error('No photos selected.');
                return;
            }

            try {
                const selectedPhotosData = photos.filter((photo) => selectedPhotos.has(photo.id));
                const downloadPromises = selectedPhotosData.map(async (photo) => {
                    const originalUrl = photo.image_variants?.original?.url || photo.imageUrl;
                    const response = await fetch(originalUrl);
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `photo-${photo.id}.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                });

                await Promise.all(downloadPromises);
                toast.success(`Downloaded ${selectedPhotos.size} photo${selectedPhotos.size > 1 ? 's' : ''}`);
            } catch (error) {
                console.error('Bulk download failed:', error);
                toast.error('Failed to download some photos');
            }
        },
        [permissions.download]
    );

    return {
        handleBulkStatusUpdate,
        handleBulkDelete,
        handleBulkDownload,
        isUpdating: bulkStatusMutation.isPending || bulkDeleteMutation.isPending,
    };
}
