// hooks/useMediaQueries.ts - IMPROVED Final Version

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
  getEventMedia,           // Returns MediaItem[]
  getAlbumMedia,
  uploadAlbumMedia,
  updateMediaStatus,
  bulkUpdateMediaStatus,
  deleteMedia,
  getEventMediaCounts,
  transformMediaToPhoto,
  MediaApiResponse,
  MediaItem,
  getEventMediaWithPagination,
  uploadMultipleMedia
} from '@/services/apis/media.api';
import { useAuthToken } from '@/hooks/use-auth';
import { queryKeys } from '@/lib/queryKeys';
import { Photo } from '@/types/PhotoGallery.types';

// Simplified media fetch options
interface MediaFetchOptions {
  status?: 'approved' | 'pending' | 'rejected' | 'hidden' | 'auto_approved';
  limit?: number;
  quality?: 'thumbnail' | 'display' | 'full';
  enabled?: boolean;
}

/**
 * IMPROVED: Regular query for event media with better cache management
 */
export function useEventMedia(eventId: string, options: MediaFetchOptions = {}) {
  const token = useAuthToken();
  const {
    status = 'approved',
    limit = 50,
    quality = 'display',
    enabled = true
  } = options;

  return useQuery({
    queryKey: queryKeys.eventPhotos(eventId, status),
    queryFn: async (): Promise<Photo[]> => {
      if (!token) throw new Error('Authentication required');

      console.log('🔍 useEventMedia: Fetching regular photos', { eventId, status, limit });

      // Use the simple version that returns MediaItem[]
      const mediaItems = await getEventMedia(eventId, token, {
        status,
        limit,
        quality,
        scrollType: 'pagination'
      });

      console.log('✅ useEventMedia: Received media items', { count: mediaItems.length });

      return mediaItems.map(transformMediaToPhoto);
    },
    enabled: enabled && !!token && !!eventId,
    staleTime: 2 * 60 * 1000, // Reduced to 2 minutes for more real-time updates
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: true, // Enable refetch on focus for better cross-tab sync
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnReconnect: true,
    retry: 2,
    // Add network mode for better offline handling
    networkMode: 'online'
  });
}

/**
 * IMPROVED: Infinite query for event media with better pagination
 */
