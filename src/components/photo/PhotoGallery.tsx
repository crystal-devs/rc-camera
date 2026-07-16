/**
 * OptimizedPhotoGallery - Refactored main component
 * Reduced from 1241 lines to ~400 lines by extracting hooks and components
 */

'use client';

import { useRef, useCallback, useMemo, useEffect } from 'react';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  useInfiniteEventMediaFlat,
  useEventMediaCounts,
  useUpdateMediaStatus,
  useToggleMediaFavorite,
  useDeleteMedia,
  useGalleryUtils,
} from '@/hooks/useMediaQueries';
import { EmptyState } from '../album/EmptyState';
import { FullscreenPhotoViewer } from './FullscreenPhotoViewer';
import { Photo, PhotoGalleryProps } from '@/types/PhotoGallery.types';
import { MediaGrid, AdminMediaTile } from '@/components/media-gallery';
import { useWebSocketUploadProgress } from '@/hooks/useWebSocketUploadProgress';
import { useEventWebSocket } from '@/hooks/useEventWebSocket';
import { UploadProgressTab } from '../progress/upload-progress';
import UploadButton from '../guest/UploadButton';
import useEventStore from '@/stores/useEventStore';
import { updateEvent } from '@/services/apis/events.api';
import { useSecureAuth } from '@/contexts/SecureAuthContext';
import { useScrollContainer } from '@/contexts/ScrollContext';

// Extracted hooks
import { usePhotoGalleryState } from './hooks/usePhotoGalleryState';
import { usePhotoSelection } from './hooks/usePhotoSelection';
import { useBulkPhotoOperations } from './hooks/useBulkPhotoOperations';
import { usePhotoUpload } from './hooks/usePhotoUpload';

// Extracted components
import { GalleryHeader } from './components/GalleryHeader/GalleryHeader';
import { FloatingActionBar } from './components/BulkActions/FloatingActionBar';
import { InfiniteScrollSentinel } from './components/PhotoGrid/InfiniteScrollSentinel';
import { PhotoGridSkeleton } from './components/PhotoGrid/PhotoGridSkeleton';

// Utils
import { isGuestUser } from './utils/permissionUtils';
import { invalidateAllPhotoCaches, invalidateMediaCounts } from './utils/cacheUtils';
import { useQueryClient } from '@tanstack/react-query';

interface OptimizedPhotoGalleryProps extends PhotoGalleryProps { }

