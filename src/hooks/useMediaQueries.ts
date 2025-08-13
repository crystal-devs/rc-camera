// hooks/useMediaQueries.ts - Enhanced with better quality management

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

// Enhanced media fetch options with better quality types
interface MediaFetchOptions {
  status?: 'approved' | 'pending' | 'rejected' | 'hidden' | 'auto_approved';
  limit?: number;
  quality?: 'small' | 'medium' | 'large' | 'original' | 'thumbnail' | 'display' | 'full';
  enabled?: boolean;
}

/**
 * 🚀 ENHANCED: Regular query for event media with quality-aware caching
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
    queryKey: [...queryKeys.eventPhotos(eventId, status), quality], // Include quality in cache key
    queryFn: async (): Promise<Photo[]> => {
      if (!token) throw new Error('Authentication required');

      console.log('🔍 useEventMedia: Fetching photos', { eventId, status, limit, quality });

      const mediaItems = await getEventMedia(eventId, token, {
        status,
        limit,
        quality: quality as 'small' | 'medium' | 'large' | 'original' | 'thumbnail' | 'display' | 'full',
        scrollType: 'pagination'
      });

      console.log('✅ useEventMedia: Received media items', { 
        count: mediaItems.length,
        quality,
        firstItemUrl: mediaItems[0]?.url || 'none'
      });

      return mediaItems.map(transformMediaToPhoto);
    },
    enabled: enabled && !!token && !!eventId,
    staleTime: quality === 'thumbnail' ? 5 * 60 * 1000 : 2 * 60 * 1000, // Longer cache for thumbnails
    gcTime: quality === 'thumbnail' ? 15 * 60 * 1000 : 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    retry: 2,
    networkMode: 'online'
  });
}

/**
 * 🚀 ENHANCED: Infinite query with quality-aware pagination
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
    queryKey: [...queryKeys.eventPhotos(eventId, status), 'infinite', quality], // Include quality
    queryFn: async ({ pageParam = 1 }): Promise<{
      photos: Photo[];
      nextPage?: number;
      hasMore: boolean;
    }> => {
      if (!token) throw new Error('Authentication required');

      console.log(`🔍 useInfiniteEventMedia: Fetching page ${pageParam}`, { 
        status, 
        quality,
        eventId 
      });

      const response = await getEventMediaWithPagination(eventId, token, {
        status,
        limit,
        quality: quality as 'small' | 'medium' | 'large' | 'original' | 'thumbnail' | 'display' | 'full',
        page: pageParam,
        scrollType: 'infinite'
      });

      const photos = (response.data || []).map(transformMediaToPhoto);

      console.log(`✅ useInfiniteEventMedia result:`, {
        page: pageParam,
        photosCount: photos.length,
        hasNext: response.pagination?.hasNext || false,
        quality,
        firstPhotoUrl: photos[0]?.imageUrl || 'none'
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
    staleTime: quality === 'thumbnail' ? 5 * 60 * 1000 : 2 * 60 * 1000,
    gcTime: quality === 'thumbnail' ? 15 * 60 * 1000 : 10 * 60 * 1000,
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
 * 🚀 NEW: Fetch single photo with full quality
 */
export function useFullQualityPhoto(eventId: string, photoId: string, enabled = false) {
  const token = useAuthToken();

  return useQuery({
    queryKey: ['photo', photoId, 'full-quality'],
    queryFn: async (): Promise<Photo | null> => {
      if (!token || !photoId) return null;

      console.log('🔍 Fetching full quality photo:', photoId);

      try {
        // Fetch the specific photo with original quality
        const mediaItems = await getEventMedia(eventId, token, {
          mediaId: photoId,
          quality: 'original',
          limit: 1
        });

        if (mediaItems.length === 0) {
          throw new Error('Photo not found');
        }

        const photo = transformMediaToPhoto(mediaItems[0]);
        console.log('✅ Full quality photo loaded:', { 
          id: photo.id, 
          url: photo.imageUrl 
        });

        return photo;
      } catch (error) {
        console.error('❌ Failed to load full quality photo:', error);
        throw error;
      }
    },
    enabled: enabled && !!token && !!photoId && !!eventId,
    staleTime: 10 * 60 * 1000, // 10 minutes for full quality
    gcTime: 30 * 60 * 1000, // Keep in cache longer
    retry: 1,
    networkMode: 'online'
  });
}