export function useInfiniteEventMedia(eventId: string, options: MediaFetchOptions = {}) {
  const token = useAuthToken();
  const {
    status = 'approved',
    limit = 20,
    quality = 'display',
    enabled = true
  } = options;

  return useInfiniteQuery({
    queryKey: [...queryKeys.eventPhotos(eventId, status), 'infinite'],
    queryFn: async ({ pageParam = 1 }): Promise<{
      photos: Photo[];
      nextPage?: number;
      hasMore: boolean;
    }> => {
      if (!token) throw new Error('Authentication required');

      console.log(`🔍 useInfiniteEventMedia: Fetching page ${pageParam} for status ${status}`);

      // Use the full API response version
      const response = await getEventMediaWithPagination(eventId, token, {
        status,
        limit,
        quality,
        page: pageParam,
        scrollType: 'infinite'
      });

      const photos = (response.data || []).map(transformMediaToPhoto);

      console.log(`✅ useInfiniteEventMedia result:`, {
        page: pageParam,
        photosCount: photos.length,
        hasNext: response.pagination?.hasNext || false,
        totalPages: response.pagination?.totalPages || 0
      });

      return {
        photos,
        nextPage: response.pagination?.hasNext ? pageParam + 1 : undefined,
        hasMore: response.pagination?.hasNext || false
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.nextPage;
    },
    enabled: enabled && !!token && !!eventId,
    staleTime: 2 * 60 * 1000, // Reduced for real-time updates
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    retry: 2,
    networkMode: 'online',
    meta: {
      errorMessage: 'Failed to load more photos'
    }
  });
}

/**
 * Helper to get all photos from infinite query
 */
export function useInfiniteEventMediaFlat(eventId: string, options: MediaFetchOptions = {}) {
  const infiniteQuery = useInfiniteEventMedia(eventId, options);

  const photos = infiniteQuery.data?.pages.flatMap(page => page.photos) || [];

  return {
    ...infiniteQuery,
    photos,
    totalPhotos: photos.length
  };
}

/**
 * IMPROVED: Media counts with better cache strategy
 */
export function useEventMediaCounts(eventId: string, enabled = true) {
  const token = useAuthToken();

  return useQuery({
    queryKey: queryKeys.eventCounts(eventId),
    queryFn: async () => {
      if (!token) throw new Error('Authentication required');
      console.log('🔍 Fetching media counts for event:', eventId);
      return await getEventMediaCounts(eventId, token);
    },
    enabled: enabled && !!token && !!eventId,
    staleTime: 1 * 60 * 1000, // 1 minute for counts
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    retry: 2,
    networkMode: 'online'
  });
}

/**
 * IMPROVED: Upload mutation with comprehensive cache invalidation
 */
export function useUploadMultipleMedia(
  eventId: string,
  albumId: string | null,
  options: {
    onSuccess?: (data: any) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const token = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: File[]) => {
      if (!token) throw new Error('Authentication required');
      if (!files || files.length === 0) throw new Error('No files selected');

      console.log('🔍 Starting upload for', files.length, 'files');

      // Validate files before upload
      const validFiles = files.filter(file => {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
          toast.error(`"${file.name}" is not a valid image or video file.`);
          return false;
        }

        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
          const sizeMB = (file.size / 1024 / 1024).toFixed(2);
          toast.error(`"${file.name}" is too large (${sizeMB}MB). Maximum size is 100MB.`);
          return false;
        }

        return true;
      });

      if (validFiles.length === 0) {
        throw new Error('No valid files to upload');
      }

      return await uploadMultipleMedia(validFiles, eventId, albumId, token);
    },
    onSuccess: (result) => {
      const { summary } = result.data || {};

      console.log('✅ Upload completed:', summary);

      // 🔧 IMMEDIATE CACHE INVALIDATION - Force refresh
      const invalidateAllQueries = async () => {
        // Clear all existing cache for this event
        queryClient.removeQueries({
          queryKey: ['eventPhotos', eventId],
          exact: false
        });

        // Invalidate and refetch all status queries
        const statuses = ['approved', 'pending', 'rejected', 'hidden', 'auto_approved'];

        await Promise.all([
          // Regular queries
          ...statuses.map(status =>
            queryClient.invalidateQueries({
              queryKey: queryKeys.eventPhotos(eventId, status),
              exact: false,
              refetchType: 'all'
            })
          ),

          // Infinite queries
          ...statuses.map(status =>
            queryClient.invalidateQueries({
              queryKey: [...queryKeys.eventPhotos(eventId, status), 'infinite'],
              exact: false,
              refetchType: 'all'
            })
          ),

          // Counts
          queryClient.invalidateQueries({
            queryKey: queryKeys.eventCounts(eventId),
            exact: false,
            refetchType: 'all'
          })
        ]);

        // 🔧 FORCE IMMEDIATE REFETCH of active queries
        await Promise.all([
          queryClient.refetchQueries({
            queryKey: queryKeys.eventPhotos(eventId, 'approved'),
            exact: false
          }),
          queryClient.refetchQueries({
            queryKey: queryKeys.eventPhotos(eventId, 'pending'),
            exact: false
          }),
          queryClient.refetchQueries({
            queryKey: queryKeys.eventCounts(eventId),
            exact: false
          })
        ]);
      };

      // Execute cache invalidation immediately
      invalidateAllQueries().catch(console.error);

      // Show success message
      if (summary?.success > 0) {
        toast.success(
          `${summary.success} photo${summary.success > 1 ? 's' : ''} uploaded successfully!`,
          {
            description: 'Processing in background. Gallery will update automatically.',
            duration: 5000,
          }
        );
      }

      if (summary?.failed > 0) {
        const errors = result.data?.errors || [];
        const failedFiles = errors.map((e: any) => e.filename).join(', ');
        toast.error(
          `Failed to upload ${summary.failed} file${summary.failed > 1 ? 's' : ''}: ${failedFiles}`
        );
      }

      options.onSuccess?.(result);
    },
    onError: (error: Error) => {
      console.error('❌ Upload failed:', error);
      toast.error(error.message || 'Upload failed');
      options.onError?.(error);
    }
  });
}


/**
 * IMPROVED: Update media status with aggressive cache invalidation for real-time updates
 */
export function useUpdateMediaStatus(eventId: string) {
  const token = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mediaId,
      status,
      reason
    }: {
      mediaId: string;
      status: 'approved' | 'pending' | 'rejected' | 'hidden';
      reason?: string;
    }) => {
      if (!token) throw new Error('Authentication required');

      console.log('🔍 Updating media status:', { mediaId, status });

      return await updateMediaStatus(mediaId, status, token, {
        reason,
        hideReason: reason
      });
    },
    onSuccess: async (_, { status, mediaId }) => {
      console.log('✅ Media status updated successfully');

      // AGGRESSIVE cache invalidation for immediate cross-tab updates
      const statuses = ['approved', 'pending', 'rejected', 'hidden', 'auto_approved'];

      // First: Remove all stale data
      await queryClient.removeQueries({
        queryKey: ['eventPhotos', eventId],
        exact: false
      });

      // Second: Invalidate and refetch all queries
      const invalidationPromises = [
        // Regular queries - invalidate and refetch
        ...statuses.map(async (s) => {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.eventPhotos(eventId, s),
            exact: false,
            refetchType: 'all'
          });

          // Force immediate refetch
          return queryClient.refetchQueries({
            queryKey: queryKeys.eventPhotos(eventId, s),
            exact: false
          });
        }),

        // Infinite queries - invalidate and refetch
        ...statuses.map(async (s) => {
          await queryClient.invalidateQueries({
            queryKey: [...queryKeys.eventPhotos(eventId, s), 'infinite'],
            exact: false,
            refetchType: 'all'
          });

          return queryClient.refetchQueries({
            queryKey: [...queryKeys.eventPhotos(eventId, s), 'infinite'],
            exact: false
          });
        }),

        // Counts - invalidate and refetch
        queryClient.invalidateQueries({
          queryKey: queryKeys.eventCounts(eventId),
          exact: false,
          refetchType: 'all'
        }).then(() =>
          queryClient.refetchQueries({
            queryKey: queryKeys.eventCounts(eventId),
            exact: false
          })
        )
      ];

      // Execute all invalidations concurrently
      await Promise.allSettled(invalidationPromises);

      // Broadcast to other tabs using localStorage
      try {
        const event = {
          type: 'MEDIA_STATUS_UPDATED',
          eventId,
          mediaId,
          status,
          timestamp: Date.now()
        };
        localStorage.setItem('media_update_broadcast', JSON.stringify(event));
        localStorage.removeItem('media_update_broadcast'); // Triggers storage event
      } catch (e) {
        console.warn('Failed to broadcast to other tabs:', e);
      }

      const statusAction = {
        approved: 'approved',
        rejected: 'rejected',
        hidden: 'hidden',
        pending: 'moved to pending'
      }[status];

      toast.success(`Photo ${statusAction} successfully`);
    },
    onError: (error: Error, { status }) => {
      console.error('❌ Failed to update media status:', error);

      const statusAction = {
        approved: 'approve',
        rejected: 'reject',
        hidden: 'hide',
        pending: 'update'
      }[status];

      toast.error(`Failed to ${statusAction} photo`);
    }
  });
}

