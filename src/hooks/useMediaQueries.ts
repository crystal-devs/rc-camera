// hooks/useMediaQueries.ts - FIXED Final Version

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
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
 * FIXED: Regular query for event media
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1
  });
}

/**
 * FIXED: Infinite query for event media
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
    getNextPageParam: (lastPage) => {
      return lastPage.nextPage;
    },
    enabled: enabled && !!token && !!eventId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
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
 * Media counts for moderators
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
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1
  });
}

/**
 * Upload mutation with proper cache invalidation
 */
export function useUploadMedia(
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

      console.log('🔍 Starting upload mutation for', files.length, 'files');

      const uploadPromises = files.map(async (file) => {
        return await uploadAlbumMedia(file, albumId, token, eventId, {
          compressionQuality: 'auto',
          generateThumbnails: true,
          autoApprove: false
        });
      });

      return await Promise.allSettled(uploadPromises);
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      console.log('✅ Upload completed:', { successful: successful.length, failed: failed.length });

      // Invalidate relevant queries - including infinite queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.eventPhotos(eventId, 'pending')
      });
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.eventPhotos(eventId, 'pending'), 'infinite']
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.eventCounts(eventId)
      });

      if (albumId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.albumPhotos(albumId, 'pending')
        });
      }

      // Show results
      if (successful.length > 0) {
        toast.success(
          `${successful.length} photo${successful.length > 1 ? 's' : ''} uploaded successfully`
        );
      }

      if (failed.length > 0) {
        toast.error(
          `Failed to upload ${failed.length} photo${failed.length > 1 ? 's' : ''}`
        );
      }

      options.onSuccess?.(results);
    },
    onError: (error: Error) => {
      console.error('❌ Upload failed:', error);
      toast.error(error.message || 'Upload failed');
      options.onError?.(error);
    }
  });
}

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

      console.log('🔍 Starting multiple upload mutation for', files.length, 'files');

      // Validate files before upload
      const validFiles = files.filter(file => {
        // Check file type
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
          toast.error(`"${file.name}" is not a valid image or video file.`);
          return false;
        }

        // Check file size (100MB limit)
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

      if (validFiles.length !== files.length) {
        console.warn(`Filtered ${files.length - validFiles.length} invalid files`);
      }

      return await uploadMultipleMedia(validFiles, eventId, albumId, token);
    },
    onSuccess: (result) => {
      const { summary } = result.data || {};

      console.log('✅ Multiple upload completed:', summary);

      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({
        queryKey: ['eventPhotos', eventId, 'pending']
      });
      queryClient.invalidateQueries({
        queryKey: ['eventPhotos', eventId, 'approved']
      });
      queryClient.invalidateQueries({
        queryKey: ['eventCounts', eventId]
      });

      if (albumId) {
        queryClient.invalidateQueries({
          queryKey: ['albumPhotos', albumId]
        });
      }

      // Show success/error messages
      if (summary?.success > 0) {
        toast.success(
          `${summary.success} photo${summary.success > 1 ? 's' : ''} uploaded successfully!`
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
      console.error('❌ Multiple upload failed:', error);
      toast.error(error.message || 'Upload failed');
      options.onError?.(error);
    }
  });
}
/**
 * Update media status with proper cache invalidation
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
    onSuccess: (_, { status }) => {
      console.log('✅ Media status updated successfully');

      // Invalidate all status queries for this event (including infinite)
      ['approved', 'pending', 'rejected', 'hidden'].forEach(s => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.eventPhotos(eventId, s)
        });
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.eventPhotos(eventId, s), 'infinite']
        });
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.eventCounts(eventId)
      });

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
 * Delete media mutation
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
    onSuccess: () => {
      console.log('✅ Media deleted successfully');

      // Invalidate all event queries (including infinite)
      ['approved', 'pending', 'rejected', 'hidden'].forEach(status => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.eventPhotos(eventId, status)
        });
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.eventPhotos(eventId, status), 'infinite']
        });
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.eventCounts(eventId)
      });

      toast.success('Photo deleted successfully');
    },
    onError: (error) => {
      console.error('❌ Failed to delete media:', error);
      toast.error('Failed to delete photo');
    }
  });
}

/**
 * Gallery management utilities
 */
export function useGalleryUtils(eventId: string) {
  const queryClient = useQueryClient();

  // Manual refresh function
  const refreshData = useCallback(() => {
    console.log('🔄 Manual refresh triggered for event:', eventId);
    queryClient.invalidateQueries({
      queryKey: queryKeys.event(eventId)
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