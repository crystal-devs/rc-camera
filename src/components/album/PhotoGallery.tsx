// components/OptimizedPhotoGallery.tsx - ENHANCED with instant upload feedback

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
import { useUploadStatusMonitor } from '@/hooks/useUploadStatusMonitor';
import { StatusTabs } from './StatusTabs';
import { EmptyState } from './EmptyState';
import PhotoUploadDialog from './PhotoUploadDialog';
import { FullscreenPhotoViewer } from './FullscreenPhotoViewer';
import { Photo, PhotoGalleryProps } from '@/types/PhotoGallery.types';
import { OptimizedPhotoGrid } from './PhotoGrid';
import { useSimpleWebSocket } from '@/hooks/useWebSocket';
import { AdminNotificationBadge } from './AdminNotificationBadge';

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
  const [useInfiniteScroll, setUseInfiniteScroll] = useState(false);
  const [roomStats, setRoomStats] = useState<{
    eventId?: string;
    guestCount?: number;
    adminCount?: number;
    total?: number;
  }>({});

  // 🚀 UPLOAD TRACKING: Track uploaded media IDs for status monitoring
  const [uploadedMediaIds, setUploadedMediaIds] = useState<string[]>([]);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // WebSocket connection
  const webSocket = useSimpleWebSocket(eventId, shareToken, 'admin');

  // Room stats handler
  const handleRoomStats = useCallback((payload: any) => {
    console.log('📊 Room stats update:', payload);
    setRoomStats(payload);
  }, []);

  // WebSocket effects
  useEffect(() => {
    if (!webSocket.socket) return;
    webSocket.socket.on('room_user_counts', handleRoomStats);
    return () => webSocket.socket?.off('room_user_counts', handleRoomStats);
  }, [webSocket.socket, handleRoomStats]);

  const handleNavigateToPending = useCallback(() => {
    if (userPermissions.moderate) {
      setActiveTab('pending');
    }
  }, [userPermissions.moderate]);
  // Data fetching hooks
  const {
    data: regularPhotos = [],
    isLoading: regularLoading,
    error: regularError,
    refetch: refetchRegular
  } = useEventMedia(eventId, {
    status: activeTab,
    limit: 100,
    quality: 'display',
    enabled: !useInfiniteScroll
  });

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
    quality: 'display',
    enabled: useInfiniteScroll
  });

  // Use regular or infinite photos based on mode
  const photos = useInfiniteScroll ? infinitePhotos : regularPhotos;
  const isLoading = useInfiniteScroll ? infiniteLoading : regularLoading;
  const photosError = useInfiniteScroll ? infiniteError : regularError;
  const refetchPhotos = useInfiniteScroll ? refetchInfinite : refetchRegular;

  // Switch to infinite scroll if we have many photos
  useEffect(() => {
    if (regularPhotos.length > 50 && !useInfiniteScroll) {
      console.log('Switching to infinite scroll mode due to large photo count');
      setUseInfiniteScroll(true);
    }
  }, [regularPhotos.length, useInfiniteScroll]);

  // Media counts
  const {
    data: mediaCounts,
    isLoading: countsLoading,
    refetch: refetchCounts
  } = useEventMediaCounts(eventId, userPermissions.moderate);

  // 🚀 UPLOAD STATUS MONITORING: Monitor processing status of uploaded photos
  const {
    statuses: uploadStatuses,
    summary: uploadSummary,
    isMonitoring
  } = useUploadStatusMonitor(uploadedMediaIds, eventId, {
    onComplete: (mediaId, status) => {
      console.log('✅ Upload completed:', mediaId, status.filename);
      // Remove from monitoring list
      setUploadedMediaIds(prev => prev.filter(id => id !== mediaId));
      // Refresh photos and counts
      refetchPhotos();
      refetchCounts();
    },
    onFailed: (mediaId, status) => {
      console.log('❌ Upload failed:', mediaId, status.filename);
      // Remove from monitoring list
      setUploadedMediaIds(prev => prev.filter(id => id !== mediaId));
      // Refresh photos
      refetchPhotos();
    },
    enabled: uploadedMediaIds.length > 0
  });

  // Mutations with enhanced success handling
  const uploadMutation = useUploadMultipleMedia(eventId, albumId, {
    onSuccess: (result) => {
      const { data } = result;
      setUploadDialogOpen(false);

      // Clear file inputs
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';

      // 🚀 START MONITORING: Add uploaded media IDs to monitoring list
      if (data?.uploads && Array.isArray(data.uploads)) {
        const newMediaIds = data.uploads
          .filter((upload: any) => upload.id && upload.status !== 'failed')
          .map((upload: any) => upload.id);

        if (newMediaIds.length > 0) {
          setUploadedMediaIds(prev => [...prev, ...newMediaIds]);
          console.log('📊 Started monitoring uploads:', newMediaIds);
        }
      }

      // Immediate refresh
      refetchCounts();
      refetchPhotos();
    },
    onError: (error) => {
      console.error('Upload failed:', error);
    }
  });

  const updateStatusMutation = useUpdateMediaStatus(eventId);
  const deleteMutation = useDeleteMedia(eventId);
  const { getCachedPhotoCount } = useGalleryUtils(eventId);

  // Connection Status Component
  const ConnectionStatus = memo(() => {
    if (!webSocket.isConnected) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <WifiOffIcon className="h-3 w-3" />
          Offline
        </Badge>
      );
    }

    if (!webSocket.isAuthenticated) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <WifiIcon className="h-3 w-3" />
          Connecting...
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="flex items-center gap-1 bg-green-500">
        <WifiIcon className="h-3 w-3" />
        Live
      </Badge>
    );
  });

  // Room Stats Display
  const RoomStatsDisplay = memo(({ roomStats }: { roomStats: any }) => {
    if (!roomStats.adminCount && !roomStats.guestCount) return null;

    return (
      <Badge variant="secondary" className="text-xs">
        {roomStats.guestCount > 0 && (
          <span>👥 {roomStats.guestCount} guest{roomStats.guestCount !== 1 ? 's' : ''}</span>
        )}
        {roomStats.adminCount > 0 && (
          <span className={roomStats.guestCount > 0 ? 'ml-2' : ''}>
            🔧 {roomStats.adminCount} admin{roomStats.adminCount !== 1 ? 's' : ''}
          </span>
        )}
        {roomStats.total && roomStats.total !== (roomStats.guestCount + roomStats.adminCount) && (
          <span className="ml-1 text-gray-500">
            ({roomStats.total} total)
          </span>
        )}
      </Badge>
    );
  });

  // 🚀 UPLOAD PROGRESS INDICATOR: Show real-time upload/processing status
  const UploadProgressIndicator = memo(() => {
    if (!isMonitoring || !uploadSummary) return null;

    const { total, completed, processing, failed } = uploadSummary;
    const progress = total > 0 ? ((completed + failed) / total) * 100 : 0;

    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UploadIcon className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Processing uploads
            </span>
          </div>
          <span className="text-xs text-blue-600 dark:text-blue-400">
            {completed + failed}/{total}
          </span>
        </div>

        <Progress value={progress} className="h-2" />

        <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
          <span>{processing} processing</span>
          <span>{completed} completed</span>
          {failed > 0 && <span className="text-red-600">{failed} failed</span>}
        </div>
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
      auto_approved: getCachedPhotoCount('auto_approved'),
      total: 0
    },
    [mediaCounts, getCachedPhotoCount]
  );

  // Event handlers
  const handleTabChange = useCallback((newTab: typeof activeTab) => {
    if (newTab === activeTab) return;

    console.log(`Switching to tab: ${newTab}`);
    setActiveTab(newTab);
    setSelectedPhoto(null);
    setPhotoViewerOpen(false);
    setUseInfiniteScroll(false);
  }, [activeTab]);

  const handleStatusUpdate = useCallback((photoId: string, status: string, reason?: string) => {
    updateStatusMutation.mutate({
      mediaId: photoId,
      status: status as 'approved' | 'pending' | 'rejected' | 'hidden' | 'auto_approved',
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

    uploadMutation.mutate(validFiles);
  }, [canUserUpload, uploadMutation]);

  const openPhotoViewer = useCallback((photo: Photo, index: number) => {
    // Don't open viewer for uploading photos
    if (photo.status === 'uploading' || photo.isTemporary) return;

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

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleManualRefresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered');
    refetchPhotos();
    refetchCounts();
    toast.info('Refreshing data...');
  }, [refetchPhotos, refetchCounts]);

  // WebSocket error handling
  useEffect(() => {
    if (webSocket.connectionError) {
      console.error('WebSocket connection error:', webSocket.connectionError);
      if (process.env.NODE_ENV === 'development') {
        toast.error(`Connection failed: ${webSocket.connectionError}`, {
          description: 'Real-time updates may not work',
          duration: 5000
        });
      }
    }
  }, [webSocket.connectionError]);

  useEffect(() => {
    if (webSocket.isAuthenticated && webSocket.user) {
      console.log('✅ Admin WebSocket authenticated:', webSocket.user);
      if (process.env.NODE_ENV === 'development') {
        toast.success(`Connected as ${webSocket.user.name}`, { duration: 2000 });
      }
    }
  }, [webSocket.isAuthenticated, webSocket.user]);

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
          <Button onClick={refetchPhotos} variant="outline">
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
          <RoomStatsDisplay roomStats={roomStats} />
          <StatusTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            mediaCounts={displayCounts}
            userPermissions={userPermissions}
          />
          <ConnectionStatus />

          {userPermissions.moderate && (
            <AdminNotificationBadge
              eventId={eventId}
              onNavigateToPending={handleNavigateToPending}
              className="ml-2"
            />
          )}
          {useInfiniteScroll && (
            <div className="text-xs text-gray-500">
              Infinite scroll ({photos.length} loaded)
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {process.env.NODE_ENV === 'development' && (
            <>
              {webSocket.isAuthenticated && webSocket.user && (
                <Badge variant="outline" className="text-xs">
                  {webSocket.user.type}: {webSocket.user.name}
                </Badge>
              )}
              <Button
                onClick={handleManualRefresh}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                🔄 Refresh
              </Button>
            </>
          )}

          {canUserUpload && (
            <PhotoUploadDialog
              open={uploadDialogOpen}
              setOpen={setUploadDialogOpen}
              isUploading={uploadMutation.isPending}
              approvalMode={approvalMode}
              onFileUpload={handleFileUpload}
              fileInputRef={fileInputRef}
              cameraInputRef={cameraInputRef}
            />
          )}
        </div>
      </div>

      {/* 🚀 UPLOAD PROGRESS: Show upload/processing status */}
      <UploadProgressIndicator />

      {(updateStatusMutation.isPending || uploadMutation.isPending) && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-blue-700 dark:text-blue-300">
            {uploadMutation.isPending ? 'Uploading photos...' : 'Updating status...'}
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
          />

          {useInfiniteScroll && hasNextPage && (
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
              selectedPhoto={selectedPhoto}
              selectedPhotoIndex={selectedPhotoIndex}
              photos={photos}
              userPermissions={userPermissions}
              onClose={closePhotoViewer}
              onPrev={() => navigatePhoto('prev')}
              onNext={() => navigatePhoto('next')}
              onPhotoIndexChange={(newIndex) => {
                setSelectedPhotoIndex(newIndex);
                setSelectedPhoto(photos[newIndex]);
              }}
              deletePhoto={handleDelete}
              downloadPhoto={handleDownload}
              approvePhoto={userPermissions.moderate ?
                (photoId) => handleStatusUpdate(photoId, 'approved') : undefined
              }
              rejectPhoto={userPermissions.moderate ?
                (photoId) => handleStatusUpdate(photoId, 'rejected') : undefined
              }
              hidePhoto={userPermissions.moderate ?
                (photoId) => handleStatusUpdate(photoId, 'hidden') : undefined
              }
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