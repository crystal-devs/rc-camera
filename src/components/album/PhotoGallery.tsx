// components/OptimizedPhotoGallery.tsx - Fixed to use proper hooks

'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  useEventMedia,
  useInfiniteEventMediaFlat, // Use the flat version for easier handling
  useEventMediaCounts,
  useUploadMedia,
  useUpdateMediaStatus,
  useDeleteMedia,
  useGalleryUtils,
  useUploadMultipleMedia
} from '@/hooks/useMediaQueries';
import { StatusTabs } from './StatusTabs';
import { EmptyState } from './EmptyState';
import PhotoUploadDialog from './PhotoUploadDialog';
import { FullscreenPhotoViewer } from './FullscreenPhotoViewer';
import { Photo, PhotoGalleryProps } from '@/types/PhotoGallery.types';
import { useMediaStatusUpdate } from '@/hooks/useMediaStatusUpdate';
import { OptimizedPhotoGrid } from './PhotoGrid';

export default function OptimizedPhotoGallery({
  eventId,
  albumId,
  canUpload = true,
  userPermissions = {
    upload: true,
    download: false,
    moderate: true,
    delete: true
  },
  approvalMode = 'auto'
}: PhotoGalleryProps) {
  // State management
  const [activeTab, setActiveTab] = useState<'approved' | 'pending' | 'rejected' | 'hidden'>('approved');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [useInfiniteScroll, setUseInfiniteScroll] = useState(false);
  const statusUpdateMutation = useMediaStatusUpdate(eventId);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Choose between regular and infinite query based on photo count
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
    error: infiniteError
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

  // Switch to infinite scroll if we have many photos
  useMemo(() => {
    if (regularPhotos.length > 50 && !useInfiniteScroll) {
      console.log('Switching to infinite scroll mode due to large photo count');
      setUseInfiniteScroll(true);
    }
  }, [regularPhotos.length, useInfiniteScroll]);

  let mediaCounts = 0
  let countsLoading = false
  // const {
  //   data: mediaCounts,
  //   isLoading: countsLoading
  // } = useEventMediaCounts(eventId, userPermissions.moderate);

  // Mutations

    const uploadMutation = useUploadMultipleMedia(eventId, albumId, {
    onSuccess: () => {
      setUploadDialogOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  });
  const updateStatusMutation = useUpdateMediaStatus(eventId);
  const deleteMutation = useDeleteMedia(eventId);

  // Gallery utilities
  const { getCachedPhotoCount } = useGalleryUtils(eventId);

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

    // Reset infinite scroll mode when changing tabs
    setUseInfiniteScroll(false);
  }, [activeTab]);

  const handleStatusUpdate = useCallback((photoId: string, status: string, reason?: string) => {
    statusUpdateMutation.mutate({
      mediaId: photoId,
      status: status as 'approved' | 'pending' | 'rejected' | 'hidden' | 'auto_approved',
      reason
    });
  }, [statusUpdateMutation]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!canUserUpload) {
      toast.error("You don't have permission to upload photos to this event.");
      return;
    }

    // Validate files
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

  // Photo viewer handlers
  const openPhotoViewer = useCallback((photo: Photo, index: number) => {
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

  const handleCameraCapture = useCallback(() => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  }, []);

  // Load more handler for infinite scroll
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
        <Button
          onClick={() => useInfiniteScroll ? fetchNextPage() : refetchRegular()}
          variant="outline"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with status tabs and controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            mediaCounts={displayCounts}
            userPermissions={userPermissions}
          />

          {/* Show mode indicator */}
          {useInfiniteScroll && (
            <div className="text-xs text-gray-500">
              Infinite scroll mode ({photos.length} photos loaded)
            </div>
          )}
        </div>

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

      {/* Main content */}
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

          {/* Load more button for infinite scroll */}
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

          {/* Photo viewer */}
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

      {/* Hidden file inputs */}
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