export default function OptimizedPhotoGallery({
  eventId,
  albumId,
  canUpload = true,
  subEventId,
  sort,
  search,
  userPermissions = {
    upload: true,
    download: false,
    moderate: true,
    delete: true,
  },
  displayConfig, // 🚀 EXTRACTED
}: OptimizedPhotoGalleryProps) {
  // Get user role from event store
  const { selectedEvent } = useEventStore();
  const userRole = selectedEvent?.user_role || 'participant';
  const isGuest = isGuestUser(userRole);
  const { scrollRef } = useScrollContainer();

  // Refs
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // WebSocket connection
  const webSocket = useEventWebSocket(eventId, { userType: 'admin' });
  const gridQuality = 'small';

  // Custom hooks for state management
  const galleryState = usePhotoGalleryState({
    userRole,
    userPermissions,
    canUpload,
  });

  const selection = usePhotoSelection();

  // Data fetching - force approved for guests
  const mediaStatus = isGuest ? 'approved' : galleryState.activeTab;
  const {
    photos: infinitePhotos = [],
    isLoading: infiniteLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error: infiniteError,
    refetch: refetchInfinite,
  } = useInfiniteEventMediaFlat(eventId, {
    status: mediaStatus,
    limit: 50,
    quality: gridQuality,
    enabled: true,
    subEventId,
    sort,
    search,
  });

  const photos = infinitePhotos;
  const photosError = infiniteError;
  const isLoading = infiniteLoading;
  const refetchPhotos = refetchInfinite;

  // Media counts
  const {
    data: mediaCounts,
    isLoading: countsLoading,
    refetch: refetchCounts,
  } = useEventMediaCounts(eventId, userPermissions.moderate);

  const { getCachedPhotoCount } = useGalleryUtils(eventId);

  // WebSocket-based upload progress monitoring
  const {
    uploadProgress,
    isMonitoring,
    summary,
    startMonitoring,
    stopMonitoring,
    clearAll,
    isConnected: wsConnected,
    isAuthenticated: wsAuthenticated,
  } = useWebSocketUploadProgress(eventId, {
    onComplete: (mediaId, data) => {
      console.log('Upload completed:', mediaId, data);
      refetchPhotos();
      refetchCounts();
    },
    onFailed: (mediaId, data) => {
      console.log('Upload failed:', mediaId, data);
      refetchPhotos();
    },
    showToasts: true,
  });

  // Upload hook
  const upload = usePhotoUpload({
    eventId,
    albumId: albumId || undefined,
    canUpload: galleryState.canUserUploadPhotos,
    onUploadStart: (mediaIds, filenames) => {
      startMonitoring(mediaIds, filenames);
    },
    onUploadComplete: () => {
      refetchCounts();
    },
    onTabChange: (tab) => {
      galleryState.handleTabChange(tab);
    },
  });

  // Bulk operations hook
  const bulkOps = useBulkPhotoOperations({
    eventId,
    permissions: galleryState.effectivePermissions,
    onSuccess: () => {
      selection.deselectAllPhotos();
      refetchPhotos();
      refetchCounts();
    },
  });

  // Single photo operations
  const updateStatusMutation = useUpdateMediaStatus(eventId);
  const deleteMutation = useDeleteMedia(eventId);
  const favoriteMutation = useToggleMediaFavorite(eventId);

  const handleToggleFavorite = useCallback(
    (photo: Photo) => {
      favoriteMutation.mutate({ mediaId: photo.id, favorite: !photo.isFavorite });
    },
    [favoriteMutation]
  );

  // Display counts with fallback
  const displayCounts = useMemo(
    () =>
      mediaCounts || {
        approved: getCachedPhotoCount('approved'),
        pending: getCachedPhotoCount('pending'),
        rejected: getCachedPhotoCount('rejected'),
        hidden: getCachedPhotoCount('hidden'),
        total:
          getCachedPhotoCount('approved') +
          getCachedPhotoCount('pending') +
          getCachedPhotoCount('rejected') +
          getCachedPhotoCount('hidden'),
      },
    [mediaCounts, getCachedPhotoCount]
  ) as { approved: number; pending: number; rejected: number; hidden: number; total: number };

  // Event handlers
  const handleStatusUpdate = useCallback(
    (photoId: string, status: string, reason?: string) => {
      updateStatusMutation.mutate({
        mediaId: photoId,
        status: status as 'approved' | 'pending' | 'rejected' | 'hidden',
        reason,
      });
    },
    [updateStatusMutation]
  );

  const handleDelete = useCallback(
    (photoId: string) => {
      if (!userPermissions.delete) {
        toast.error("You don't have permission to delete photos.");
        return;
      }
      deleteMutation.mutate(photoId);
    },
    [userPermissions.delete, deleteMutation]
  );

  // Set Cover Image Handler
  const { getAccessToken } = useSecureAuth();
  // selectedEvent is already destructured at the top level
  const { updateEventInStore } = useEventStore();

  const handleSetCover = useCallback(async (photo: Photo) => {
    // 1. Strict Permission Check
    if (userRole !== 'creator' && userRole !== 'co_host') {
      toast.error("You don't have permission to change the cover image.");
      return;
    }

    const previousCover = selectedEvent?.cover_image;
    const token = getAccessToken();

    if (!token) {
      toast.error("Authentication required.");
      return;
    }

    // 2. Optimistic Update
    const newCoverImage = {
      url: photo.imageUrl,
      public_id: photo.id,
      uploaded_by: photo.uploaded_by || null, // Ensure ID or null, not a name string
      thumbnail_url: photo.thumbnail || '' // Ensure string
    };

    // Update store immediately
    updateEventInStore(eventId, {
      cover_image: newCoverImage as any
    });

    toast.promise(
      updateEvent(eventId, { cover_image: newCoverImage }, token),
      {
        loading: 'Updating cover image...',
        success: () => {
          return 'Cover image updated successfully';
        },
        error: (err) => {
          // 3. Rollback on failure
          console.error("Failed to update cover:", err);
          if (previousCover) {
            updateEventInStore(eventId, { cover_image: previousCover });
          }
          return 'Failed to update cover image';
        }
      }
    );
  }, [eventId, userRole, selectedEvent, updateEventInStore, getAccessToken]);

  const handleDownload = useCallback(
    (photo: Photo) => {
      if (!userPermissions.download) {
        toast.error("You don't have permission to download photos.");
        return;
      }

      const link = document.createElement('a');
      link.href = photo.imageUrl;
      link.download = `photo-${photo.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [userPermissions.download]
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleManualRefresh = useCallback(() => {
    console.log('Manual refresh triggered');
    refetchPhotos();
    refetchCounts();
    toast.info('Refreshing data...');
  }, [refetchPhotos, refetchCounts]);

  // Progress panel handlers
  const handleRemoveProgressItem = useCallback(
    (mediaId: string) => {
      stopMonitoring([mediaId]);
    },
    [stopMonitoring]
  );

  const handleClearAll = useCallback(() => {
    clearAll();
    upload.clearManualProgress();
  }, [clearAll, upload]);

  const handleDismissProgress = useCallback(() => {
    if (summary.uploading === 0 && summary.processing === 0) {
      handleClearAll();
    }
  }, [summary.uploading, summary.processing, handleClearAll]);

  // Combined upload progress
  const combinedUploadProgress = useMemo(() => {
    const combined: any = {};
    const now = new Date();

    // Add manual upload progress
    Object.entries(upload.manualUploadProgress).forEach(([fileName, percentage]) => {
      const id = `client-${fileName}`;
      combined[id] = {
        mediaId: id,
        filename: fileName,
        stage: 'uploading',
        percentage: Math.round(percentage),
        status: 'uploading' as const,
        startTime: now,
      };
    });

    // Add/override with backend progress
    Object.entries(uploadProgress).forEach(([mediaId, item]) => {
      const clientKey = Object.keys(combined).find((k) => combined[k].filename === item.filename);

      if (clientKey && item.status === 'processing') {
        combined[clientKey] = {
          ...item,
          percentage: item.percentage || 100,
        };
      } else if (!clientKey) {
        combined[mediaId] = item;
      }
    });

    return combined;
  }, [uploadProgress, upload.manualUploadProgress]);

  const combinedSummary = useMemo(() => {
    const values = Object.values(combinedUploadProgress) as any[];
    const total = values.length;
    if (total === 0)
      return { total: 0, uploading: 0, processing: 0, completed: 0, failed: 0, overallProgress: 0 };

    const uploading = values.filter((p) => p.status === 'uploading').length;
    const processing = values.filter((p) => p.status === 'processing').length;
    const completed = values.filter((p) => p.status === 'completed').length;
    const failed = values.filter((p) => p.status === 'failed').length;

    const overallProgress = Math.round(
      values.reduce((acc, p) => acc + (p.percentage || 0), 0) / total
    );

    return { total, uploading, processing, completed, failed, overallProgress };
  }, [combinedUploadProgress]);

  const isCombinedMonitoring = Object.keys(combinedUploadProgress).length > 0;

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          console.log('📜 Infinite scroll triggered - loading more photos');
          fetchNextPage();
        }
      },
      {
        root: scrollRef.current, // Explicitly check against the scroll container
        rootMargin: '500px', // Pre-fetch when within 500px of bottom
        threshold: 0.1,
      }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Auto-load for very small initial loads only (fill the screen)
  useEffect(() => {
    // Only auto-load if we have very few photos (e.g. initial load didn't fill screen)
    if (photos.length > 0 && photos.length < 15 && !isLoading && !isFetchingNextPage && hasNextPage) {
      const timer = setTimeout(() => {
        fetchNextPage();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage, photos.length]);

  // Error handling
  if (photosError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="bg-red-100 dark:bg-red-900 p-4 rounded-full mb-4">
          <XIcon className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-xl font-medium text-red-700 dark:text-red-300 mb-2">
          Failed to Load Photos
        </h3>
        <p className="text-red-600 dark:text-red-400 text-center max-w-md mb-6">
          {photosError.message || 'Something went wrong while loading photos.'}
        </p>
        <div className="flex gap-2">
          <Button onClick={() => refetchPhotos()} variant="outline">
            Try Again
          </Button>
          <Button onClick={handleManualRefresh} variant="outline">
            Force Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gallery Header */}
      <GalleryHeader
        activeTab={galleryState.activeTab}
        onTabChange={galleryState.handleTabChange}
        counts={displayCounts}
        onRefresh={handleManualRefresh}
        isGuest={isGuest}
        photoCount={photos.length}
        wsConnected={wsConnected}
        wsAuthenticated={wsAuthenticated}
        selectedCount={selection.getSelectedCount()}
        onDeselectAll={selection.deselectAllPhotos}
      />

      {/* Upload Progress */}
      <UploadProgressTab
        uploadProgress={combinedUploadProgress}
        isMonitoring={isCombinedMonitoring}
        summary={combinedSummary}
        onClearAll={handleDismissProgress}
        onRemoveItem={handleRemoveProgressItem}
        onRetryItem={(mediaId) => toast.info('Retry feature coming soon')}
        onCancelItem={(mediaId) => toast.info('Cancel feature coming soon')}
        onPauseResumeItem={(mediaId, action) => toast.info(`${action} feature coming soon`)}
        className="transition-all duration-300"
      />

      {/* Upload Controls */}
      <div className="flex items-center gap-2">
        {process.env.NODE_ENV === 'development' && updateStatusMutation.isPending && (
          <Badge variant="secondary" className="text-xs">
            Processing operations
          </Badge>
        )}

        <UploadButton
          eventId={eventId}
          onUpload={upload.validateAndUpload}
          isUploading={upload.isUploading}
        />
      </div>

      {/* Loading Indicator */}
      {(updateStatusMutation.isPending || upload.isUploading || bulkOps.isUpdating) && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-blue-700 dark:text-blue-300">
            {upload.isUploading
              ? 'Starting upload...'
              : bulkOps.isUpdating
                ? 'Updating media status...'
                : 'Processing status updates...'}
          </span>
        </div>
      )}

      {/* Photo Grid or Empty State */}
      {isLoading || countsLoading ? (
        <PhotoGridSkeleton count={16} />
      ) : photos.length === 0 ? (
        <EmptyState
          activeTab={galleryState.activeTab}
          canUserUpload={galleryState.canUserUploadPhotos}
          isUploading={upload.isUploading}
          onUploadClick={() => {
            toast.info("Please use the 'Choose Files' button above to upload photos.");
          }}
        />
      ) : (
        <>
          {/* Photo Grid */}
          <MediaGrid
            items={photos}
            layout="rows"
            targetRowHeight={displayConfig?.targetRowHeight}
            gap={8}
            scrollContainerRef={scrollRef}
            hasNextPage={hasNextPage}
            isLoadingMore={isFetchingNextPage}
            onLoadMore={handleLoadMore}
            renderItem={({ item, index, width, priority }) => (
              <AdminMediaTile
                photo={item}
                index={index}
                displayWidth={width}
                priority={priority}
                onPhotoClick={galleryState.openPhotoViewer}
                userPermissions={galleryState.effectivePermissions}
                onStatusUpdate={handleStatusUpdate}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onSetCover={handleSetCover}
                selectionMode={selection.getSelectedCount() > 0}
                isSelected={selection.selectedPhotos.has(item.id)}
                onSelect={(photoId, idx, e) =>
                  selection.selectPhoto(photoId, idx, photos, { shift: e.shiftKey })
                }
                onToggleFavorite={handleToggleFavorite}
              />
            )}
          />

          {/* Floating Bulk Action Bar */}
          {!isGuest && (
            <FloatingActionBar
              selectedCount={selection.getSelectedCount()}
              totalCount={photos.length}
              onDeselect={selection.deselectAllPhotos}
              onSelectAll={() => selection.selectAllPhotos(photos)}
              onApprove={
                galleryState.activeTab !== 'approved'
                  ? () => bulkOps.handleBulkStatusUpdate(selection.selectedPhotos, 'approved')
                  : undefined
              }
              onReject={
                galleryState.activeTab !== 'rejected'
                  ? () => bulkOps.handleBulkStatusUpdate(selection.selectedPhotos, 'rejected')
                  : undefined
              }
              onHide={
                galleryState.activeTab !== 'hidden'
                  ? () => bulkOps.handleBulkStatusUpdate(selection.selectedPhotos, 'hidden')
                  : undefined
              }
              onDownload={() => bulkOps.handleBulkDownload(selection.selectedPhotos, photos)}
              onDelete={() => bulkOps.handleBulkDelete(selection.selectedPhotos)}
              permissions={galleryState.effectivePermissions}
              currentTab={galleryState.activeTab}
            />
          )}

          {/* Infinite Scroll Sentinel */}
          <InfiniteScrollSentinel
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={handleLoadMore}
            sentinelRef={loadMoreRef}
          />

          {/* Loading skeleton for next page */}
          {isFetchingNextPage && <PhotoGridSkeleton count={8} />}

          {/* Fullscreen Photo Viewer */}
          {galleryState.photoViewerOpen && galleryState.selectedPhoto && (
            <FullscreenPhotoViewer
              selectedPhoto={galleryState.selectedPhoto as any}
              selectedPhotoIndex={galleryState.selectedPhotoIndex}
              photos={photos as any}
              userPermissions={galleryState.effectivePermissions}
              onClose={galleryState.closePhotoViewer}
              onPrev={() => galleryState.navigatePhoto('prev', photos)}
              onNext={() => galleryState.navigatePhoto('next', photos)}
              deletePhoto={handleDelete}
              downloadPhoto={(photo: any) => handleDownload(photo)}
            />
          )}
        </>
      )}
    </div>
  );
}