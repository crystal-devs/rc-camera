// hooks/useInfiniteMediaQuery.ts - Updated with proper API response transformation
'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { getEventMediaWithGuestToken } from '@/services/apis/media.api';
import { MediaFetchOptions } from '@/types/events';

interface UseInfiniteMediaQueryProps {
  shareToken: string;
  auth: string | null;
  limit?: number;
  enabled?: boolean;
}

// Updated to match your API response structure
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

// Your expected photo format - updated to match your requirements
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

// Extended MediaResponse interface to match your API structure
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

interface MediaPage {
  photos: TransformedPhoto[];
  hasNext: boolean;
  total: number;
  page: number;
}

// Environment-based logging utility
const isDev = process.env.NODE_ENV === 'development';
const devLog = {
  info: (...args: any[]) => isDev && console.log(...args),
  warn: (...args: any[]) => isDev && console.warn(...args),
  error: (...args: any[]) => console.error(...args), // Always log errors
};

// Transform API response to your required photo format
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
      processingProgress: 0, // Default to 0 since processing is usually complete
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

export const useInfiniteMediaQuery = ({
  shareToken,
  auth,
  limit = 10,
  enabled = true
}: UseInfiniteMediaQueryProps) => {

  // Memoized fetch function to prevent unnecessary recreations
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
      const paginationInfo = getPaginationInfo(response, limit, approvedPhotos.length);

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

  // Optimized infinite query configuration
  const infiniteQuery = useInfiniteQuery({
    queryKey: ['guest-media', shareToken], // More specific key for guests
    queryFn: fetchMediaPage,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const shouldLoadMore = lastPage.hasNext && lastPage.photos.length > 0;
      return shouldLoadMore ? lastPage.page + 1 : undefined;
    },
    enabled: enabled && !!shareToken,
    staleTime: 5 * 60 * 1000, // 5 minutes - longer for better performance
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Reduce unnecessary refetches
    networkMode: 'online', // Only fetch when online
    retry: (failureCount, error: any) => {
      // Don't retry on auth/permission errors
      if (error?.status === 404 || error?.status === 403 || error?.status === 401) {
        return false;
      }
      // Retry only once for other errors to reduce network load
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Optimized photo flattening with deduplication
  const allPhotos = useMemo(() => {
    if (!infiniteQuery.data?.pages?.length) {
      return [];
    }

    const seenIds = new Set<string>();
    const photos = infiniteQuery.data.pages.reduce<TransformedPhoto[]>((acc, page) => {
      const validPhotos = page.photos.filter(photo => {
        if (seenIds.has(photo.id)) {
          return false;
        }
        seenIds.add(photo.id);
        return true;
      });

      return acc.concat(validPhotos);
    }, []);

    return photos;
  }, [infiniteQuery.data?.pages]);

  // Optimized total count calculation
  const totalPhotos = useMemo(() => {
    if (!infiniteQuery.data?.pages?.length) return 0;

    // Use the total from the first page as it's typically the most accurate
    const firstPageTotal = infiniteQuery.data.pages[0]?.total || 0;
    const maxTotal = Math.max(firstPageTotal, ...infiniteQuery.data.pages.map(page => page.total));

    if (isDev) {
      devLog.info(`📊 Total photos calculation: ${maxTotal} (first page: ${firstPageTotal})`);
    }

    return maxTotal;
  }, [infiniteQuery.data?.pages]);

  // Performance monitoring (development only)
  if (isDev) {
    devLog.info('🔍 useInfiniteMediaQuery state:', {
      shareToken: shareToken ? shareToken.substring(0, 8) + '...' : 'undefined',
      photosCount: allPhotos.length,
      totalPhotos,
      isLoading: infiniteQuery.isLoading,
      isLoadingMore: infiniteQuery.isFetchingNextPage,
      hasNextPage: infiniteQuery.hasNextPage,
      isError: infiniteQuery.isError,
      errorMessage: infiniteQuery.error?.message,
      pagesCount: infiniteQuery.data?.pages?.length || 0,
      samplePhoto: allPhotos[0] ? {
        id: allPhotos[0].id,
        imageUrl: allPhotos[0].imageUrl.substring(0, 50) + '...',
        takenBy: allPhotos[0].takenBy
      } : null
    });
  }

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
    // Expose additional methods for advanced usage
    refetchPage: infiniteQuery.refetch,
    invalidate: () => infiniteQuery.refetch(), // Alias for consistency
    // Remove the full query exposure to reduce bundle size
  };
};

// Helper function to determine pagination info with fallback logic
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