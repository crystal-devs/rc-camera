// hooks/useInfiniteMediaQuery.ts - Using your getEventMediaWithGuestToken function
'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { getEventMediaWithGuestToken } from '@/services/apis/media.api'; // Import your function
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

export const useInfiniteMediaQuery = ({
  shareToken,
  auth,
  limit = 10,
  enabled = true
}: UseInfiniteMediaQueryProps) => {

  const fetchMediaPage = useCallback(async ({ pageParam = 1 }): Promise<MediaPage> => {
    console.log(`📥 Fetching page ${pageParam} for guest with shareToken: ${shareToken.substring(0, 8)}...`);

    const options: Partial<MediaFetchOptions> = {
      page: pageParam,
      limit,
      scroll_type: 'pagination',
      quality: 'display'
    };

    try {
      const response = await getEventMediaWithGuestToken(shareToken, auth, options);

      console.log('📦 Raw API response:', {
        hasData: !!response?.data,
        dataLength: response?.data?.length || 0,
        total: response?.total,
        hasMore: response?.hasMore,
        pagination: response?.pagination
      });

      if (!response?.data || !Array.isArray(response.data)) {
        console.warn('⚠️ No valid data in response:', response);
        return {
          photos: [],
          hasNext: false,
          total: 0,
          page: pageParam
        };
      }

      // Transform photos using your transform function
      console.log(`🔄 Transforming ${response.data.length} photos...`);
      const transformedPhotos = response.data.map((item, index) => {
        try {
          return transformApiPhoto(item);
        } catch (error) {
          console.error(`❌ Failed to transform photo at index ${index}:`, error, item);
          return null;
        }
      }).filter(Boolean) as TransformedPhoto[];

      console.log(`✅ Successfully transformed ${transformedPhotos.length} photos`);

      // For guests: Filter only approved photos
      const approvedPhotos = transformedPhotos.filter(photo => {
        if (!photo.approval) {
          // If no approval info, assume it's approved (for backward compatibility)
          console.log(`📸 Photo ${photo.id}: No approval info - assuming approved`);
          return true;
        }

        const isApproved = photo.approval.status === 'approved' ||
          photo.approval.status === 'auto_approved';

        console.log(`📸 Photo ${photo.id}: ${photo.approval.status} -> ${isApproved ? 'SHOW' : 'HIDE'}`);
        return isApproved;
      });

      console.log(`🎯 Filtered to ${approvedPhotos.length} approved photos out of ${transformedPhotos.length} total`);

      // Determine pagination - check multiple possible sources
      let hasNext = false;
      let total = 0;

      // Priority 1: Check response.pagination
      if (response.pagination) {
        hasNext = Boolean(response.pagination.hasNext);
        total = response.pagination.totalCount || response.pagination.total || 0;
        console.log('📊 Using response.pagination:', { hasNext, total });
      }
      // Priority 2: Check response.other.pagination  
      else if (response.other?.pagination) {
        hasNext = Boolean(response.other.pagination.hasNext);
        total = response.other.pagination.totalCount || 0;
        console.log('📊 Using response.other.pagination:', { hasNext, total });
      }
      // Priority 3: Use top-level fields
      else if (response.hasMore !== undefined) {
        hasNext = Boolean(response.hasMore);
        total = response.total || 0;
        console.log('📊 Using top-level fields:', { hasNext, total });
      }
      // Fallback: Estimate based on returned data length
      else {
        hasNext = response.data.length === limit;
        total = approvedPhotos.length;
        console.log('📊 Using fallback estimation:', { hasNext, total });
      }

      const result = {
        photos: approvedPhotos,
        hasNext,
        total,
        page: pageParam
      };

      console.log(`✅ Page ${pageParam} result:`, {
        photosCount: result.photos.length,
        hasNext: result.hasNext,
        total: result.total
      });

      return result;

    } catch (error) {
      console.error(`❌ Error fetching page ${pageParam}:`, error);

      // Return empty page on error
      return {
        photos: [],
        hasNext: false,
        total: 0,
        page: pageParam
      };
    }
  }, [shareToken, auth, limit]);

  // 🎯 QUERY KEY MATCHES WEBSOCKET INVALIDATION
  const infiniteQuery = useInfiniteQuery({
    queryKey: ['event-media', shareToken], // This matches what WebSocket invalidates
    queryFn: fetchMediaPage,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const shouldLoadMore = lastPage.hasNext && lastPage.photos.length > 0;
      console.log(`🔄 getNextPageParam: hasNext=${lastPage.hasNext}, photosLength=${lastPage.photos.length}, shouldLoadMore=${shouldLoadMore}`);
      return shouldLoadMore ? lastPage.page + 1 : undefined;
    },
    enabled: enabled && !!shareToken,
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter for real-time updates
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      console.log(`🔄 Retry attempt ${failureCount} for error:`, error);

      // Don't retry on auth/permission errors
      if (error?.status === 404 || error?.status === 403 || error?.status === 401) {
        console.log('🚫 Not retrying due to auth/permission error');
        return false;
      }

      // Retry up to 2 times for other errors
      return failureCount < 2;
    }
  });

  // Flatten all photos from all pages with deduplication
  const allPhotos = useMemo(() => {
    if (!infiniteQuery.data?.pages) {
      console.log('📭 No pages data available');
      return [];
    }

    const seenIds = new Set<string>();
    const photos = infiniteQuery.data.pages.flatMap(page =>
      page.photos.filter(photo => {
        if (seenIds.has(photo.id)) {
          console.log(`🔄 Duplicate photo filtered: ${photo.id}`);
          return false;
        }
        seenIds.add(photo.id);
        return true;
      })
    );

    console.log(`📸 Total flattened photos: ${photos.length} from ${infiniteQuery.data.pages.length} pages`);
    return photos;
  }, [infiniteQuery.data?.pages]);

  // Get total count (use highest total from any page)
  const totalPhotos = useMemo(() => {
    if (!infiniteQuery.data?.pages?.length) return 0;
    const maxTotal = Math.max(...infiniteQuery.data.pages.map(page => page.total));
    console.log(`📊 Total photos calculation: ${maxTotal} from pages:`, infiniteQuery.data.pages.map(p => p.total));
    return maxTotal;
  }, [infiniteQuery.data?.pages]);

  // Enhanced logging for debugging
  console.log('🔍 useInfiniteMediaQuery state:', {
    shareToken: shareToken.substring(0, 8) + '...',
    photosCount: allPhotos.length,
    totalPhotos,
    isLoading: infiniteQuery.isLoading,
    isLoadingMore: infiniteQuery.isFetchingNextPage,
    hasNextPage: infiniteQuery.hasNextPage,
    isError: infiniteQuery.isError,
    errorMessage: infiniteQuery.error?.message
  });

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
    query: infiniteQuery // Expose full query for debugging
  };
};