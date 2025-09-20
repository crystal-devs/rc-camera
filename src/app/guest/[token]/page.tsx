// app/guest/[token]/page.tsx - FIXED VERSION (infinite re-render resolved)
'use client';

import React, { useState, useCallback, use, useEffect, memo, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WifiIcon, WifiOffIcon, Camera, X, Loader2, Plus, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TransformedPhoto } from '@/types/events';
import { PinterestPhotoGrid } from '@/components/photo/PinterestPhotoGrid';
import { notFound } from 'next/navigation';
import { toast } from 'sonner';
import { uploadGuestPhotos } from '@/services/apis/guest.api';
import { getTokenInfo } from '@/services/apis/sharing.api';
import { FullscreenPhotoViewer } from '@/components/photo/FullscreenPhotoViewer';
import { BulkDownloadButton } from './BulkDownloadButton';
import { DynamicEventCover } from '@/components/guest/DynamicEventCover';
import { useEventWebSocket } from '@/hooks/useEventWebSocket';
import { useInfiniteMediaQuery } from '@/hooks/useInfiniteMediaQuery';
import { NotificationBanner } from '@/components/guest/NotificationBanner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        if (error?.status === 404 || error?.status === 403) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

interface GuestPageProps {
  shareToken: string;
}

function GuestPageContent({ shareToken }: GuestPageProps) {
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<TransformedPhoto | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [roomStats, setRoomStats] = useState<{
    eventId?: string;
    guestCount?: number;
    adminCount?: number;
    total?: number;
  }>({});

  // Upload states
  const [showUploadDialog, setShowUploadDialog] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '' });

  // Event details state
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [accessDetails, setAccessDetails] = useState<any>(null);

  // Notification banner state
  const [showNotificationBanner, setShowNotificationBanner] = useState<boolean>(false);

  const [auth] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  });

  // Event deduplication tracking
  const processedEventsRef = useRef<Set<string>>(new Set());
  const eventCleanupTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // FIXED: Stable callback for viewport state change
  const handleViewportStateChange = useCallback((viewportInfo: any) => {
    // This callback is now stable and won't cause re-renders
    console.log('📐 Viewport changed:', viewportInfo);
  }, []);

  // Use infinite media query with buffering
  const {
    photos,
    totalPhotos,
    isInitialLoading,
    isLoadingMore,
    hasNextPage,
    isError,
    error,
    loadMore,
    refresh,
    webSocketHandlers,
    cleanup,
    // Buffering functionality
    bufferedChanges,
    bufferedCount,
    applyBufferedChanges,
    clearBufferedChanges,
    updateViewportInfo
  } = useInfiniteMediaQuery({
    shareToken,
    auth,
    limit: 20,
    onViewportStateChange: handleViewportStateChange // FIXED: Use stable callback
  });

  // Fetch event details
  const fetchEventDetails = async (shareToken: string) => {
    try {
      const response = await getTokenInfo(shareToken, auth);
      if (response && response.status === true && response.data) {
        setEventDetails(response.data.event);
        setAccessDetails(response.data.access);
      }
    } catch (err) {
      console.error('Error fetching event details:', err);
    }
  };

  useEffect(() => {
    if (shareToken) {
      fetchEventDetails(shareToken);
    }
  }, [shareToken]);

  // WebSocket connection
  const webSocket = useEventWebSocket(eventDetails?._id || '', {
    userType: 'guest',
    shareToken: shareToken,
    enabled: !!eventDetails?._id && !!shareToken
  });

  // Event signature creation for deduplication
  const createEventSignature = useCallback((eventType: string, payload: any): string => {
    const mediaId = payload.mediaId || payload._id || payload.id || 'unknown';
    const timestamp = payload.timestamp || Date.now();
    const timeWindow = Math.floor(timestamp / 2000) * 2000;
    return `${eventType}:${mediaId}:${timeWindow}`;
  }, []);

  // Deduplication check
  const shouldProcessEvent = useCallback((eventType: string, payload: any): boolean => {
    const signature = createEventSignature(eventType, payload);

    if (processedEventsRef.current.has(signature)) {
      console.log(`⏭️ Skipping duplicate ${eventType} event:`, signature);
      return false;
    }

    processedEventsRef.current.add(signature);

    const timeoutId = setTimeout(() => {
      processedEventsRef.current.delete(signature);
      eventCleanupTimeoutsRef.current.delete(signature);
    }, 10000);

    eventCleanupTimeoutsRef.current.set(signature, timeoutId);
    return true;
  }, [createEventSignature]);

  // Show/hide notification banner based on buffered changes
  useEffect(() => {
    setShowNotificationBanner(bufferedCount > 0);
  }, [bufferedCount]);

  // FIXED: Handle viewport changes from PinterestPhotoGrid
  const handleViewportChange = useCallback((viewportInfo: any) => {
    updateViewportInfo(viewportInfo);
  }, [updateViewportInfo]);

  // Apply buffered changes and show success feedback
  const handleApplyBufferedChanges = useCallback(() => {
    applyBufferedChanges();
    toast.success(`Applied ${bufferedCount} new photos!`, {
      duration: 3000,
      position: 'bottom-center'
    });
  }, [applyBufferedChanges, bufferedCount]);

  // Dismiss notification banner
  const handleDismissNotification = useCallback(() => {
    clearBufferedChanges();
    setShowNotificationBanner(false);
    toast.info('Pending changes cleared', {
      duration: 2000,
      position: 'bottom-center'
    });
  }, [clearBufferedChanges]);

  // FIXED: Stable reference for bufferedChanges to prevent unnecessary re-renders
  const bufferedChangesRef = useRef(bufferedChanges);
  bufferedChangesRef.current = bufferedChanges;

  // Optimized WebSocket event handlers with deduplication
  useEffect(() => {
    if (!webSocket.socket) return;

    const handleMediaApproved = (payload: any) => {
      if (!shouldProcessEvent('media_approved', payload)) return;

      console.log('✅ Processing media approved:', payload.mediaId);
      webSocketHandlers.handleMediaApproved(payload);

      // Only show toast if not buffering (immediate insertion)
      if (!bufferedChangesRef.current.some((change: any) => change.photo.id === payload.mediaId)) {
        toast.success('New photos approved!', {
          duration: 3000,
          position: 'bottom-center'
        });
      }
    };

    const handleMediaStatusUpdated = (payload: any) => {
      if (!shouldProcessEvent('media_status_updated', payload)) return;

      console.log('📝 Processing status update:', payload.mediaId, payload.previousStatus, '→', payload.newStatus);
      webSocketHandlers.handleMediaStatusUpdated(payload);

      // Smart notifications based on status change
      const items = Array.isArray(payload) ? payload : [payload];
      items.forEach(item => {
        if (item.newStatus === 'approved' && item.previousStatus !== 'approved') {
          // Only show approval toast if we haven't already shown it via media_approved event
          const approvalSignature = createEventSignature('media_approved', item);
          if (!processedEventsRef.current.has(approvalSignature) &&
            !bufferedChangesRef.current.some((change: any) => change.photo.id === item.mediaId)) {
            toast.success('Photo approved!', {
              duration: 2000,
              position: 'bottom-center'
            });
          }
        } else if (item.newStatus === 'hidden' || item.newStatus === 'rejected') {
          toast.info('Photo was removed', {
            duration: 3000,
            position: 'bottom-center'
          });
        }
      });
    };

    const handleNewMediaUploaded = (payload: any) => {
      if (!shouldProcessEvent('new_media_uploaded', payload)) return;

      console.log('📸 Processing new media upload');
      webSocketHandlers.handleNewMediaUploaded(payload);

      // Only show toast if not buffering (immediate insertion)
      if (!bufferedChangesRef.current.some((change: any) => change.reason.includes('upload'))) {
        toast.success('New photos added!', {
          duration: 3000,
          position: 'bottom-center'
        });
      }
    };

    const handleMediaRemoved = (payload: any) => {
      if (!shouldProcessEvent('media_removed', payload)) return;

      console.log('🗑️ Processing media removal');
      webSocketHandlers.handleMediaRemoved(payload);

      const count = payload.mediaIds?.length || 1;
      toast.info(`${count} photo${count > 1 ? 's' : ''} removed`, {
        duration: 3000,
        position: 'bottom-center'
      });
    };

    const handleMediaProcessingComplete = (payload: any) => {
      if (!shouldProcessEvent('media_processing_complete', payload)) return;

      console.log('⚡ Processing completion event');
      webSocketHandlers.handleMediaProcessingComplete(payload);

      toast.success('High-quality version ready!', {
        duration: 2000,
        position: 'bottom-center'
      });
    };

    // Set up event listeners
    webSocket.socket.on('media_approved', handleMediaApproved);
    webSocket.socket.on('media_status_updated', handleMediaStatusUpdated);
    webSocket.socket.on('new_media_uploaded', handleNewMediaUploaded);
    webSocket.socket.on('media_removed', handleMediaRemoved);
    webSocket.socket.on('guest_media_removed', handleMediaRemoved);
    webSocket.socket.on('media_processing_complete', handleMediaProcessingComplete);

    return () => {
      if (webSocket.socket) {
        webSocket.socket.off('media_approved', handleMediaApproved);
        webSocket.socket.off('media_status_updated', handleMediaStatusUpdated);
        webSocket.socket.off('new_media_uploaded', handleNewMediaUploaded);
        webSocket.socket.off('media_removed', handleMediaRemoved);
        webSocket.socket.off('guest_media_removed', handleMediaRemoved);
        webSocket.socket.off('media_processing_complete', handleMediaProcessingComplete);
      }
    };
  }, [webSocket.socket, webSocketHandlers, shouldProcessEvent, createEventSignature]);

  // Room stats handler
  const handleRoomStats = useCallback((payload: any) => {
    setRoomStats(payload);
  }, []);

  useEffect(() => {
    if (!webSocket.socket) return;
    webSocket.socket.on('room_user_counts', handleRoomStats);
    return () => webSocket.socket?.off('room_user_counts', handleRoomStats);
  }, [webSocket.socket, handleRoomStats]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventCleanupTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      eventCleanupTimeoutsRef.current.clear();
      processedEventsRef.current.clear();
      cleanup();
    };
  }, [cleanup]);

  // Upload functionality
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one photo');
      return;
    }

    try {
      setUploading(true);
      const result = await uploadGuestPhotos(
        shareToken,
        selectedFiles,
        guestInfo,
        auth || undefined
      );

      if (result.status) {
        const { summary } = result.data;
        if (summary.success > 0) {
          toast.success(
            summary.failed === 0
              ? `All ${summary.success} photo(s) uploaded successfully!`
              : `${summary.success} photo(s) uploaded, ${summary.failed} failed`
          );

          setSelectedFiles([]);
          setGuestInfo({ name: '', email: '' });
          setShowUploadDialog(false);
        } else {
          toast.error('All uploads failed. Please try again.');
        }
      } else {
        toast.error(result.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  // Connection Status Component
  const ConnectionStatus = memo(() => {
    if (!webSocket.isConnected) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
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

  const handlePhotoClick = useCallback((photo: TransformedPhoto, index: number) => {
    setSelectedPhoto(photo);
    setSelectedPhotoIndex(index);
    setPhotoViewerOpen(true);
  }, []);

  const navigatePhoto = useCallback(
    (direction: 'next' | 'prev') => {
      let newIndex: number;
      if (direction === 'next' && selectedPhotoIndex < photos.length - 1) {
        newIndex = selectedPhotoIndex + 1;
      } else if (direction === 'prev' && selectedPhotoIndex > 0) {
        newIndex = selectedPhotoIndex - 1;
      } else {
        return;
      }
      setSelectedPhotoIndex(newIndex);
      setSelectedPhoto(photos[newIndex]);
    },
    [selectedPhotoIndex, photos],
  );

  const RoomStatsDisplay = memo(({ roomStats }: { roomStats: any }) => {
    if (!roomStats.guestCount) return null;

    return (
      <Badge variant="secondary" className="text-xs">
        👥 {roomStats.guestCount} guest{roomStats.guestCount !== 1 ? 's' : ''} online
        {roomStats.total && roomStats.total !== roomStats.guestCount && (
          <span className="ml-1 text-gray-500">
            ({roomStats.total} total)
          </span>
        )}
      </Badge>
    );
  });

  // Content rendering
  const renderContent = useCallback(() => {
    if (isInitialLoading) {
      return (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading photos...</p>
          {webSocket.isAuthenticated && (
            <p className="text-sm text-green-600 mt-2">
              ✓ Real-time updates enabled
            </p>
          )}
        </div>
      );
    }

    if (isError && photos.length === 0) {
      return (
        <div className="text-center py-16">
          <div className="bg-red-50 rounded-lg p-6 max-w-md mx-auto">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Photos</h3>
            <p className="text-red-600 mb-4">
              {error instanceof Error ? error.message : 'Failed to load photos'}
            </p>
            <button
              onClick={refresh}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    if (!isInitialLoading && photos.length === 0) {
      return (
        <div className="text-center py-16">
          <Camera className="w-20 h-20 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-medium text-gray-600 mb-2">No photos yet</h3>
          <p className="text-gray-400 mb-6">Be the first to share a memory!</p>
          {eventDetails?.permissions?.can_upload && (
            <Button
              onClick={() => setShowUploadDialog(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Upload className="w-4 w-4 mr-2" />
              Upload First Photo
            </Button>
          )}
          {webSocket.isAuthenticated && (
            <span className="block mt-2 text-sm text-green-600">
              ✓ You'll see new photos automatically
            </span>
          )}
        </div>
      );
    }

    return (
      <PinterestPhotoGrid
        photos={photos}
        onPhotoClick={handlePhotoClick}
        hasNextPage={hasNextPage}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
        onViewportChange={handleViewportChange}
        eventStyling={eventDetails?.styling_config}
      />
    );
  }, [
    photos,
    isInitialLoading,
    isLoadingMore,
    hasNextPage,
    isError,
    error,
    handlePhotoClick,
    loadMore,
    refresh,
    webSocket.isAuthenticated,
    eventDetails,
    handleViewportChange
  ]);

  if (!shareToken) {
    notFound();
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background, #f8f9fa)' }}>
      {/* Notification Banner for buffered changes */}
      <NotificationBanner
        isVisible={showNotificationBanner}
        message={`${bufferedCount} new photo${bufferedCount > 1 ? 's' : ''} available`}
        count={bufferedCount}
        type="info"
        onAction={handleApplyBufferedChanges}
        onDismiss={handleDismissNotification}
        actionLabel="View Now"
        position="top"
      />

      {/* Dynamic Event Cover */}
      <DynamicEventCover
        eventDetails={eventDetails}
        photoCount={photos.length}
        totalPhotos={totalPhotos}
      />

      {/* Photo Gallery Section */}
      <div className="max-w-full mx-auto px-0 pb-8">
        {renderContent()}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-500" />
              Share Your Photos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 p-4">
            {!auth && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-3">Tell us who you are (optional)</p>
                <div className="space-y-2">
                  <Input
                    placeholder="Your name"
                    value={guestInfo.name}
                    onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                    className="text-sm"
                  />
                  <Input
                    type="email"
                    placeholder="Your email"
                    value={guestInfo.email}
                    onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                    className="text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Camera className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Click to select photos or videos</p>
                  <p className="text-xs text-gray-500 mt-1">Max 10 files, 50MB each</p>
                </label>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{selectedFiles.length} file(s) selected:</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm">
                        <span className="truncate flex-1">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-xs text-blue-700 space-y-1">
                <p>• Photos will be {eventDetails?.permissions?.require_approval ? 'reviewed before appearing' : 'visible immediately'}</p>
                <p>• Supported formats: JPG, PNG, HEIC, MP4, MOV</p>
                <p>• Please only upload appropriate content</p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUploadDialog(false);
                  setSelectedFiles([]);
                  setGuestInfo({ name: '', email: '' });
                }}
                className="flex-1"
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || uploading}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Upload Button */}
      {eventDetails?.permissions?.can_upload && (
        <div className="fixed bottom-20 right-6 z-30">
          <Button
            onClick={() => setShowUploadDialog(true)}
            className="text-white shadow-lg hover:shadow-xl rounded-full w-14 h-14 p-0"
            style={{ backgroundColor: 'var(--color-accent, #007bff)' }}
            title="Upload Photos"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Photo Viewer */}
      {photoViewerOpen && selectedPhoto && (
        <FullscreenPhotoViewer
          selectedPhoto={{
            ...selectedPhoto,
            albumId: null,
            eventId: eventDetails?._id || '',
            takenBy: Number((selectedPhoto as any).takenBy) || 0,
            imageUrl: (selectedPhoto as any).imageUrl ?? selectedPhoto.src ?? '',
            createdAt: new Date((selectedPhoto as any).createdAt || Date.now()),
          }}
          selectedPhotoIndex={selectedPhotoIndex}
          photos={photos.map(photo => ({
            ...photo,
            albumId: null,
            eventId: eventDetails?._id || '',
            takenBy: Number((photo as any).takenBy) || 0,
            imageUrl: (photo as any).imageUrl ?? photo.src ?? '',
            createdAt: new Date((photo as any).createdAt || Date.now()),
          }))}
          onClose={() => setPhotoViewerOpen(false)}
          onPrev={() => navigatePhoto('prev')}
          onNext={() => navigatePhoto('next')}
          setPhotoInfoOpen={(open) => {
            console.log('Photo info:', open);
          }}
          downloadPhoto={() => {
            console.log('Downloading photo:', selectedPhoto);
          }}
        />
      )}
    </div>
  );
}

export default function EventPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  return (
    <QueryClientProvider client={queryClient}>
      <GuestPageContent shareToken={token} />
    </QueryClientProvider>
  );
}