// app/guest/[token]/page.tsx - Optimized Guest Page
'use client';

import React, { useState, useCallback, use, useEffect, memo, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Camera,
  Upload,
  CheckCircle2,
  Loader2,
  X,
  Plus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BulkDownloadButton } from './components/BulkDownloadButton';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TransformedPhoto } from '@/types/events';
import { PinterestPhotoGrid } from '@/components/photo/PinterestPhotoGrid';
import { notFound, useRouter } => 'next/navigation';
import { toast } from 'sonner';
import { uploadGuestPhotos } from '@/services/apis/guest.api';
import { getTokenInfo } from '@/services/apis/sharing.api';
import { FullscreenPhotoViewer } from '@/components/photo/FullscreenPhotoViewer';
import { DynamicEventCover } from '@/components/guest/DynamicEventCover';
import { GuestHeader } from '@/components/guest/GuestHeader';
import { useEventWebSocket } from '@/hooks/useEventWebSocket';
import { useInfiniteMediaQuery } from '@/hooks/useInfiniteMediaQuery';
import { NotificationBanner } from '@/components/guest/NotificationBanner';
import { useGuestClaim } from '@/hooks/useGuestClaim';
import { Event } from '@/types/events';
import { createGuestBulkDownload, getDownloadStatus, downloadZipFile } from '@/services/apis/bulk-download.api';
import { getStylingConfig, getThemeColors } from '@/constants/styling.constant';
import { FindMeModal } from '@/components/photo/FindMeModal';

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

interface EventState {
  details: Event | null;
  access: any;
  roomStats: {
    eventId?: string;
    guestCount?: number;
    adminCount?: number;
    total?: number;
  };
}

