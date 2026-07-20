// hooks/useMediaQueries.ts - CORRECTED with smart cache invalidation

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
  getEventMedia,
  getAlbumMedia,
  uploadAlbumMedia,
  updateMediaStatus,
  toggleMediaFavorite,
  bulkUpdateMediaStatus,
  deleteMedia,
  getEventMediaCounts,
  transformMediaToPhoto,
  MediaApiResponse,
  MediaItem,
  getEventMediaWithPagination,
  uploadMultipleMedia,
  getBulkUploadUrls,
  uploadBatchComplete
} from '@/services/apis/media.api';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';
import { useAuthToken } from '@/hooks/use-auth';
import { authManager } from '@/lib/auth-manager';
import { queryKeys } from '@/lib/queryKeys';
import { Photo } from '@/types/PhotoGallery.types';
import { pLimit } from '@/utils/async';

// Industry standard: Optimized cache configuration for image galleries (Google Photos style)
const CACHE_CONFIG = {
  staleTime: 1000 * 60 * 5,         // 5 minutes
  gcTime: 1000 * 60 * 60,           // 1 hour
  refetchOnWindowFocus: false,
  refetchOnMount: false,            // Only refetch if stale
  refetchOnReconnect: false,
  retry: 2,
  networkMode: 'online' as const,
  keepPreviousData: true,           // Smooth transitions between pages
};

interface MediaFetchOptions {
  status?: 'approved' | 'pending' | 'rejected' | 'hidden' | 'auto_approved';
  limit?: number;
  quality?: 'small' | 'medium' | 'large' | 'original';
  enabled?: boolean;
  maxPages?: number; // Maximum pages to auto-load (for small galleries)
  /** Function (sub-event) filter: an id, or 'none' for untagged media (Phase 1) */
  subEventId?: string;
  /** Sort order (Phase 3) */
  sort?: 'newest' | 'oldest';
  /** Filename search (Phase 3) */
  search?: string;
  /** Source filter: guest vs official (Phase 3) */
  source?: 'guest' | 'official';
}

/**
 * 🚀 Regular query for event media with quality-aware caching
 */
export function useEventMedia(eventId: string, options: MediaFetchOptions = {}) {
  const token = useAuthToken();
  const {
    status = 'approved',
    limit = 50,
    quality = 'thumbnail',
    enabled = true
  } = options;

  return useQuery({
    queryKey: [...queryKeys.eventPhotos(eventId, status), quality],
    queryFn: async (): Promise<Photo[]> => {
      if (!token) throw new Error('Authentication required');
      const mediaItems = await getEventMedia(eventId, token, {
        status,
        limit,
        quality: quality as 'small' | 'medium' | 'large' | 'original',
        scrollType: 'pagination'
      });
      return mediaItems.map(transformMediaToPhoto);
    },
    enabled: enabled && !!token && !!eventId,
    ...CACHE_CONFIG
  });
}

/**
 * 🚀 Infinite query with quality-aware pagination
 */
