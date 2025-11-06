// hooks/useMediaQueries.ts - CORRECTED with smart cache invalidation

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
  getEventMedia,
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

interface MediaFetchOptions {
  status?: 'approved' | 'pending' | 'rejected' | 'hidden' | 'auto_approved';
  limit?: number;
  quality?: 'small' | 'medium' | 'large' | 'original';
  enabled?: boolean;
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
    staleTime: quality === 'thumbnail' ? 5 * 60 * 1000 : 2 * 60 * 1000,
    gcTime: quality === 'thumbnail' ? 15 * 60 * 1000 : 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'stale',
    refetchOnReconnect: true,
    retry: 2,
    networkMode: 'online'
  });
}

/**
 * 🚀 Infinite query with quality-aware pagination
 */
export function useInfiniteEventMedia(eventId: string, options: MediaFetchOptions = {}) {
  const token = useAuthToken();
  const {
    status = 'approved',
    limit = 20,
    quality = 'thumbnail',
    enabled = true
  } = options;

  return useInfiniteQuery({
    queryKey: [...queryKeys.eventPhotos(eventId, status), 'infinite', quality],
    queryFn: async ({ pageParam = 1 }): Promise<{
      photos: Photo[];
      nextPage?: number;
      hasMore: boolean;
    }> => {
      if (!token) throw new Error('Authentication required');

      const response = await getEventMediaWithPagination(eventId, token, {
        status,
        limit,
        quality: quality as 'small' | 'medium' | 'large' | 'original',
        page: pageParam,
        scrollType: 'infinite'
      });

      const photos = (response.data || []).map(transformMediaToPhoto);

      return {
        photos,
        nextPage: response.pagination?.hasNext ? pageParam + 1 : undefined,
        hasMore: response.pagination?.hasNext || false
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: enabled && !!token && !!eventId,
    staleTime: quality === 'thumbnail' ? 5 * 60 * 1000 : 2 * 60 * 1000,
    gcTime: quality === 'thumbnail' ? 15 * 60 * 1000 : 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'stale',
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
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'stale',
    refetchOnReconnect: true,
    retry: 2,
    networkMode: 'online'
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
    onProgress?: (uploaded: any[]) => void;
  } = {}
) {
  const token = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: File[]) => {
      if (!token) throw new Error('Authentication required');
      if (!files || files.length === 0) throw new Error('No files selected');

      // File validation...
      const validPreviews = await Promise.all(
        files.map(async (file, index) => {
          if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            toast.error(`"${file.name}" is not a valid image or video file.`);
            return null;
          }

          const maxSize = 100 * 1024 * 1024;
          if (file.size > maxSize) {
            const sizeMB = (file.size / 1024 / 1024).toFixed(2);
            toast.error(`"${file.name}" is too large (${sizeMB}MB). Maximum size is 100MB.`);
            return null;
          }

          const previewUrl = URL.createObjectURL(file);
          const dimensions = await getImageDimensions(file);
          
          return {
            file,
            tempId: `temp_${Date.now()}_${index}`,
            previewUrl,
            filename: file.name,
            size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
            dimensions: dimensions ? `${dimensions.width}x${dimensions.height}` : undefined,
            aspectRatio: dimensions ? dimensions.height / dimensions.width : undefined,
            status: 'uploading' as const
          };
        })
      );

      const validFiles = validPreviews.filter(Boolean);
      if (validFiles.length === 0) {
        throw new Error('No valid files to upload');
      }

      const uploadResults = await uploadMultipleMedia(
        validFiles.map(p => p!.file), 
        eventId, 
        albumId, 
        token
      );

      validFiles.forEach(preview => {
        if (preview?.previewUrl) {
          URL.revokeObjectURL(preview.previewUrl);
        }
      });

      return uploadResults;
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