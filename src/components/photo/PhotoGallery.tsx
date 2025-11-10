// components/photo/PhotoGallery.tsx - CORRECTED VERSION
'use client';

import { useState, useRef, useCallback, useMemo, useEffect, memo } from 'react';
import { XIcon, WifiIcon, WifiOffIcon, UploadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  useEventMedia,
  useInfiniteEventMediaFlat,
  useEventMediaCounts,
  useUploadMultipleMedia,
  useUpdateMediaStatus,
  useDeleteMedia,
  useGalleryUtils
} from '@/hooks/useMediaQueries';
import { StatusTabs } from '../album/StatusTabs';
import { EmptyState } from '../album/EmptyState';
import PhotoUploadDialog from '../album/PhotoUploadDialog';
import { FullscreenPhotoViewer } from './FullscreenPhotoViewer';
import { Photo, PhotoGalleryProps } from '@/types/PhotoGallery.types';
import { OptimizedPhotoGrid } from './PhotoGrid';
import { useWebSocketUploadProgress } from '@/hooks/useWebSocketUploadProgress';
import { useEventWebSocket } from '@/hooks/useEventWebSocket';
import { UploadProgressTab } from '../progress/upload-progress';
import UploadButton from '../guest/UploadButton';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { bulkDeleteMedia, bulkUpdateMediaStatus } from '@/services/apis/media.api';
import { useAuthToken } from '@/hooks/use-auth';

interface OptimizedPhotoGalleryProps extends PhotoGalleryProps {
  shareToken?: string;
}