export function useInfiniteEventMedia(eventId: string, options: MediaFetchOptions = {}) {
  const queryClient = useQueryClient();
  const token = useAuthToken();
  const {
    status = 'approved',
    limit = 20,
    quality = 'thumbnail',
    enabled = true,
    subEventId,
    sort = 'newest',
    search,
    source
  } = options;

  const query = useInfiniteQuery({
    // subEventId/sort/search/source are part of the key so changing any refetches
    queryKey: [...queryKeys.eventPhotos(eventId, status), 'infinite', quality, subEventId ?? 'all', sort, search ?? '', source ?? 'all'],
    queryFn: async ({ pageParam = 1 }): Promise<{
      photos: Photo[];
      nextPage?: number;
      hasMore: boolean;
    }> => {
      console.log(`🚀 Fetching page ${pageParam} for eventId: ${eventId}, status: ${status}`);

      if (!token) throw new Error('Authentication required');

      const response = await getEventMediaWithPagination(eventId, token, {
        status,
        limit,
        quality: quality as 'small' | 'medium' | 'large' | 'original',
        page: pageParam,
        scrollType: 'infinite',
        subEventId,
        sort,
        search,
        source
      });

      console.log(`📄 Page ${pageParam} Response:`, {
        photosCount: response.data?.length || 0,
        pagination: response.pagination,
        hasNext: response.pagination?.hasNext,
        totalCount: response.pagination?.totalCount,
        currentPage: response.pagination?.page
      });

      const photos = (response.data || []).map(transformMediaToPhoto);

      const nextPage = response.pagination?.hasNext ? pageParam + 1 : undefined;
      console.log(`➡️ Next page param:`, nextPage);

      // 🚀 Prefetch next page for smoother loading
      if (nextPage && photos.length === limit) {
        const prefetchQueryKey = [...queryKeys.eventPhotos(eventId, status), 'infinite', quality, subEventId ?? 'all', sort, search ?? '', source ?? 'all', nextPage];
        queryClient.prefetchQuery({
          queryKey: prefetchQueryKey,
          queryFn: async () => {
            const prefetchResponse = await getEventMediaWithPagination(eventId, token, {
              status,
              limit,
              quality: quality as 'small' | 'medium' | 'large' | 'original',
              page: nextPage,
              scrollType: 'infinite',
              subEventId,
              sort,
              search,
              source
            });
            return {
              photos: (prefetchResponse.data || []).map(transformMediaToPhoto),
              nextPage: prefetchResponse.pagination?.hasNext ? nextPage + 1 : undefined,
              hasMore: prefetchResponse.pagination?.hasNext || false
            };
          },
          staleTime: CACHE_CONFIG.staleTime
        });
      }

      return {
        photos,
        nextPage,
        hasMore: response.pagination?.hasNext || false
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const result = lastPage.nextPage;
      console.log('🔍 getNextPageParam called:', {
        nextPage: lastPage.nextPage,
        hasMore: lastPage.hasMore,
        photosInPage: lastPage.photos.length,
        returning: result,
        willHaveNextPage: result !== undefined
      });
      return result;
    },
    enabled: enabled && !!token && !!eventId,
    ...CACHE_CONFIG,
    meta: {
      errorMessage: 'Failed to load more photos'
    }
  });

  return query;
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
 * 🚀 Fetch single photo with full quality
 */
export function useFullQualityPhoto(eventId: string, photoId: string, enabled = false) {
  const token = useAuthToken();

  return useQuery({
    queryKey: ['photo', photoId, 'full-quality'],
    queryFn: async (): Promise<Photo | null> => {
      if (!token || !photoId) return null;

      try {
        const mediaItems = await getEventMedia(eventId, token, {
          // @ts-ignore - mediaId not in type but backend might support it or this is legacy
          mediaId: photoId,
          quality: 'original',
          limit: 1
        });

        if (mediaItems.length === 0) {
          throw new Error('Photo not found');
        }

        return transformMediaToPhoto(mediaItems[0]);
      } catch (error) {
        console.error('❌ Failed to load full quality photo:', error);
        throw error;
      }
    },
    enabled: enabled && !!token && !!photoId && !!eventId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    networkMode: 'online'
  });
}

/**
 * Media counts
 */
export function useEventMediaCounts(eventId: string, enabled = true) {
  const token = useAuthToken();

  return useQuery({
    queryKey: queryKeys.eventCounts(eventId),
    queryFn: async () => {
      if (!token) throw new Error('Authentication required');
      return await getEventMediaCounts(eventId, token);
    },
    enabled: enabled && !!token && !!eventId,
    ...CACHE_CONFIG
  });
}

/**
 * 🚀 Upload mutation
 */
export function useUploadMultipleMedia(
  eventId: string,
  albumId: string | null,
  options: {
    onSuccess?: (data: any) => void;
    onError?: (error: Error) => void;
    onProgress?: (progress: Record<string, number>) => void;
  } = {}
) {
  const token = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: File[]) => {
      // Ensure specific token is used or fallback to auth manager
      await authManager.init();
      const token = authManager.getAuthToken();

      if (!token) throw new Error('Authentication required');
      if (!files || files.length === 0) throw new Error('No files selected');

      // 1. Prepare files
      const fileData = Array.from(files).map(file => ({
        fileName: file.name,
        fileType: file.type
      }));

      // 2. Get Presigned URLs
      const response = await getBulkUploadUrls(eventId, fileData, token);
      const { uploadUrls } = response.data;

      const progressMap: Record<string, number> = {};
      const results: any[] = [];
      const errors: any[] = [];
      const batchUploads: any[] = [];

      // 3. Upload concurrently to S3 with a limit of 3
      const limit = pLimit(3);
      const uploadPromises = files.map((file, index) => limit(async () => {
        const uploadData = uploadUrls[index];
        if (!uploadData) return;

        try {
          // Upload to S3
          await axios.put(uploadData.uploadUrl, file, {
            headers: { 'Content-Type': file.type },
            onUploadProgress: (e) => {
              const percent = (e.loaded / (e.total || 1)) * 100;
              progressMap[file.name] = percent;
              // options.onProgress?.({ ...progressMap }); // Reduce chatter
            },
          });

          // Calculate dimensions if it's an image
          let width = 0;
          let height = 0;
          if (file.type.startsWith('image/')) {
            const dims = await getImageDimensions(file);
            if (dims) {
              width = dims.width;
              height = dims.height;
            }
          }

          // Accumulate for batch completion
          batchUploads.push({
            key: uploadData.key,
            upload_id: uploadData.uploadId,
            width,
            height,
            filename: file.name
          });

          // Set progress to 100% locally
          progressMap[file.name] = 100;
          options.onProgress?.({ ...progressMap });

        } catch (err: any) {
          console.error(`Failed to upload ${file.name}:`, err);
          errors.push({ filename: file.name, error: err.message });
          progressMap[file.name] = 0;
        }
      }));

      await Promise.allSettled(uploadPromises);

      // 4. Call Batch Complete API if we have successful uploads
      if (batchUploads.length > 0) {
        try {
          const batchResult = await uploadBatchComplete(eventId, batchUploads, token);
          const { results: completedItems } = batchResult.data;

          if (completedItems && Array.isArray(completedItems)) {
            completedItems.forEach((item: any) => {
              // Find original filename to map back
              const original = batchUploads.find(b => b.upload_id === item.upload_id);
              results.push({
                ...item,
                filename: original?.filename || 'image.jpg',
                status: 'completed'
              });
            });
          }
        } catch (err: any) {
          console.error('Batch completion failed:', err);
          // If batch fails, we should probably throw or report error
          throw new Error('Failed to finalize uploads: ' + err.message);
        }
      }

      if (errors.length === files.length) {
        throw new Error('All uploads failed');
      }

      // Construct a result object similar to what existing code expects
      return {
        status: true,
        data: {
          uploads: results,
          summary: {
            successful: results.length,
            failed: errors.length,
            total: files.length
          },
          errors
        }
      };
    },
    onSuccess: (result) => {
      const { data } = result || {};
      const { summary, uploads } = data || {};

      if (summary?.successful > 0) {
        toast.success(
          `${summary.successful} photo${summary.successful > 1 ? 's' : ''} uploaded!`,
          {
            description: 'Photos are visible now. High-quality versions processing in background.',
            duration: 5000,
          }
        );
      }

      if (summary?.failed > 0 && data?.errors) {
        data.errors.forEach((error: any) => {
          toast.error(`Failed to upload "${error.filename}": ${error.error}`);
        });
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
 * Helper for image dimensions
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(null);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

/**
 * 🚀 CORRECTED: Update media status with smart cache invalidation
 * 
 * Strategy:
 * 1. Remove photo from ALL status caches (cleanup)
 * 2. Invalidate NEW status cache to refetch from backend
 * 3. Let WebSocket updates handle progressive improvements
 */
/**
 * Toggle a photo's host-curation favorite (Phase 3). Optimistically patches
 * isFavorite in every cached infinite page for this event so the star flips
 * instantly, and rolls back on error.
 */
export function useToggleMediaFavorite(eventId: string) {
  const queryClient = useQueryClient();

  const patchIsFavorite = (mediaId: string, isFavorite: boolean) => {
    queryClient.setQueriesData(
      { queryKey: queryKeys.eventPhotos(eventId) },
      (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            photos: (page.photos ?? []).map((p: Photo) =>
              p.id === mediaId ? { ...p, isFavorite } : p
            ),
          })),
        };
      }
    );
  };

  return useMutation({
    mutationFn: async ({ mediaId, favorite }: { mediaId: string; favorite: boolean }) => {
      await authManager.init();
      const token = authManager.getAuthToken();
      if (!token) throw new Error('Authentication required');
      return await toggleMediaFavorite(mediaId, favorite, token);
    },
    onMutate: async ({ mediaId, favorite }) => {
      patchIsFavorite(mediaId, favorite);
      return { mediaId, previous: !favorite };
    },
    onError: (_err, _vars, context) => {
      if (context) patchIsFavorite(context.mediaId, context.previous);
      toast.error('Could not update favorite');
    },
  });
}

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
      await authManager.init();
      const token = authManager.getAuthToken();

      if (!token) throw new Error('Authentication required');
      console.log('🔍 Updating media status:', { mediaId, status });
      return await updateMediaStatus(mediaId, status, token, {
        reason,
        hideReason: reason
      });
    },

    onSuccess: async (_, { status, mediaId }) => {
      console.log('✅ Media status updated successfully');

      const allStatuses = ['approved', 'pending', 'rejected', 'hidden', 'auto_approved'];
      const qualities = ['small', 'medium', 'large', 'original'];

      // STEP 1: Remove photo from ALL status caches (cleanup)
      console.log('🧹 Removing photo from all status caches...');
      const removalPromises: Promise<any>[] = [];

      for (const s of allStatuses) {
        for (const q of qualities) {
          // Remove from infinite queries
          removalPromises.push(
            Promise.resolve(
              queryClient.setQueryData(
                [...queryKeys.eventPhotos(eventId, s), 'infinite', q],
                (oldData: any) => {
                  if (!oldData?.pages) return oldData;

                  return {
                    ...oldData,
                    pages: oldData.pages.map((page: any) => ({
                      ...page,
                      photos: page.photos.filter((p: any) => p.id !== mediaId)
                    }))
                  };
                }
              )
            )
          );

          // Remove from regular queries
          removalPromises.push(
            Promise.resolve(
              queryClient.setQueryData(
                [...queryKeys.eventPhotos(eventId, s), q],
                (oldData: any) => {
                  if (!oldData) return oldData;
                  return oldData.filter((p: any) => p.id !== mediaId);
                }
              )
            )
          );
        }
      }

      await Promise.allSettled(removalPromises);
      console.log('✅ Photo removed from all caches');

      // STEP 2: Invalidate NEW status cache to refetch
      console.log('🔄 Invalidating new status cache for refetch...');
      const invalidationPromises: Promise<any>[] = [];

      for (const q of qualities) {
        invalidationPromises.push(
          queryClient.invalidateQueries({
            queryKey: [...queryKeys.eventPhotos(eventId, status), 'infinite', q],
            exact: false,
            refetchType: 'all'
          })
        );

        invalidationPromises.push(
          queryClient.invalidateQueries({
            queryKey: [...queryKeys.eventPhotos(eventId, status), q],
            exact: false,
            refetchType: 'all'
          })
        );
      }

      // Invalidate counts
      invalidationPromises.push(
        queryClient.invalidateQueries({
          queryKey: queryKeys.eventCounts(eventId),
          exact: false,
          refetchType: 'all'
        })
      );

      await Promise.allSettled(invalidationPromises);
      console.log('✅ New status cache invalidated and refetching');

      // Broadcast to other tabs
      try {
        const event = {
          type: 'MEDIA_STATUS_UPDATED',
          eventId,
          mediaId,
          status,
          timestamp: Date.now()
        };
        localStorage.setItem('media_update_broadcast', JSON.stringify(event));
        localStorage.removeItem('media_update_broadcast');
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
 * 🚀 CORRECTED: Delete media with smart cache removal
 * 
 * Strategy:
 * 1. Remove photo from ALL caches immediately
 * 2. Invalidate counts to refetch
 * 3. No need to refetch individual status (photo is gone)
 */
export function useDeleteMedia(eventId: string) {
  const token = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mediaId: string) => {
      await authManager.init();
      const token = authManager.getAuthToken();

      if (!token) throw new Error('Authentication required');
      console.log('🔍 Deleting media:', mediaId);
      return await deleteMedia(mediaId, token);
    },

    onSuccess: async (_, mediaId) => {
      console.log('✅ Media deleted successfully');

      const allStatuses = ['approved', 'pending', 'rejected', 'hidden', 'auto_approved'];
      const qualities = ['small', 'medium', 'large', 'original'];

      // Remove photo from ALL caches
      console.log('🧹 Removing photo from all caches...');
      const removalPromises: Promise<any>[] = [];

      for (const status of allStatuses) {
        for (const quality of qualities) {
          // Remove from infinite queries
          removalPromises.push(
            Promise.resolve(
              queryClient.setQueryData(
                [...queryKeys.eventPhotos(eventId, status), 'infinite', quality],
                (oldData: any) => {
                  if (!oldData?.pages) return oldData;

                  return {
                    ...oldData,
                    pages: oldData.pages.map((page: any) => ({
                      ...page,
                      photos: page.photos.filter((p: any) => p.id !== mediaId)
                    }))
                  };
                }
              )
            )
          );

          // Remove from regular queries
          removalPromises.push(
            Promise.resolve(
              queryClient.setQueryData(
                [...queryKeys.eventPhotos(eventId, status), quality],
                (oldData: any) => {
                  if (!oldData) return oldData;
                  return oldData.filter((p: any) => p.id !== mediaId);
                }
              )
            )
          );
        }
      }

      await Promise.allSettled(removalPromises);
      console.log('✅ Photo removed from all caches');

      // Invalidate counts and specific photo cache
      console.log('🔄 Invalidating counts...');
      const invalidationPromises = [
        queryClient.invalidateQueries({
          queryKey: queryKeys.eventCounts(eventId),
          exact: false,
          refetchType: 'all'
        }),
        queryClient.removeQueries({
          queryKey: ['photo', mediaId, 'full-quality'],
          exact: false
        })
      ];

      await Promise.allSettled(invalidationPromises);
      console.log('✅ Counts invalidated');

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
 * Gallery utilities
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

            const allStatuses = ['approved', 'pending', 'rejected', 'hidden', 'auto_approved'];
            const qualities = ['small', 'medium', 'large', 'original'];

            const invalidationPromises = [];

            for (const status of allStatuses) {
              for (const quality of qualities) {
                invalidationPromises.push(
                  queryClient.invalidateQueries({
                    queryKey: [...queryKeys.eventPhotos(eventId, status), quality],
                    exact: false
                  }),
                  queryClient.invalidateQueries({
                    queryKey: [...queryKeys.eventPhotos(eventId, status), 'infinite', quality],
                    exact: false
                  })
                );
              }
            }

            invalidationPromises.push(
              queryClient.invalidateQueries({
                queryKey: queryKeys.eventCounts(eventId),
                exact: false
              })
            );

            Promise.allSettled(invalidationPromises);
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

    await queryClient.removeQueries({
      queryKey: ['eventPhotos', eventId],
      exact: false
    });

    await queryClient.invalidateQueries({
      queryKey: queryKeys.event(eventId),
      exact: false,
      refetchType: 'all'
    });
  }, [eventId, queryClient]);

  // Get cached photo count
  const getCachedPhotoCount = useCallback((status: string) => {
    let data = queryClient.getQueryData<Photo[]>(
      [...queryKeys.eventPhotos(eventId, status), 'small']
    );

    if (!data) {
      data = queryClient.getQueryData<Photo[]>(
        queryKeys.eventPhotos(eventId, status)
      );
    }

    return data?.length || 0;
  }, [eventId, queryClient]);

  return {
    refreshData,
    getCachedPhotoCount
  };
}