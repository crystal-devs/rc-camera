// hooks/useInfiniteScroll.ts - Final Clean Version
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

interface MediaPage {
  photos: TransformedPhoto[];
  hasNext: boolean;
  total: number;
  page: number;
}

export const useInfiniteMediaQuery = ({
  shareToken,
  auth,
  limit = 5,
  enabled = true
}: UseInfiniteMediaQueryProps) => {
  
  const fetchMediaPage = useCallback(async ({ pageParam = 1 }): Promise<MediaPage> => {
    const options: MediaFetchOptions = {
      page: pageParam,
      limit,
      scroll_type: 'pagination',
      quality: 'display'
    };

    const response = await getEventMediaWithGuestToken(shareToken, auth, options);
    
    if (!response?.data || !Array.isArray(response.data)) {
      return {
        photos: [],
        hasNext: false,
        total: 0,
        page: pageParam
      };
    }

    // Transform and filter approved photos
    const transformedPhotos = response.data.map(transformApiPhoto);
    const approvedPhotos = transformedPhotos.filter(photo =>
      !photo.approval ||
      photo.approval.status === 'approved' ||
      photo.approval.status === 'auto_approved'
    );

    // Handle different API response formats for pagination
    let hasNext = false;
    let total = 0;

    if (response.other?.pagination) {
      hasNext = Boolean(response.other.pagination.hasNext);
      total = response.other.pagination.totalCount || 0;
    } else if (response.pagination) {
      hasNext = Boolean(response.pagination.hasNext);
      total = response.pagination.totalCount || response.pagination.total || 0;
    } else {
      // Estimate based on data length
      hasNext = approvedPhotos.length === limit;
      total = approvedPhotos.length;
    }

    return {
      photos: approvedPhotos,
      hasNext,
      total,
      page: pageParam
    };
  }, [shareToken, auth, limit]);

  const infiniteQuery = useInfiniteQuery({
    queryKey: ['event-media', shareToken, limit],
    queryFn: fetchMediaPage,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.hasNext ? lastPage.page + 1 : undefined;
    },
    enabled: enabled && !!shareToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.status === 404 || error?.status === 403) {
        return false;
      }
      return failureCount < 2;
    }
  });

  // Flatten all photos from all pages with deduplication
  const allPhotos = useMemo(() => {
    if (!infiniteQuery.data?.pages) return [];
    
    const seenIds = new Set<string>();
    return infiniteQuery.data.pages.flatMap(page => 
      page.photos.filter(photo => {
        if (seenIds.has(photo.id)) return false;
        seenIds.add(photo.id);
        return true;
      })
    );
  }, [infiniteQuery.data?.pages]);

  // Get total count (use highest total from any page)
  const totalPhotos = useMemo(() => {
    if (!infiniteQuery.data?.pages?.length) return 0;
    return Math.max(...infiniteQuery.data.pages.map(page => page.total));
  }, [infiniteQuery.data?.pages]);

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
    query: infiniteQuery
  };
};