function GuestPageContent({ shareToken }: GuestPageProps) {
  const router = useRouter();

  // Consolidated state management
  const [eventState, setEventState] = useState<EventState>({
    details: null,
    access: null,
    roomStats: {}
  });

  // Styling configuration
  const stylingConfig = useMemo(() => {
    if (!eventState.details) return null;
    try {
      return getStylingConfig(eventState.details);
    } catch (error) {
      console.warn('Error getting styling config:', error);
      return null;
    }
  }, [eventState.details]);

  // Extract theme colors from styling config
  const themeColors = useMemo(() => getThemeColors(stylingConfig), [stylingConfig]);

  // UI states
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<TransformedPhoto | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showUploadDialog, setShowUploadDialog] = useState<boolean>(false);
  const [showNotificationBanner, setShowNotificationBanner] = useState<boolean>(false);
  const [showFindMeModal, setShowFindMeModal] = useState(false);
  const [matchedMediaIds, setMatchedMediaIds] = useState<string[] | null>(null);

  // Bulk download states
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadJobId, setDownloadJobId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{
    status: string;
    progress: number;
    totalFiles: number;
  } | null>(null);

  // Upload states
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '' });

  const [auth] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  });

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
    bufferedChanges,
    bufferedCount,
    applyBufferedChanges,
    clearBufferedChanges
  } = useInfiniteMediaQuery({
    shareToken,
    auth,
    limit: 20
  });

  // Guest claim hook - auto-claims on mount if authenticated
  const {
    summary: claimSummary,
    isChecking: isCheckingClaim,
    isClaiming,
    hasClaimableContent,
    claimResult,
    claimContent,
  } = useGuestClaim({
    eventId: eventState.details?._id || '',
    authToken: auth,
    enabled: !!eventState.details?._id && !!auth,
    autoClaimOnMount: true, // Auto-claim on mount
  });

  // Refresh photos after successful claim
  useEffect(() => {
    if (claimResult && claimResult.mediaMigrated > 0) {
      // Refresh the photo gallery to show updated attribution
      setTimeout(() => {
        refresh();
      }, 1000);
    }
  }, [claimResult, refresh]);

  // Fetch event details
  const fetchEventDetails = async (shareToken: string) => {
    try {
      const response = await getTokenInfo(shareToken, auth);

      if (response && response.status === true && response.data) {
        setEventState(prev => ({
          ...prev,
          details: response.data.event,
          access: response.data.access
        }));
      }
    } catch (err: any) {
      // console.error('Error fetching event details:', err);

      if (err?.status === 401 || err?.response?.status === 401) {
        toast.error('Authentication required. Please sign in to access this event.');

        if (typeof window !== 'undefined') {
          localStorage.setItem('redirectAfterLogin', `/guest/${shareToken}`);
        }

        router.push('/login');
        return;
      }

      toast.error('Failed to load event details');
    }
  };

  useEffect(() => {
    if (shareToken) {
      fetchEventDetails(shareToken);
    }
  }, [shareToken]);

  // WebSocket connection
  const webSocket = useEventWebSocket(eventState.details?._id || '', {
    userType: 'guest',
    shareToken: shareToken,
    enabled: !!eventState.details?._id && !!shareToken
  });

  // Simplified deduplication using a simple set with auto-cleanup
  const processedEvents = useMemo(() => new Set<string>(), []);
  const eventTimeouts = useMemo(() => new Map<string, NodeJS.Timeout>(), []);

  const shouldProcessEvent = useCallback((eventType: string, payload: any): boolean => {
    const mediaId = payload.mediaId || payload._id || payload.id || 'unknown';
    const signature = `${eventType}:${mediaId}`;

    if (processedEvents.has(signature)) {
      return false;
    }

    processedEvents.add(signature);

    const timeoutId = setTimeout(() => {
      processedEvents.delete(signature);
      eventTimeouts.delete(signature);
    }, 10000);

    eventTimeouts.set(signature, timeoutId);
    return true;
  }, [processedEvents, eventTimeouts]);

  // Show/hide notification banner based on buffered changes
  useEffect(() => {
    setShowNotificationBanner(bufferedCount > 0);
  }, [bufferedCount]);


  const handleApplyBufferedChanges = useCallback(() => {
    applyBufferedChanges();
    toast.success(`Applied ${bufferedCount} new photos!`, {
      duration: 3000,
      position: 'bottom-center'
    });
  }, [applyBufferedChanges, bufferedCount]);

  const handleDismissNotification = useCallback(() => {
    clearBufferedChanges();
    setShowNotificationBanner(false);
    toast.info('Pending changes cleared', {
      duration: 2000,
      position: 'bottom-center'
    });
  }, [clearBufferedChanges]);

  // Optimized WebSocket event handlers with simplified deduplication
  useEffect(() => {
    if (!webSocket.socket) return;

    const handleMediaApproved = (payload: any) => {
      if (!shouldProcessEvent('media_approved', payload)) return;
      webSocketHandlers.handleMediaApproved(payload);
      if (!bufferedChanges.some((change: any) => change.photo.id === payload.mediaId)) {
        toast.success('New photos approved!', {
          duration: 3000,
          position: 'bottom-center'
        });
      }
    };

    const handleMediaStatusUpdated = (payload: any) => {
      if (!shouldProcessEvent('media_status_updated', payload)) return;
      webSocketHandlers.handleMediaStatusUpdated(payload);
      const items = Array.isArray(payload) ? payload : [payload];
      items.forEach(item => {
        if (item.newStatus === 'approved' && item.previousStatus !== 'approved') {
          const approvalSignature = `media_approved:${item.mediaId} `;
          if (!processedEvents.has(approvalSignature) &&
            !bufferedChanges.some((change: any) => change.photo.id === item.mediaId)) {
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
      webSocketHandlers.handleNewMediaUploaded(payload);
      if (!bufferedChanges.some((change: any) => change.reason.includes('upload'))) {
        toast.success('New photos added!', {
          duration: 3000,
          position: 'bottom-center'
        });
      }
    };

    const handleMediaRemoved = (payload: any) => {
      if (!shouldProcessEvent('media_removed', payload)) return;
      webSocketHandlers.handleMediaRemoved(payload);
      const count = payload.mediaIds?.length || 1;
      toast.info(`${count} photo${count > 1 ? 's' : ''} removed`, {
        duration: 3000,
        position: 'bottom-center'
      });
    };

    const handleMediaProcessingComplete = (payload: any) => {
      if (!shouldProcessEvent('media_processing_complete', payload)) return;
      webSocketHandlers.handleMediaProcessingComplete(payload);
      toast.success('High-quality version ready!', {
        duration: 2000,
        position: 'bottom-center'
      });
    };

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
  }, [webSocket.socket, webSocketHandlers, shouldProcessEvent, processedEvents, bufferedChanges]);

  // Room stats handler
  const handleRoomStats = useCallback((payload: any) => {
    setEventState(prev => ({
      ...prev,
      roomStats: payload
    }));
  }, []);

  useEffect(() => {
    if (!webSocket.socket) return;
    webSocket.socket.on('room_user_counts', handleRoomStats);
    return () => {
      if (webSocket.socket) {
        webSocket.socket.off('room_user_counts', handleRoomStats);
      }
    };
  }, [webSocket.socket, handleRoomStats]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventTimeouts.forEach(timeout => clearTimeout(timeout));
      eventTimeouts.clear();
      processedEvents.clear();
      cleanup();
    };
  }, [cleanup, eventTimeouts, processedEvents]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (downloadJobId && isDownloading) {
        // console.log('Cleaning up download polling on unmount');
        setIsDownloading(false);
        setDownloadJobId(null);
        setDownloadProgress(null);
      }
    };
  }, [downloadJobId, isDownloading]);

  // Upload functionality
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files as File[]);
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
      // console.error('Upload error:', error);
      toast.error(error.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  // Poll download status - Defined BEFORE handleBulkDownload
  const pollDownloadStatus = useCallback((jobId: string) => {
    let pollInterval: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;
    let pollCount = 0;

    // console.log('🔄 [DEBUG] Starting download polling for job:', jobId);

    const poll = async () => {
      pollCount++;
      // console.log(`🔄[DEBUG] Poll attempt #${ pollCount } for job: `, jobId);

      try {
        // console.log('📡 [DEBUG] Calling getDownloadStatus API...');
        const response = await getDownloadStatus(jobId);
        // console.log('📡 [DEBUG] API Response received:', { ... });

        if (response.data) {
          const { status, progress, totalFiles, downloadUrl, currentStage } = response.data;
          const currentStatus = status || (response.data as any).jobStatus || 'processing';

          // console.log('📊 [DEBUG] Parsed status data:', { ... });

          setDownloadProgress({
            status: currentStatus,
            progress: progress || 0,
            totalFiles: totalFiles || 0
          });

          if (currentStatus === 'completed' && downloadUrl) {
            // console.log('✅ [DEBUG] Download completed! Starting download process...');

            clearInterval(pollInterval);
            clearTimeout(timeoutId);
            setIsDownloading(false);
            setDownloadJobId(null);
            setDownloadProgress(null);

            toast.success('Download ready! Starting download...', { duration: 2000 });

            setTimeout(async () => {
              // console.log('🚀 [DEBUG] Executing downloadZipFile...');
              try {
                await downloadZipFile(downloadUrl, `${eventState.details?.title || 'event'}_photos.zip`);
                // console.log('✅ [DEBUG] downloadZipFile completed successfully');
                toast.success('Download completed!', { duration: 3000 });
              } catch (downloadError) {
                // console.error('❌ [DEBUG] downloadZipFile failed:', downloadError);
                toast.error('Download failed. Please try again.');
              }
            }, 100);

            return;
          } else if (currentStatus === 'failed') {
            // console.log('❌ [DEBUG] Download failed according to API');
            clearInterval(pollInterval);
            clearTimeout(timeoutId);
            setIsDownloading(false);
            setDownloadJobId(null);
            setDownloadProgress(null);
            toast.error('Download failed. Please try again.');
            return;
          } else {
            // console.log(`⏳[DEBUG] Download still processing: ${ currentStatus }, continuing to poll...`);
          }
        } else {
          // console.log('❌ [DEBUG] Invalid API response, stopping polling:', response);
          clearInterval(pollInterval);
          clearTimeout(timeoutId);
          setIsDownloading(false);
          setDownloadJobId(null);
          setDownloadProgress(null);
          toast.error('Failed to check download status');
        }
      } catch (error) {
        // console.error('❌ [DEBUG] Status check error:', error);
        clearInterval(pollInterval);
        clearTimeout(timeoutId);
        setIsDownloading(false);
        setDownloadJobId(null);
        setDownloadProgress(null);
        toast.error('Failed to check download status');
      }
    };

    // Start polling immediately
    poll();

    // Set up interval for subsequent polls
    pollInterval = setInterval(poll, 2000); // Poll every 2 seconds

    // Cleanup after 10 minutes (timeout)
    timeoutId = setTimeout(() => {
      // console.log('⏰ [DEBUG] Download timeout reached after 10 minutes');
      clearInterval(pollInterval);
      if (isDownloading) {
        setIsDownloading(false);
        setDownloadJobId(null);
        setDownloadProgress(null);
        toast.error('Download timed out. Please try again.');
      }
    }, 600000); // 10 minutes

    // Return cleanup function
    return () => {
      // console.log('🧹 [DEBUG] Cleaning up polling intervals');
      clearInterval(pollInterval);
      clearTimeout(timeoutId);
    };
  }, [eventState.details?.title, isDownloading]);

  // Bulk download functionality
  const handleBulkDownload = useCallback(async () => {
    // console.log('🎯 [DOWNLOAD] handleBulkDownload called');

    if (!eventState.details?._id) {
      toast.error('Event not loaded yet');
      return;
    }

    if (photos.length === 0) {
      toast.error('No photos available to download');
      return;
    }

    try {
      setIsDownloading(true);
      toast.info('Starting bulk download...', { duration: 2000 });

      const response = await createGuestBulkDownload(
        shareToken,
        eventState.details._id,
        'original'
      );

      if (response.status && response.data?.jobId) {
        const jobId = response.data.jobId;
        // console.log('✅ [DOWNLOAD] Job created successfully:', jobId);

        setDownloadJobId(jobId);
        toast.success('Download started! Processing photos...', { duration: 3000 });

        // Start polling for status
        const cleanup = pollDownloadStatus(jobId);

        // Store cleanup function for component unmount
        return () => cleanup();
      } else {
        throw new Error(response.message || 'Failed to start download');
      }
    } catch (error: any) {
      // console.error('❌ [DOWNLOAD] Bulk download error:', error);
      toast.error(error.message || 'Failed to start download');
      setIsDownloading(false);
    }
  }, [shareToken, eventState.details?._id, photos.length, pollDownloadStatus]);

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

  const RoomStatsDisplay = memo(({ roomStats }: { roomStats: EventState['roomStats'] }) => {
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

  // Manual claim button handler
  const handleManualClaim = useCallback(async () => {
    try {
      await claimContent();
    } catch (error) {
      // console.error('Manual claim failed:', error);
    }
  }, [claimContent]);

  // NEW: Filtering logic for Find My Face
  const displayedPhotos = useMemo(() => {
    if (!matchedMediaIds) return photos;
    return photos.filter(p => matchedMediaIds.includes(p.id));
  }, [photos, matchedMediaIds]);

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
          {isCheckingClaim && auth && (
            <p className="text-sm text-blue-600 mt-2">
              Checking for previous uploads...
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
              onClick={() => refresh()}
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
          {eventState.details?.default_guest_permissions?.upload && (
            <Button
              onClick={() => setShowUploadDialog(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
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
      <div className="space-y-6">
        {matchedMediaIds && (
          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg text-white">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-200">
                  Showing {displayedPhotos.length} photos of you
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {matchedMediaIds.length > 0 ? 'These are the best matches from the current gallery.' : 'No clear matches found yet.'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMatchedMediaIds(null)}
              className="border-blue-200 hover:bg-blue-100 text-blue-700"
            >
              Show All Photos
            </Button>
          </div>
        )}
        <PinterestPhotoGrid
          photos={displayedPhotos}
          onPhotoClick={handlePhotoClick}
          hasNextPage={hasNextPage && !matchedMediaIds} // Disable infinite scroll when filtering for now as search is based on loaded data or we need a proper backend filter
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMore}
          onViewportChange={() => { }} // Handled internally by hook
          eventStyling={(eventState.details as any)?.styling_config}
        />
      </div>
    );
  }, [
    photos,
    displayedPhotos,
    matchedMediaIds,
    isInitialLoading,
    isLoadingMore,
    hasNextPage,
    isError,
    error,
    handlePhotoClick,
    loadMore,
    refresh,
    webSocket.isAuthenticated,
    eventState.details,
    isCheckingClaim,
    auth
  ]);

  if (!shareToken) {
    notFound();
  }
  // console.log(eventState, 'eventStateeventState')
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
      />

      {/* Claiming Status Banner - Shows when claiming is in progress */}
      {isClaiming && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-medium">Claiming your previous uploads...</span>
          </div>
        </div>
      )}

      {/* Manual Claim Button - Shows in header when there's claimable content */}
      {auth && hasClaimableContent && !isClaiming && !claimResult && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                You have {claimSummary?.totalMedia} unclaimed photo{claimSummary?.totalMedia !== 1 ? 's' : ''} from previous uploads
              </p>
            </div>
            <Button
              onClick={handleManualClaim}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Claim Now
            </Button>
          </div>
        </div>
      )}

      {/* Dynamic Event Cover */}
      <DynamicEventCover
        eventDetails={eventState.details}
        photoCount={photos.length}
        totalPhotos={totalPhotos}
      />

      {/* Sticky Guest Header */}
      <GuestHeader
        eventDetails={eventState.details}
        themeColors={themeColors}
        onDownload={handleBulkDownload}
        isDownloading={isDownloading}
        totalPhotos={totalPhotos}
        onFindMe={() => setShowFindMeModal(true)}
      />

      <FindMeModal
        isOpen={showFindMeModal}
        onClose={() => setShowFindMeModal(false)}
        eventId={eventState.details?._id || ''}
        onMatchesFound={(ids) => setMatchedMediaIds(ids)}
      />


      {/* Download Progress Banner */}
      {
        downloadProgress && (
          <div className="fixed top-16 right-4 z-40 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-80">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-gray-900">
                Preparing Download...
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress.progress}% ` }}
              />
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Status: <span className="font-mono">{downloadProgress.status}</span></div>
              <div>Progress: <span className="font-mono">{downloadProgress.progress}%</span></div>
              <div>Files: <span className="font-mono">{downloadProgress.totalFiles}</span></div>
              {downloadProgress.status === 'processing' && `Processing ${downloadProgress.totalFiles} files...`}
              {downloadProgress.status === 'completed' && 'Download ready!'}
            </div>
            {/* Debug Info */}
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-500 space-y-1">
                <div>Job ID: <span className="font-mono text-xs">{downloadJobId?.substring(0, 8)}...</span></div>
                <div>Check console for detailed logs</div>
              </div>
            </div>
          </div>
        )
      }

      {/* Photo Gallery Section */}
      <div className="max-w-full mx-auto px-4 pb-0"
        style={{
          backgroundColor: themeColors.background,
        }}
      >
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
                <p>• Photos will be {eventState.details?.privacy?.content_controls?.content_moderation === 'manual' ? 'reviewed before appearing' : 'visible immediately'}</p>
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
      {
        eventState.details?.default_guest_permissions?.upload && (
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
        )
      }

      {/* Photo Viewer */}
      {
        photoViewerOpen && selectedPhoto && (
          <FullscreenPhotoViewer
            selectedPhoto={{
              ...selectedPhoto,
              takenBy: 0, // Guest user ID
              imageUrl: selectedPhoto.src,
              createdAt: new Date(selectedPhoto.createdAt),
              approval: {
                ...selectedPhoto.approval,
                approved_by: selectedPhoto.approval?.approved_by || undefined,
                approved_at: selectedPhoto.approval?.approved_at ? new Date(selectedPhoto.approval.approved_at) : undefined
              }
            }}
            selectedPhotoIndex={selectedPhotoIndex}
            photos={photos.map(photo => ({
              ...photo,
              takenBy: 0, // Guest user ID
              imageUrl: photo.src,
              createdAt: new Date(photo.createdAt),
              approval: {
                ...photo.approval,
                approved_by: photo.approval?.approved_by || undefined,
                approved_at: photo.approval?.approved_at ? new Date(photo.approval.approved_at) : undefined
              }
            }))}
            onClose={() => setPhotoViewerOpen(false)}
            onPrev={() => navigatePhoto('prev')}
            onNext={() => navigatePhoto('next')}
            downloadPhoto={() => {
              // console.log('Downloading photo:', selectedPhoto);
            }}
          />
        )
      }
    </div >
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