export default function OptimizedPhotoGallery({
  eventId,
  albumId,
  shareToken,
  canUpload = true,
  userPermissions = {
    upload: true,
    download: false,
    moderate: true,
    delete: true
  },
  approvalMode = 'auto'
}: OptimizedPhotoGalleryProps) {
  // State management
  const [activeTab, setActiveTab] = useState<'approved' | 'pending' | 'rejected' | 'hidden'>('approved');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Query client for direct cache manipulation
  const queryClient = useQueryClient();

  // WebSocket connection for admin features
  const webSocket = useEventWebSocket(eventId, { userType: 'admin' });
  const gridQuality = 'small';

  // Data fetching hooks with thumbnail quality for grid
  const {
    photos: infinitePhotos = [],
    isLoading: infiniteLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error: infiniteError,
    refetch: refetchInfinite
  } = useInfiniteEventMediaFlat(eventId, {
    status: activeTab,
    limit: 20,
    quality: gridQuality,
    enabled: true
  });

  // Use infinite photos
  const photos = infinitePhotos;
  const isLoading = infiniteLoading;
  const photosError = infiniteError;
  const refetchPhotos = refetchInfinite;

  // Media counts
  const {
    data: mediaCounts,
    isLoading: countsLoading,
    refetch: refetchCounts
  } = useEventMediaCounts(eventId, userPermissions.moderate);

  // WebSocket-based upload progress monitoring
  const {
    uploadProgress,
    isMonitoring,
    summary,
    startMonitoring,
    stopMonitoring,
    clearAll,
    isConnected: wsConnected,
    isAuthenticated: wsAuthenticated
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
    showToasts: true
  });

  // CORRECTED: Use bulk operations mutation with proper approval status
  const uploadMutation = useUploadMultipleMedia(eventId, albumId, {
    onSuccess: (result) => {
      const { data } = result;
      setUploadDialogOpen(false);

      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';

      if (data?.uploads && Array.isArray(data.uploads)) {
        const successfulUploads = data.uploads.filter((upload: any) => upload.status !== 'failed');

        if (successfulUploads.length > 0) {
          const mediaIds = successfulUploads.map((upload: any) => upload.id);
          const filenames = successfulUploads.map((upload: any) => upload.filename || 'Unknown');

          startMonitoring(mediaIds, filenames);

          toast.success(`${successfulUploads.length} file${successfulUploads.length > 1 ? 's' : ''} uploaded successfully!`, {
            description: 'Photos are pending approval',
            duration: 4000
          });
        }

        const failedUploads = data.uploads.filter((upload: any) => upload.status === 'failed');
        if (failedUploads.length > 0) {
          toast.error(`${failedUploads.length} file${failedUploads.length > 1 ? 's' : ''} failed to upload`);
        }

        // ✅ CORRECTED: Replace temp photos with real photos showing S3 originalUrl
        if (successfulUploads.length > 0) {
          const realPhotos = successfulUploads.map((upload: any) => ({
            id: upload.mediaId,
            albumId: albumId,
            eventId: eventId,
            takenBy: 'You',
            imageUrl: upload.originalUrl,          // ✅ S3 URL - shows immediately
            thumbnail: upload.originalUrl,
            createdAt: upload.uploadedAt ? new Date(upload.uploadedAt) : new Date(),
            originalFilename: upload.filename || upload.fileName || 'Uploaded Image',
            processingStatus: 'processing' as const,  // ✅ CORRECTED from 'completed'
            processingProgress: 0,
            approval: {
              status: 'pending' as const,  // ✅ CORRECTED from 'approved'
            },
            processing: {
              status: 'processing' as const,  // ✅ CORRECTED from 'completed'
              variants_generated: false,
            },
            progressiveUrls: {
              placeholder: upload.originalUrl,
              thumbnail: upload.originalUrl,
              display: upload.originalUrl,
              full: upload.originalUrl,
              original: upload.originalUrl,
            },
            metadata: {
              width: 0,
              height: 0,
            },
            stats: {
              views: 0,
              downloads: 0,
              shares: 0,
              likes: 0,
            },
          }));

          // ✅ CORRECTED: Use 'pending' status in cache key, not 'approved'
          const qualities = ['small', 'medium', 'large', 'original'];

          qualities.forEach(quality => {
            const cacheKey = [...queryKeys.eventPhotos(eventId, 'pending'), 'infinite', quality];

            queryClient.setQueryData(cacheKey, (oldData: any) => {
              if (!oldData?.pages) {
                return {
                  pages: [{
                    photos: realPhotos,
                    nextPage: undefined,
                    hasMore: false
                  }],
                  pageParams: [1]
                };
              }

              const firstPage = oldData.pages[0] || { photos: [] };
              const newPhotos = [...realPhotos, ...(firstPage.photos || [])];

              return {
                ...oldData,
                pages: [{
                  ...firstPage,
                  photos: newPhotos
                }, ...oldData.pages.slice(1)]
              };
            });

            // Also update the regular (non-infinite) query if it exists
            const regularCacheKey = [...queryKeys.eventPhotos(eventId, 'pending'), quality];
            queryClient.setQueryData(regularCacheKey, (oldData: any) => {
              if (!oldData) return realPhotos;
              return [...realPhotos, ...oldData];
            });
          });
        }
      }

      refetchCounts();
      refetchPhotos();
      // ✅ CORRECTED: Always switch to pending tab after upload
      setActiveTab('pending');
    },
    onError: (error) => {
      console.error('Upload failed:', error);
      setUploadDialogOpen(false);
      toast.error('Upload failed', {
        description: error.message || 'Please try again',
        duration: 5000
      });
    }
  });

  // UPDATED: Use bulk operations for status updates
  const updateStatusMutation = useUpdateMediaStatus(eventId);
  const deleteMutation = useDeleteMedia(eventId);
  const { getCachedPhotoCount } = useGalleryUtils(eventId);

  // Bulk status update mutation
  const bulkStatusMutation = useMutation({
    mutationFn: async (params: {
      mediaIds: string[];
      status: 'approved' | 'pending' | 'rejected' | 'hidden';
      reason?: string;
    }) => {
      if (!token) throw new Error('Authentication required');
      console.log('🔄 Bulk updating media status:', {
        eventId,
        count: params.mediaIds.length,
        status: params.status,
        reason: params.reason
      });
      return await bulkUpdateMediaStatus(eventId, params.mediaIds, params.status, token, {
        reason: params.reason,
        hideReason: params.status === 'hidden' ? params.reason : undefined
      });
    },
    onSuccess: (result: any) => {
      console.log('✅ Bulk status update completed:', result);
      const params = bulkStatusMutation.variables as { status: string; mediaIds: string[] };

      // Handle cache updates for bulk operations
      if (result.data?.updatedMediaIds && result.data?.newStatus) {
        const { updatedMediaIds, newStatus } = result.data;
        const allStatuses = ['approved', 'pending', 'rejected', 'hidden', 'auto_approved'];
        const qualities = ['small', 'medium', 'large', 'original'];

        // Remove from all old status caches
        const removalPromises: Promise<any>[] = [];
        for (const oldStatus of allStatuses) {
          if (oldStatus === newStatus) continue; // Skip the new status

          for (const quality of qualities) {
            removalPromises.push(
              Promise.resolve(
                queryClient.setQueryData(
                  [...queryKeys.eventPhotos(eventId, oldStatus), 'infinite', quality],
                  (oldData: any) => {
                    if (!oldData?.pages) return oldData;
                    return {
                      ...oldData,
                      pages: oldData.pages.map((page: any) => ({
                        ...page,
                        photos: page.photos.filter((p: any) => !updatedMediaIds.includes(p.id))
                      }))
                    };
                  }
                )
              )
            );

            removalPromises.push(
              Promise.resolve(
                queryClient.setQueryData(
                  [...queryKeys.eventPhotos(eventId, oldStatus), quality],
                  (oldData: any) => {
                    if (!oldData) return oldData;
                    return oldData.filter((p: any) => !updatedMediaIds.includes(p.id));
                  }
                )
              )
            );
          }
        }

        // Invalidate new status cache to refetch
        const invalidationPromises: Promise<any>[] = [];
        for (const quality of qualities) {
          invalidationPromises.push(
            queryClient.invalidateQueries({
              queryKey: [...queryKeys.eventPhotos(eventId, newStatus), 'infinite', quality],
              exact: false,
              refetchType: 'all'
            })
          );

          invalidationPromises.push(
            queryClient.invalidateQueries({
              queryKey: [...queryKeys.eventPhotos(eventId, newStatus), quality],
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

        Promise.allSettled([...removalPromises, ...invalidationPromises]);
      } else {
        // Fallback to simple refetch if backend doesn't provide updatedMediaIds
        refetchPhotos();
        refetchCounts();
      }

      toast.success(`Successfully updated ${result.data?.modifiedCount || params?.mediaIds.length} media items to ${params?.status}`);
      setSelectedPhotos(new Set());
    },
    onError: (error: any) => {
      console.error('❌ Bulk status update failed:', error);
      toast.error(error.message || 'Failed to update media status');
    }
  });

  // Progress panel handlers
  const handleRemoveProgressItem = useCallback((mediaId: string) => {
    stopMonitoring([mediaId]);
  }, [stopMonitoring]);

  const handleClearAll = useCallback(() => {
    clearAll();
  }, [clearAll]);

  const handleRetryUpload = useCallback((mediaId: string) => {
    console.log('Retry upload not implemented yet:', mediaId);
    toast.info('Retry feature will be available when queue management is implemented');
  }, []);

  const handleCancelUpload = useCallback((mediaId: string) => {
    console.log('Cancel upload not implemented yet:', mediaId);
    toast.info('Cancel feature will be available when queue management is implemented');
  }, []);

  const handlePauseResumeUpload = useCallback((mediaId: string, action: 'pause' | 'resume') => {
    console.log(`${action} upload not implemented yet:`, mediaId);
    toast.info(`${action} feature will be available when queue management is implemented`);
  }, []);

  // WebSocket connection status indicator
  const ConnectionStatus = memo(() => {
    if (!wsConnected) {
      return (
        <div className="flex items-center gap-2 text-xs text-red-600">
          <WifiOffIcon className="h-3 w-3" />
          <span>Disconnected</span>
        </div>
      );
    }

    if (!wsAuthenticated) {
      return (
        <div className="flex items-center gap-2 text-xs text-yellow-600">
          <WifiIcon className="h-3 w-3" />
          <span>Connecting...</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-xs text-green-600">
        <WifiIcon className="h-3 w-3" />
        <span>Connected</span>
      </div>
    );
  });

  // Memoized computed values
  const canUserUpload = useMemo(() =>
    canUpload && userPermissions.upload,
    [canUpload, userPermissions.upload]
  );

  const displayCounts = useMemo(() =>
    mediaCounts || {
      approved: getCachedPhotoCount('approved'),
      pending: getCachedPhotoCount('pending'),
      rejected: getCachedPhotoCount('rejected'),
      hidden: getCachedPhotoCount('hidden'),
      total: getCachedPhotoCount('approved') + getCachedPhotoCount('pending') + getCachedPhotoCount('rejected') + getCachedPhotoCount('hidden')
    },
    [mediaCounts, getCachedPhotoCount]
  ) as { approved: number; pending: number; rejected: number; hidden: number; total: number; };

  // Event handlers
  const handleTabChange = useCallback((newTab: typeof activeTab) => {
    if (newTab === activeTab) return;

    console.log(`Switching to tab: ${newTab}`);
    setActiveTab(newTab);
    setSelectedPhoto(null);
    setPhotoViewerOpen(false);
    setSelectionMode(false);
    setSelectedPhotos(new Set());
  }, [activeTab]);

  // UPDATED: Use bulk operations for status updates
  const handleStatusUpdate = useCallback((photoId: string, status: string, reason?: string) => {
    console.log('Status update requested:', { photoId, status, reason });

    updateStatusMutation.mutate({
      mediaId: photoId,
      status: status as 'approved' | 'pending' | 'rejected' | 'hidden',
      reason
    });
  }, [updateStatusMutation]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!canUserUpload) {
      toast.error("You don't have permission to upload photos to this event.");
      return;
    }

    const validFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`"${file.name}" is not a valid image file.`);
        return false;
      }

      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        toast.error(`"${file.name}" is too large (${sizeMB}MB). Maximum size is 100MB.`);
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) {
      toast.error("No valid image files to upload.");
      return;
    }

    toast.success(`Starting upload of ${validFiles.length} file${validFiles.length > 1 ? 's' : ''}...`);
    uploadMutation.mutate(validFiles);
  }, [canUserUpload, uploadMutation]);

  const openPhotoViewer = useCallback((photo: Photo, index: number) => {
    if (photo.status === 'uploading' || photo.isTemporary) return;

    console.log('Opening photo viewer with full quality for:', photo.id);
    setSelectedPhoto(photo);
    setSelectedPhotoIndex(index);
    setPhotoViewerOpen(true);
  }, []);

  const closePhotoViewer = useCallback(() => {
    setPhotoViewerOpen(false);
    setSelectedPhoto(null);
    setSelectedPhotoIndex(null);
  }, []);

  const navigatePhoto = useCallback((direction: 'next' | 'prev') => {
    if (selectedPhotoIndex === null || photos.length <= 1) return;

    let newIndex: number;
    if (direction === 'next') {
      newIndex = selectedPhotoIndex < photos.length - 1 ? selectedPhotoIndex + 1 : 0;
    } else {
      newIndex = selectedPhotoIndex > 0 ? selectedPhotoIndex - 1 : photos.length - 1;
    }

    console.log(`Navigating to photo ${newIndex + 1}/${photos.length}`);
    setSelectedPhotoIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  }, [selectedPhotoIndex, photos]);

  const handleDelete = useCallback((photoId: string) => {
    if (!userPermissions.delete) {
      toast.error("You don't have permission to delete photos.");
      return;
    }
    deleteMutation.mutate(photoId);
  }, [userPermissions.delete, deleteMutation]);

  const handleDownload = useCallback((photo: Photo) => {
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
  }, [userPermissions.download]);

  // Selection handlers
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => !prev);
    if (selectionMode) {
      setSelectedPhotos(new Set());
    }
  }, [selectionMode]);

  const togglePhotoSelection = useCallback((photoId: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  }, []);

  const selectAllPhotos = useCallback(() => {
    const allPhotoIds = photos.map(photo => photo.id);
    setSelectedPhotos(new Set(allPhotoIds));
  }, [photos]);

  const deselectAllPhotos = useCallback(() => {
    setSelectedPhotos(new Set());
  }, []);

  // Get auth token at component level (following Rules of Hooks)
  const token = useAuthToken();

  const handleBulkDelete = useCallback(async () => {
    if (!userPermissions.delete) {
      toast.error("You don't have permission to delete photos.");
      return;
    }

    if (selectedPhotos.size === 0) {
      toast.error("No photos selected.");
      return;
    }

    const confirmed = confirm(`Delete ${selectedPhotos.size} photo${selectedPhotos.size > 1 ? 's' : ''} permanently?`);
    if (!confirmed) return;

    try {
      // Use the new bulk delete API
      if (!token) {
        toast.error("Authentication required");
        return;
      }
      const result = await bulkDeleteMedia(eventId, Array.from(selectedPhotos), token);

      if (result.deleted > 0) {
        setSelectedPhotos(new Set());
        toast.success(`Successfully deleted ${result.deleted} photo${result.deleted > 1 ? 's' : ''}`);
        refetchPhotos();
        refetchCounts();
      }

      if (result.failed > 0) {
        toast.error(`Failed to delete ${result.failed} photo${result.failed > 1 ? 's' : ''}`);
      }
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      toast.error(error.message || "Failed to delete photos");
    }
  }, [selectedPhotos, userPermissions.delete, eventId, token, refetchPhotos, refetchCounts]);

  const handleBulkDownload = useCallback(async () => {
    if (!userPermissions.download) {
      toast.error("You don't have permission to download photos.");
      return;
    }

    if (selectedPhotos.size === 0) {
      toast.error("No photos selected.");
      return;
    }

    try {
      const selectedPhotosData = photos.filter(photo => selectedPhotos.has(photo.id));
      const downloadPromises = selectedPhotosData.map(async (photo) => {
        const originalUrl = photo.image_variants?.original?.url || photo.imageUrl;
        const response = await fetch(originalUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `photo-${photo.id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });

      await Promise.all(downloadPromises);
      toast.success(`Downloaded ${selectedPhotos.size} photo${selectedPhotos.size > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Bulk download failed:', error);
      toast.error("Failed to download some photos");
    }
  }, [selectedPhotos, photos, userPermissions.download]);

  const handleBulkStatusUpdate = useCallback(async (status: 'approved' | 'pending' | 'rejected' | 'hidden', reason?: string) => {
    if (!userPermissions.moderate) {
      toast.error("You don't have permission to moderate photos.");
      return;
    }

    if (selectedPhotos.size === 0) {
      toast.error("No photos selected.");
      return;
    }

    if (selectedPhotos.size > 100) {
      toast.error("Cannot update more than 100 photos at once.");
      return;
    }

    try {
      await bulkStatusMutation.mutateAsync({
        mediaIds: Array.from(selectedPhotos),
        status,
        reason
      });
    } catch (error) {
      console.error('Bulk status update failed:', error);
    }
  }, [selectedPhotos, userPermissions.moderate, bulkStatusMutation]);

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

  // WebSocket connection status effects
  useEffect(() => {
    if (wsConnected && wsAuthenticated) {
      console.log('WebSocket connected and authenticated for upload progress');
    }
  }, [wsConnected, wsAuthenticated]);

  // Cleanup bulk operations on unmount
  useEffect(() => {
    return () => {
      // Cleanup if needed
    };
  }, []);

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            mediaCounts={displayCounts}
            userPermissions={userPermissions}
          />

          <div className="text-xs text-gray-500">
            Infinite scroll ({photos.length} loaded)
          </div>
        </div>

        {/* Selection Mode Toggle */}
        <div className="flex items-center gap-2">
          {selectionMode && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllPhotos}
                disabled={selectedPhotos.size === photos.length}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAllPhotos}
                disabled={selectedPhotos.size === 0}
              >
                Deselect All
              </Button>
              {selectedPhotos.size > 0 && (
                <>
                  {userPermissions.moderate && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkStatusUpdate('approved')}
                        className="text-green-600"
                      >
                        Approve ({selectedPhotos.size})
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkStatusUpdate('pending')}
                        className="text-yellow-600"
                      >
                        Pending ({selectedPhotos.size})
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkStatusUpdate('rejected')}
                        className="text-orange-600"
                      >
                        Reject ({selectedPhotos.size})
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkStatusUpdate('hidden')}
                        className="text-gray-600"
                      >
                        Hide ({selectedPhotos.size})
                      </Button>
                    </>
                  )}
                  {userPermissions.download && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkDownload}
                      className="text-blue-600"
                    >
                      Download ({selectedPhotos.size})
                    </Button>
                  )}
                  {userPermissions.delete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="text-red-600"
                    >
                      Delete ({selectedPhotos.size})
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
          <Button
            variant={selectionMode ? "default" : "outline"}
            size="sm"
            onClick={toggleSelectionMode}
          >
            {selectionMode ? 'Exit Select' : 'Select'}
          </Button>
        </div>

        <UploadProgressTab
          uploadProgress={uploadProgress}
          isMonitoring={isMonitoring}
          summary={summary}
          onClearAll={handleClearAll}
          onRemoveItem={handleRemoveProgressItem}
          onRetryItem={handleRetryUpload}
          onCancelItem={handleCancelUpload}
          onPauseResumeItem={handlePauseResumeUpload}
          className="transition-all duration-300"
        />

        <div className="flex items-center gap-2">
          {process.env.NODE_ENV === 'development' && (
            <>
              <ConnectionStatus />
              <Button
                onClick={handleManualRefresh}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Refresh {/* Right now the refresh button is only for dev env, it will dissapear on prod */}
              </Button>
              {updateStatusMutation.isPending && (
                <Badge variant="secondary" className="text-xs">
                  Processing operations
                </Badge>
              )}
            </>
          )}

          {canUserUpload && (
            <PhotoUploadDialog
              open={uploadDialogOpen}
              setOpen={setUploadDialogOpen}
              isUploading={uploadMutation.isPending}
              approvalMode={approvalMode}
              onFileUpload={handleFileUpload}
              fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
              cameraInputRef={cameraInputRef as React.RefObject<HTMLInputElement>}
            />
          )}

          <UploadButton
            eventId={eventId}
            onUploadComplete={(mediaData) => {
              console.log('Guest upload completed:', mediaData);

              // ✅ CORRECTED: Create temp photo with proper states
              const tempPhoto: Photo = {
                id: mediaData.mediaId,
                albumId: undefined,
                eventId: eventId,
                takenBy: 'Guest',
                imageUrl: mediaData.originalUrl,           // ✅ S3 URL - shows immediately
                thumbnail: mediaData.originalUrl,
                createdAt: new Date(),
                originalFilename: mediaData.fileName,
                processingStatus: 'processing' as const,  // ✅ CORRECTED from 'completed'
                processingProgress: 0,
                approval: {
                  status: 'pending' as const,  // ✅ CORRECTED from 'approved'
                },
                processing: {
                  status: 'processing' as const,  // ✅ CORRECTED from 'completed'
                  variants_generated: false,
                },
                progressiveUrls: {
                  placeholder: mediaData.originalUrl,
                  thumbnail: mediaData.originalUrl,
                  display: mediaData.originalUrl,
                  full: mediaData.originalUrl,
                  original: mediaData.originalUrl,
                },
                metadata: {
                  width: 0,
                  height: 0,
                },
                stats: {
                  views: 0,
                  downloads: 0,
                  shares: 0,
                  likes: 0,
                },
              };

              // ✅ CORRECTED: Use 'pending' status in cache key, not 'approved'
              const cacheKey = [...queryKeys.eventPhotos(eventId, 'pending'), 'infinite', gridQuality];

              queryClient.setQueryData(cacheKey, (oldData: any) => {
                if (!oldData?.pages) {
                  return {
                    pages: [{
                      photos: [tempPhoto],
                      nextPage: undefined,
                      hasMore: false
                    }],
                    pageParams: [1]
                  };
                }

                const firstPage = oldData.pages[0] || { photos: [] };
                return {
                  ...oldData,
                  pages: [{
                    ...firstPage,
                    photos: [tempPhoto, ...(firstPage.photos || [])]
                  }, ...oldData.pages.slice(1)]
                };
              });

              // Also update regular query
              const regularKey = [...queryKeys.eventPhotos(eventId, 'pending'), gridQuality];
              queryClient.setQueryData(regularKey, (oldData: any) => {
                if (!oldData) return [tempPhoto];
                return [tempPhoto, ...oldData];
              });

              // Trigger monitoring and switch tab
              if (mediaData.mediaId) {
                startMonitoring([mediaData.mediaId], [mediaData.fileName]);
                setActiveTab('pending');  // ✅ CORRECTED from 'approved'
              }

              refetchCounts();
            }}
          />
        </div>
      </div>

      {(updateStatusMutation.isPending || uploadMutation.isPending || bulkStatusMutation.isPending) && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-blue-700 dark:text-blue-300">
            {uploadMutation.isPending ? 'Starting upload...' :
             bulkStatusMutation.isPending ? 'Updating media status...' :
             'Processing status updates...'}
          </span>
        </div>
      )}

      {isLoading || countsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3 md:gap-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <EmptyState
          activeTab={activeTab}
          canUserUpload={canUserUpload}
          isUploading={uploadMutation.isPending}
          onUploadClick={() => setUploadDialogOpen(true)}
        />
      ) : (
        <>
          <OptimizedPhotoGrid
            photos={photos}
            onPhotoClick={openPhotoViewer}
            userPermissions={userPermissions}
            currentTab={activeTab}
            onStatusUpdate={handleStatusUpdate}
            onDownload={handleDownload}
            onDelete={handleDelete}
            selectionMode={selectionMode}
            selectedPhotos={selectedPhotos}
            onToggleSelection={togglePhotoSelection}
          />

          {hasNextPage && (
            <div className="flex justify-center pt-6">
              <Button
                onClick={handleLoadMore}
                disabled={isFetchingNextPage}
                variant="outline"
              >
                {isFetchingNextPage ? 'Loading...' : 'Load More Photos'}
              </Button>
            </div>
          )}

          {photoViewerOpen && selectedPhoto && (
            <FullscreenPhotoViewer
              selectedPhoto={selectedPhoto as any}
              selectedPhotoIndex={selectedPhotoIndex}
              photos={photos as any}
              userPermissions={userPermissions}
              onClose={closePhotoViewer}
              onPrev={() => navigatePhoto('prev')}
              onNext={() => navigatePhoto('next')}
              deletePhoto={handleDelete}
              downloadPhoto={(photo: any) => handleDownload(photo)}
            />
          )}
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
}