// hooks/useInfiniteMediaQuery.ts - Optimized version with performance improvements
'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { getEventMediaWithGuestToken } from '@/services/apis/media.api';
import { MediaFetchOptions, transformApiPhoto, TransformedPhoto } from '@/types/events';

interface UseInfiniteMediaQueryProps {
  shareToken: string;
  auth: string | null;
  limit?: number;
  enabled?: boolean;
}

// Extended MediaResponse interface to match your API structure
interface MediaResponse {
  data: any[];
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

export const useInfiniteMediaQuery = ({
  shareToken,
  auth,
  limit = 10,
  enabled = true
}: UseInfiniteMediaQueryProps) => {

  // Memoized fetch function to prevent unnecessary recreations
  const fetchMediaPage = useCallback(async ({ pageParam = 1 }): Promise<MediaPage> => {
    devLog.info(`📥 Fetching page ${pageParam} for guest with shareToken: ${shareToken.substring(0, 8)}...`);

    const options: Partial<MediaFetchOptions> = {
      page: pageParam,
      limit,
      scroll_type: 'pagination',
      quality: 'display'
    };

    try {
      const response = await getEventMediaWithGuestToken(shareToken, auth, options);

      if (isDev) {
        devLog.info('📦 Raw API response:', {
          hasData: !!response?.data,
          dataLength: response?.data?.length || 0,
          total: response?.total,
          hasMore: response?.hasMore,
          pagination: response?.pagination
        });
      }

      if (!response?.data || !Array.isArray(response.data)) {
        devLog.warn('⚠️ No valid data in response:', response);
        return {
          photos: [],
          hasNext: false,
          total: 0,
          page: pageParam
        };
      }

      // Transform photos using your transform function with error handling
      devLog.info(`🔄 Transforming ${response.data.length} photos...`);
      const transformedPhotos = response.data.reduce<TransformedPhoto[]>((acc, item, index) => {
        try {
          const transformedPhoto = transformApiPhoto(item);
          if (transformedPhoto) {
            acc.push(transformedPhoto);
          }
          return acc;
        } catch (error) {
          devLog.error(`❌ Failed to transform photo at index ${index}:`, error, item);
          return acc;
        }
      }, []);

      devLog.info(`✅ Successfully transformed ${transformedPhotos.length} photos`);

      // For guests: Filter only approved photos with optimized filtering
      const approvedPhotos = transformedPhotos.filter(photo => {
        // If no approval info, assume it's approved (for backward compatibility)
        if (!photo.approval) {
          if (isDev) {
            devLog.info(`📸 Photo ${photo.id}: No approval info - assuming approved`);
          }
          return true;
        }

        const isApproved = photo.approval.status === 'approved' || photo.approval.status === 'auto_approved';

        if (isDev) {
          devLog.info(`📸 Photo ${photo.id}: ${photo.approval.status} -> ${isApproved ? 'SHOW' : 'HIDE'}`);
        }

        return isApproved;
      });

      devLog.info(`🎯 Filtered to ${approvedPhotos.length} approved photos out of ${transformedPhotos.length} total`);

      // Determine pagination with priority fallback system
      const paginationInfo = getPaginationInfo(response, limit, approvedPhotos.length);

      const result: MediaPage = {
        photos: approvedPhotos,
        hasNext: paginationInfo.hasNext,
        total: paginationInfo.total,
        page: pageParam
      };

      devLog.info(`✅ Page ${pageParam} result:`, {
        photosCount: result.photos.length,
        hasNext: result.hasNext,
        total: result.total
      });

      return result;

    } catch (error) {
      devLog.error(`❌ Error fetching page ${pageParam}:`, error);

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

      if (isDev) {
        devLog.info(`🔄 getNextPageParam: hasNext=${lastPage.hasNext}, photosLength=${lastPage.photos.length}, shouldLoadMore=${shouldLoadMore}`);
      }

      return shouldLoadMore ? lastPage.page + 1 : undefined;
    },
    enabled: enabled && !!shareToken,
    staleTime: 5 * 60 * 1000, // 5 minutes - longer for better performance
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Reduce unnecessary refetches
    networkMode: 'online', // Only fetch when online
    retry: (failureCount, error: any) => {
      if (isDev) {
        devLog.info(`🔄 Retry attempt ${failureCount} for error:`, error);
      }

      // Don't retry on auth/permission errors
      if (error?.status === 404 || error?.status === 403 || error?.status === 401) {
        devLog.info('🚫 Not retrying due to auth/permission error');
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
      devLog.info('📭 No pages data available');
      return [];
    }

    const seenIds = new Set<string>();
    const photos = infiniteQuery.data.pages.reduce<TransformedPhoto[]>((acc, page) => {
      const validPhotos = page.photos.filter(photo => {
        if (seenIds.has(photo.id)) {
          if (isDev) {
            devLog.info(`🔄 Duplicate photo filtered: ${photo.id}`);
          }
          return false;
        }
        seenIds.add(photo.id);
        return true;
      });

      return acc.concat(validPhotos);
    }, []);

    devLog.info(`📸 Total flattened photos: ${photos.length} from ${infiniteQuery.data.pages.length} pages`);
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
      shareToken: shareToken.substring(0, 8) + '...',
      photosCount: allPhotos.length,
      totalPhotos,
      isLoading: infiniteQuery.isLoading,
      isLoadingMore: infiniteQuery.isFetchingNextPage,
      hasNextPage: infiniteQuery.hasNextPage,
      isError: infiniteQuery.isError,
      errorMessage: infiniteQuery.error?.message,
      pagesCount: infiniteQuery.data?.pages?.length || 0
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

    if (isDev) {
      devLog.info('📊 Using response.pagination:', { hasNext, total });
    }

    return { hasNext, total };
  }

  // Priority 2: Check response.other.pagination  
  if (response.other?.pagination) {
    hasNext = Boolean(response.other.pagination.hasNext);
    total = response.other.pagination.totalCount || 0;

    if (isDev) {
      devLog.info('📊 Using response.other.pagination:', { hasNext, total });
    }

    return { hasNext, total };
  }

  // Priority 3: Use top-level fields
  if (response.hasMore !== undefined) {
    hasNext = Boolean(response.hasMore);
    total = response.total || 0;

    if (isDev) {
      devLog.info('📊 Using top-level fields:', { hasNext, total });
    }

    return { hasNext, total };
  }

  // Fallback: Estimate based on returned data length
  hasNext = (response.data?.length || 0) === limit;
  total = approvedCount;

  if (isDev) {
    devLog.info('📊 Using fallback estimation:', { hasNext, total });
  }

  return { hasNext, total };
}