/**
 * IMPROVED: Delete media mutation with comprehensive cleanup
 */
export function useDeleteMedia(eventId: string) {
  const token = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mediaId: string) => {
      if (!token) throw new Error('Authentication required');
      console.log('🔍 Deleting media:', mediaId);
      return await deleteMedia(mediaId, token);
    },
    onSuccess: async (_, mediaId) => {
      console.log('✅ Media deleted successfully');

      // Comprehensive cleanup for deleted media
      const statuses = ['approved', 'pending', 'rejected', 'hidden', 'auto_approved'];

      await Promise.allSettled([
        // Invalidate all event queries
        ...statuses.map(status => [
          queryClient.invalidateQueries({
            queryKey: queryKeys.eventPhotos(eventId, status),
            exact: false,
            refetchType: 'all'
          }),
          queryClient.invalidateQueries({
            queryKey: [...queryKeys.eventPhotos(eventId, status), 'infinite'],
            exact: false,
            refetchType: 'all'
          })
        ]).flat(),

        // Invalidate counts
        queryClient.invalidateQueries({
          queryKey: queryKeys.eventCounts(eventId),
          exact: false,
          refetchType: 'all'
        })
      ]);

      // Broadcast deletion to other tabs
      try {
        const event = {
          type: 'MEDIA_DELETED',
          eventId,
          mediaId,
          timestamp: Date.now()
        };
        localStorage.setItem('media_update_broadcast', JSON.stringify(event));
        localStorage.removeItem('media_update_broadcast');
      } catch (e) {
        console.warn('Failed to broadcast deletion to other tabs:', e);
      }

      toast.success('Photo deleted successfully');
    },
    onError: (error) => {
      console.error('❌ Failed to delete media:', error);
      toast.error('Failed to delete photo');
    }
  });
}

/**
 * IMPROVED: Gallery management utilities with cross-tab communication
 */
export function useGalleryUtils(eventId: string) {
  const queryClient = useQueryClient();

  // Listen for cross-tab updates
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'media_update_broadcast' && e.newValue) {
        try {
          const event = JSON.parse(e.newValue);

          if (event.eventId === eventId) {
            console.log('📡 Received cross-tab update:', event);

            // Invalidate all queries when receiving cross-tab updates
            const statuses = ['approved', 'pending', 'rejected', 'hidden', 'auto_approved'];

            Promise.allSettled([
              ...statuses.map(status => [
                queryClient.invalidateQueries({
                  queryKey: queryKeys.eventPhotos(eventId, status),
                  exact: false
                }),
                queryClient.invalidateQueries({
                  queryKey: [...queryKeys.eventPhotos(eventId, status), 'infinite'],
                  exact: false
                })
              ]).flat(),

              queryClient.invalidateQueries({
                queryKey: queryKeys.eventCounts(eventId),
                exact: false
              })
            ]);
          }
        } catch (error) {
          console.error('Failed to parse cross-tab update:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [eventId, queryClient]);

  // Manual refresh function
  const refreshData = useCallback(async () => {
    console.log('🔄 Manual refresh triggered for event:', eventId);

    // Clear all cache first
    await queryClient.removeQueries({
      queryKey: ['eventPhotos', eventId],
      exact: false
    });

    // Then invalidate and refetch
    await queryClient.invalidateQueries({
      queryKey: queryKeys.event(eventId),
      exact: false,
      refetchType: 'all'
    });
  }, [eventId, queryClient]);

  // Get cached photo count
  const getCachedPhotoCount = useCallback((status: string) => {
    const data = queryClient.getQueryData<Photo[]>(
      queryKeys.eventPhotos(eventId, status)
    );
    return data?.length || 0;
  }, [eventId, queryClient]);

  return {
    refreshData,
    getCachedPhotoCount
  };

}