/**
 * Media counts - unchanged
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
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    retry: 2,
    networkMode: 'online'
  });
}

/**
 * 🚀 ENHANCED: Upload mutation with better quality management
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

      console.log('🔍 Starting upload for', files.length, 'files');

      // Create instant previews
      const filePreviewsWithMetadata = await Promise.all(
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

      const validPreviews = filePreviewsWithMetadata.filter(Boolean);
      if (validPreviews.length === 0) {
        throw new Error('No valid files to upload');
      }

      // Create temporary photos with thumbnail quality URLs
      const tempPhotos = validPreviews.map(preview => ({
        id: preview!.tempId,
        imageUrl: preview!.previewUrl,
        thumbnailUrl: preview!.previewUrl,
        filename: preview!.filename,
        size: preview!.size,
        dimensions: preview!.dimensions,
        aspectRatio: preview!.aspectRatio || 1,
        status: 'uploading',
        processing: true,
        uploadedBy: 'You',
        uploadedAt: new Date().toISOString(),
        approvalStatus: 'pending',
        tags: [],
        isTemporary: true
      }));

      // 🚀 OPTIMISTIC UPDATE: Add to thumbnail cache only
      queryClient.setQueryData(
        [...queryKeys.eventPhotos(eventId, 'pending'), 'thumbnail'],
        (oldData: any) => {
          if (!oldData) return tempPhotos;
          return [...tempPhotos, ...oldData];
        }
      );

      console.log('✅ Added', tempPhotos.length, 'temporary photos to thumbnail cache');

      const uploadResults = await uploadMultipleMedia(
        validPreviews.map(p => p!.file), 
        eventId, 
        albumId, 
        token
      );

      // Cleanup preview URLs
      validPreviews.forEach(preview => {
        if (preview?.previewUrl) {
          URL.revokeObjectURL(preview.previewUrl);
        }
      });

      return {
        ...uploadResults,
        tempPhotos,
        validPreviews
      };
    },
    onSuccess: (result) => {
      const { data, tempPhotos } = result;
      const { summary, uploads } = data || {};

      console.log('✅ Upload completed:', summary);

      if (uploads && uploads.length > 0) {
        setTimeout(() => {
          // Remove temporary photos from all quality caches
          const qualities = ['thumbnail', 'display', 'original'];
          qualities.forEach(quality => {
            queryClient.setQueryData(
              [...queryKeys.eventPhotos(eventId, 'pending'), quality],
              (oldData: any) => {
                if (!oldData) return [];
                return oldData.filter((photo: any) => !photo.isTemporary);
              }
            );
          });

          // Invalidate all quality variants to force refresh
          queryClient.invalidateQueries({
            queryKey: ['eventPhotos', eventId],
            exact: false
          });

          queryClient.invalidateQueries({
            queryKey: queryKeys.eventCounts(eventId),
            exact: false
          });
        }, 1000);
      }

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
      
      // Remove temporary photos from all quality caches
      const qualities = ['thumbnail', 'display', 'original'];
      qualities.forEach(quality => {
        queryClient.setQueryData(
          [...queryKeys.eventPhotos(eventId, 'pending'), quality],
          (oldData: any) => {
            if (!oldData) return [];
            return oldData.filter((photo: any) => !photo.isTemporary);
          }
        );
      });

      toast.error(error.message || 'Upload failed');
      options.onError?.(error);
    }
  });
}

/**
 * Helper function for image dimensions
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
 * 🚀 ENHANCED: Update media status with quality-aware cache invalidation
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

      // Invalidate all quality variants and statuses
      const statuses = ['approved', 'pending', 'rejected', 'hidden', 'auto_approved'];
      const qualities = ['thumbnail', 'display', 'original'];

      const invalidationPromises = [];

      // Regular queries - all combinations
      for (const s of statuses) {
        for (const q of qualities) {
          invalidationPromises.push(
            queryClient.invalidateQueries({
              queryKey: [...queryKeys.eventPhotos(eventId, s), q],
              exact: false,
              refetchType: 'all'
            })
          );
          
          // Also invalidate infinite queries
          invalidationPromises.push(
            queryClient.invalidateQueries({
              queryKey: [...queryKeys.eventPhotos(eventId, s), 'infinite', q],
              exact: false,
              refetchType: 'all'
            })
          );
        }
      }

      // Invalidate counts
      invalidationPromises.push(
        queryClient.invalidateQueries({
          queryKey: queryKeys.eventCounts(eventId),
          exact: false,
          refetchType: 'all'
        })
      );

      // Invalidate specific photo full quality cache
      invalidationPromises.push(
        queryClient.invalidateQueries({
          queryKey: ['photo', mediaId, 'full-quality'],
          exact: false
        })
      );

      // Execute all invalidations
      await Promise.allSettled(invalidationPromises);

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
 * 🚀 ENHANCED: Delete media mutation with quality-aware cleanup
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

      // Comprehensive cleanup for all quality variants
      const statuses = ['approved', 'pending', 'rejected', 'hidden', 'auto_approved'];
      const qualities = ['thumbnail', 'display', 'original'];

      const invalidationPromises = [];

      // Invalidate all combinations
      for (const status of statuses) {
        for (const quality of qualities) {
          // Regular queries
          invalidationPromises.push(
            queryClient.invalidateQueries({
              queryKey: [...queryKeys.eventPhotos(eventId, status), quality],
              exact: false,
              refetchType: 'all'
            })
          );
          
          // Infinite queries
          invalidationPromises.push(
            queryClient.invalidateQueries({
              queryKey: [...queryKeys.eventPhotos(eventId, status), 'infinite', quality],
              exact: false,
              refetchType: 'all'
            })
          );
        }
      }

      // Invalidate counts and specific photo cache
      invalidationPromises.push(
        queryClient.invalidateQueries({
          queryKey: queryKeys.eventCounts(eventId),
          exact: false,
          refetchType: 'all'
        }),
        queryClient.removeQueries({
          queryKey: ['photo', mediaId, 'full-quality'],
          exact: false
        })
      );

      await Promise.allSettled(invalidationPromises);

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
 * 🚀 ENHANCED: Gallery management utilities with quality-aware cross-tab communication
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

            // Invalidate all quality variants when receiving cross-tab updates
            const statuses = ['approved', 'pending', 'rejected', 'hidden', 'auto_approved'];
            const qualities = ['thumbnail', 'display', 'original'];

            const invalidationPromises = [];

            for (const status of statuses) {
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

    // Clear all cache variants first
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

  // Get cached photo count (check thumbnail cache first)
  const getCachedPhotoCount = useCallback((status: string) => {
    // Try thumbnail cache first (most likely to be populated)
    let data = queryClient.getQueryData<Photo[]>(
      [...queryKeys.eventPhotos(eventId, status), 'thumbnail']
    );
    
    // Fallback to any quality variant
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

// Export the new full quality hook
// export { useFullQualityPhoto };