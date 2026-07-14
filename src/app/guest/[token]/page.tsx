'use client';

import React, { useState, useCallback, use, useEffect, memo, useMemo, lazy, Suspense, useTransition } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Camera,
  Upload,
  CheckCircle2,
  X,
  Plus,
  WifiOff as WifiOffIcon,
  Wifi as WifiIcon,
  Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BulkDownloadButton } from './BulkDownloadButton';
import { TransformedPhoto, transformApiPhoto } from '@/types/events';
import { GuestPhotoGrid } from '@/components/guest/GuestPhotoGrid';

import { notFound } from 'next/navigation';
import { toast } from 'sonner';
import { getTokenInfo } from '@/services/apis/sharing.api';
import { DynamicEventCover } from '@/components/guest/DynamicEventCover';
import { GuestHeader } from '@/components/guest/GuestHeader';
import { useEventWebSocket } from '@/hooks/useEventWebSocket';
import { useInfiniteMediaQuery } from '@/hooks/useInfiniteMediaQuery';
import { NotificationBanner } from '@/components/guest/NotificationBanner';
import { useGuestClaim } from '@/hooks/useGuestClaim';
import { Event } from '@/types/events';
import { getStylingConfig, getThemeColors, generateEventCSS } from '@/constants/styling.constant';
import { SelfieUploadModal } from '@/components/guest/SelfieUploadModal';
import { useDownloadManager } from '@/hooks/useDownloadManager';
import { useGuestWebSocketHandlers } from '@/hooks/useGuestWebSocketHandlers';
import { MyPhotosHeader } from '@/components/guest/MyPhotosHeader';
import { loadGuestToken, saveGuestToken } from '@/utils/guestTokenStorage';
import { FullPageLoading, LoadingSpinner } from '@/components/ui/loading';
import { FindMePromptBanner } from '@/components/guest/FindMePromptBanner';
import { MyPhotosEmptyState } from '@/components/guest/MyPhotosEmptyState';
import { PinEntryModal } from '@/components/guest/PinEntryModal';
import { EventClosedScreen } from '@/components/guest/EventClosedScreen';

// Dynamic imports for heavy components (Vercel best practice: bundle-dynamic-imports)

const FullscreenPhotoViewer = lazy(() =>
  import('@/components/photo/FullscreenPhotoViewer').then(m => ({ default: m.FullscreenPhotoViewer }))
);
const GuestUploadDialog = lazy(() =>
  import('@/components/guest/GuestUploadDialog').then(m => ({ default: m.GuestUploadDialog }))
);

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
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

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
  const [showFindMePrompt, setShowFindMePrompt] = useState(false);
  // PIN / Password protection state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState<string | null>(null);

  // Tab state managed locally for raw performance
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'all' | 'my_photos' | 'highlights'>(
    (initialTab === 'my_photos' || initialTab === 'highlights') ? initialTab : 'all'
  );
  const [matchedPhotos, setMatchedPhotos] = useState<TransformedPhoto[] | null>(null);

  // Upload Constraint State
  const [sessionUploadCount, setSessionUploadCount] = useState(0);

  useEffect(() => {
    if (eventState.details?._id) {
      const count = parseInt(localStorage.getItem(`rc_uploads_${eventState.details._id}`) || '0', 10);
      setSessionUploadCount(count);
    }
  }, [eventState.details?._id, showUploadDialog]);

  const uploadsAllowed = (eventState.details as any)?.permissions?.can_upload !== false;
  const maxPerGuest = (eventState.details as any)?.permissions?.max_photos_per_guest || 0;
  const uploadLimitReached = maxPerGuest > 0 && sessionUploadCount >= maxPerGuest;
  const canUploadNow = uploadsAllowed && !uploadLimitReached;

  // Download manager hook (extracted for better performance)
  const {
    isDownloading,
    downloadProgress,
    downloadJobId,
    startDownload
  } = useDownloadManager({
    shareToken,
    eventId: eventState.details?._id || '',
    eventTitle: eventState.details?.title
  });

  // Guest Token State (Phase 2 Persistence)
  const [guestToken, setGuestToken] = useState<string | null>(null);

  // Initialize Guest Token from LocalStorage with versioning
  useEffect(() => {
    if (typeof window !== 'undefined' && eventState.details?._id) {
      const token = loadGuestToken(eventState.details._id);
      if (token) {
        setGuestToken(token);
      }
    }
  }, [eventState.details?._id]);

  // Fetch My Photos when tab changes or token is set
  useEffect(() => {
    const fetchPersonalPhotos = async () => {
      if (activeTab === 'my_photos' && guestToken) {
        try {
          const { getMyPhotos } = await import('@/services/apis/guest.api');
          const personalPhotos = await getMyPhotos(guestToken);

          if (personalPhotos && personalPhotos.length > 0) {
            const transformed = personalPhotos.map(p => transformApiPhoto(p));
            setMatchedPhotos(transformed);
          } else {
            // Token valid but no photos yet? Or maybe token invalid.
            setMatchedPhotos([]);
          }
        } catch (error) {
          console.error("Failed to fetch personal photos", error);
          // If 401, maybe clear token? 
          // setGuestToken(null);
          // localStorage.removeItem(`guest_token_${eventState.details?._id}`);
        }
      }
    };

    fetchPersonalPhotos();
  }, [activeTab, guestToken, eventState.details?._id]);



  const [auth] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('authToken');
      } catch (e) {
        return null;
      }
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

  // Guest claim hook
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
    autoClaimOnMount: true,
  });



  // Filtering logic
  const displayedPhotos = useMemo(() => {
    if (activeTab === 'my_photos') {
      // Return matchedPhotos if available, otherwise empty array (don't fall through to all photos)
      return matchedPhotos || [];
    }
    if (activeTab === 'highlights') {
      // Show approved/highlighted photos
      return photos.filter(photo =>
        photo.approval?.status === 'approved' ||
        photo.approval?.status === 'auto_approved'
      );
    }
    return photos;
  }, [photos, matchedPhotos, activeTab]);

  // Auto-prompt \"Find Me\" on first visit (after photos are loaded)
  useEffect(() => {
    if (!eventState.details?._id || guestToken || isInitialLoading) return;

    const hasSeenPrompt = localStorage.getItem(`find_me_prompt_seen_${eventState.details._id}`);

    // Show prompt if: haven't seen it before, have enough photos, and no token yet
    if (!hasSeenPrompt && photos.length >= 20) {
      const timer = setTimeout(() => {
        setShowFindMePrompt(true);
      }, 2000); // Show after 2 seconds

      return () => clearTimeout(timer);
    }
  }, [eventState.details?._id, guestToken, photos.length, isInitialLoading]);

  const handleSearchResults = useCallback((results: any[]) => {
    // In Phase 2, 'results' contains [{ token, isNewIdentity }] from the Login Modal
    if (results && results.length > 0 && results[0].token) {
      const { token, isNewIdentity } = results[0];

      // Save token with versioning
      setGuestToken(token);
      if (eventState.details?._id) {
        saveGuestToken(eventState.details._id, token);
      }

      // Switch tab instantly
      setActiveTab('my_photos');
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'my_photos');
      window.history.replaceState({}, '', url.toString());
    }
  }, [eventState.details?._id]);

  const handleTabChange = useCallback((tab: 'all' | 'my_photos' | 'highlights') => {
    if (tab === activeTab) return;
    
    // Instant UI update
    setActiveTab(tab);

    // Update URL silently without Next.js router lag
    const url = new URL(window.location.href);
    if (tab === 'all') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tab);
    }
    window.history.replaceState({}, '', url.toString());
  }, [activeTab]);

  // Handle Find Me Prompt actions
  const handleFindMePromptClick = useCallback(() => {
    setShowFindMePrompt(false);
    setShowFindMeModal(true);
    if (eventState.details?._id) {
      localStorage.setItem(`find_me_prompt_seen_${eventState.details._id}`, 'true');
    }
  }, [eventState.details?._id]);

  const handleDismissPrompt = useCallback(() => {
    setShowFindMePrompt(false);
    if (eventState.details?._id) {
      localStorage.setItem(`find_me_prompt_seen_${eventState.details._id}`, 'true');
    }
  }, [eventState.details?._id]);

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
  const fetchEventDetails = async (shareToken: string, password?: string | null) => {
    try {
      const response = await getTokenInfo(shareToken, auth, password);

      if (response && response.status === true && response.data) {
        if (typeof window !== 'undefined' && password) {
          localStorage.setItem(`event_pin_${shareToken}`, password);
        }
        setEventState(prev => ({
          ...prev,
          details: response.data.event,
          access: response.data.access
        }));
        // Close PIN modal on success
        setShowPinModal(false);
        setPinError(null);
      }
    } catch (err: any) {
      // Password required — show PIN modal
      const errMsg = err?.error?.message || err?.message || '';
      if (
        err?.code === 401 ||
        errMsg === 'password_required' ||
        errMsg.toLowerCase().includes('password')
      ) {
        setShowPinModal(true);
        if (password) {
          // Wrong password was entered
          setPinError('Incorrect password. Please try again.');
        }
        return;
      }

      if (err?.code === 401 || err?.status === 401) {
        toast.error('Authentication required. Please sign in to access this event.');
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('redirectAfterLogin', `/guest/${shareToken}`);
          } catch (e) {
            console.warn('Failed to save redirect URL:', e);
          }
        }
        router.push('/login');
        return;
      }

      toast.error('Failed to load event details');
    }
  };

  const handlePinSubmit = async (password: string) => {
    setPinLoading(true);
    setPinError(null);
    setEnteredPassword(password);
    await fetchEventDetails(shareToken, password);
    setPinLoading(false);
  };

  useEffect(() => {
    if (shareToken) {
      const pinFromUrl = new URLSearchParams(window.location.search).get('pin');
      const savedPin = typeof window !== 'undefined' ? localStorage.getItem(`event_pin_${shareToken}`) : null;
      const finalPin = pinFromUrl || savedPin;

      if (pinFromUrl) {
        // Strip pin from URL history for privacy
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('pin');
        window.history.replaceState({}, '', newUrl.toString());
      }
      
      if (finalPin) {
        setEnteredPassword(finalPin);
        fetchEventDetails(shareToken, finalPin);
      } else {
        fetchEventDetails(shareToken);
      }
    }
     
  }, [shareToken]);

  // WebSocket connection
  const webSocket = useEventWebSocket(eventState.details?._id || '', {
    userType: 'guest',
    shareToken: shareToken,
    enabled: !!eventState.details?._id && !!shareToken
  });

  // WebSocket handlers - use extracted hook with proper ref usage
  useGuestWebSocketHandlers({
    socket: webSocket.socket,
    webSocketHandlers
  });



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
      cleanup();
    };
  }, [cleanup]);

  // Upload complete handler for extracted component
  const handleUploadComplete = useCallback((newPhotos: TransformedPhoto[]) => {
    // Optimistically update the query cache
    queryClient.setQueryData(['guest-media', shareToken], (oldData: any) => {
      if (!oldData) return oldData;
      const pages = oldData.pages || [];
      if (pages.length === 0) return oldData;
      const firstPage = pages[0];

      return {
        ...oldData,
        pages: [
          {
            ...firstPage,
            photos: [...newPhotos, ...firstPage.photos],
            total: (firstPage.total || 0) + newPhotos.length
          },
          ...pages.slice(1)
        ]
      };
    });
  }, [shareToken]);

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
      if (direction === 'next' && selectedPhotoIndex < displayedPhotos.length - 1) {
        newIndex = selectedPhotoIndex + 1;
      } else if (direction === 'prev' && selectedPhotoIndex > 0) {
        newIndex = selectedPhotoIndex - 1;
      } else {
        return;
      }
      setSelectedPhotoIndex(newIndex);
      setSelectedPhoto(displayedPhotos[newIndex]);
    },
    [selectedPhotoIndex, displayedPhotos],
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

  if (!shareToken) {
    notFound();
  }

  // Feature D: Closed Event Screen
  if (eventState.details && eventState.details.share_settings?.is_active === false) {
    return (
      <EventClosedScreen
        eventTitle={eventState.details.title}
        eventDate={eventState.details.start_date}
      />
    );
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

      {/* Find Me Auto-Prompt Banner */}
      < FindMePromptBanner
        isVisible={showFindMePrompt}
        totalPhotos={totalPhotos}
        onFindMe={handleFindMePromptClick}
        onDismiss={handleDismissPrompt}
      />

      {/* PIN / Password Protection Modal */}
      {showPinModal && (
        <PinEntryModal
          eventTitle={eventState.details?.title}
          onSubmit={handlePinSubmit}
          isLoading={pinLoading}
          error={pinError}
        />
      )}

      {/* Claiming Status Banner - Shows when claiming is in progress */}
      {isClaiming && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-medium">Claiming your previous uploads…</span>
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
        onDownload={startDownload}
        isDownloading={isDownloading}
        totalPhotos={displayedPhotos.length}
        onFindMe={() => setShowFindMeModal(true)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        hasMatches={!!matchedPhotos && matchedPhotos.length > 0}
        onUpload={canUploadNow ? () => setShowUploadDialog(true) : undefined}
        connectionStatus={
          // Inline Connection Status for simplicity
          !webSocket.isConnected ? (
            <Badge variant="outline" className="flex items-center gap-1">
              <WifiOffIcon className="h-3 w-3" />
              Offline
            </Badge>
          ) : !webSocket.isAuthenticated ? (
            <Badge variant="secondary" className="flex items-center gap-1">
              <WifiIcon className="h-3 w-3" />
              Connecting...
            </Badge>
          ) : (
            <Badge variant="default" className="flex items-center gap-1 bg-green-500">
              <WifiIcon className="h-3 w-3" />
              Live
            </Badge>
          )
        }
      />

      <SelfieUploadModal
        isOpen={showFindMeModal}
        onClose={() => setShowFindMeModal(false)}
        eventId={eventState.details?._id || ''}
        onSearchResults={(results) => {
          if (!results || results.length === 0) {
            setMatchedPhotos(null);
          } else {
            const transformed = results.map(r => transformApiPhoto(r));
            handleSearchResults(transformed);
          }
        }}
      />


      {/* Download Progress Banner */}
      {
        downloadProgress && (
          <div className="fixed top-16 right-4 z-40 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-80">
            <div className="flex items-center gap-2 mb-2">
              <LoadingSpinner size="sm" className="inline-flex" />
              <span className="text-sm font-medium text-gray-900">
                Preparing Download…
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress.progress}% ` }}
              />
            </div>
            <div className="text-xs text-gray-600">
              {downloadProgress.status === 'completed'
                ? 'Your download is ready!'
                : `Packing ${downloadProgress.totalFiles} photos into a zip…`}
            </div>
          </div>
        )
      }


      {/* Photo Gallery Section */}
      <div className="max-w-full mx-auto px-3 pb-0"
        style={{ backgroundColor: themeColors.background }}
      >
        {/* ─── Loading State ─────────────────────── */}
        {isInitialLoading ? (
          <FullPageLoading
            message="Loading photos…"
            submessage={
              webSocket.isAuthenticated
                ? '✓ Real-time updates enabled'
                : isCheckingClaim && auth
                  ? 'Checking for previous uploads…'
                  : undefined
            }
          />
        ) : isError && photos.length === 0 ? (
          /* ─── Error State ─────────────────────────── */
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
        ) : activeTab === 'all' || activeTab === 'highlights' ? (
          /* ─── All Photos / Highlights Tab ──────────── */
          <>
            {photos.length === 0 ? (
              <div className="text-center py-16">
                <Camera className="w-20 h-20 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-medium text-gray-600 mb-2">No photos yet</h3>
                <p className="text-gray-400 mb-6">Be the first to share a memory!</p>
                {canUploadNow ? (
                  <Button onClick={() => setShowUploadDialog(true)} className="bg-blue-500 hover:bg-blue-600 text-white">
                    <Upload className="w-4 h-4 mr-2" />Upload First Photo
                  </Button>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm border font-medium">
                    <Camera className="w-4 h-4" />
                    {!uploadsAllowed ? 'Uploads are closed' : `You've shared your ${maxPerGuest} photos ✓`}
                  </div>
                )}
              </div>
            ) : (
              <GuestPhotoGrid
                photos={activeTab === 'highlights'
                  ? photos.filter(p => p.approval?.status === 'approved' || p.approval?.status === 'auto_approved')
                  : photos}
                onPhotoClick={handlePhotoClick}
                hasNextPage={hasNextPage}
                isLoadingMore={isLoadingMore}
                onLoadMore={loadMore}
                stylingConfig={(eventState.details as any)?.styling_config}
              />
            )}
          </>
        ) : activeTab === 'my_photos' ? (
          /* ─── My Photos Tab ──────────────────────── */
          <>
            {matchedPhotos && matchedPhotos.length > 0 && (
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-lg text-white">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-200">Showing {matchedPhotos.length} photos of you</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">Best matches from the gallery.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="bg-white hover:bg-white/80 text-blue-700 border-blue-200" onClick={() => setShowFindMeModal(true)}>Rescan</Button>
                  <Button variant="ghost" size="sm" className="text-blue-700 hover:bg-blue-100" onClick={() => handleTabChange('all')}>Show All</Button>
                </div>
              </div>
            )}

            {!guestToken ? (
              <MyPhotosEmptyState onFindMe={() => setShowFindMeModal(true)} />
            ) : !matchedPhotos ? (
              <div className="flex justify-center py-20">
                <LoadingSpinner className="text-[var(--primary-color)]" />
              </div>
            ) : matchedPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                  <Camera className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Photos Found</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
                  We couldn't find any photos of you yet. Try a different selfie or check back later.
                </p>
                <Button onClick={() => setShowFindMeModal(true)} variant="outline" className="mt-4">Try Another Selfie</Button>
              </div>
            ) : (
              <GuestPhotoGrid
                photos={matchedPhotos}
                onPhotoClick={handlePhotoClick}
                stylingConfig={(eventState.details as any)?.styling_config}
              />
            )}
          </>
        ) : null}
      </div>

      {/* Upload Dialog - Lazy Loaded */}
      <Suspense fallback={<div />}>
        <GuestUploadDialog
          isOpen={showUploadDialog}
          onClose={() => setShowUploadDialog(false)}
          shareToken={shareToken}
          eventDetails={eventState.details}
          auth={auth}
          onUploadComplete={handleUploadComplete}
          requireApproval={(eventState.details as any)?.permissions?.require_approval === true}
        />
      </Suspense>

      {/* Find Me Modal */}
      <SelfieUploadModal
        isOpen={showFindMeModal}
        onClose={() => setShowFindMeModal(false)}
        eventId={eventState.details?._id || ''}
        onSearchResults={handleSearchResults}
        socket={webSocket.socket}
      />

      {/* Floating Upload Button */}
      {
        canUploadNow && (
          <div className="fixed bottom-20 right-6 z-30">
            <Button
              onClick={() => setShowUploadDialog(true)}
              className="text-white shadow-lg hover:shadow-xl rounded-full w-14 h-14 p-0"
              style={{ backgroundColor: 'var(--color-accent, #007bff)' }}
              title="Upload Photos"
              aria-label="Upload Photos"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </div>
        )
      }

      {/* Photo Viewer - Lazy Loaded */}
      {photoViewerOpen && selectedPhoto && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/90 z-[2000] flex items-center justify-center"><LoadingSpinner size="lg" className="text-white" /></div>}>
          <FullscreenPhotoViewer
            selectedPhoto={{
              ...selectedPhoto,
              type: selectedPhoto.type || 'image',
              takenBy: 'Guest',
              imageUrl: selectedPhoto.src,
              createdAt: new Date(selectedPhoto.createdAt),
              metadata: {
                width: selectedPhoto.width,
                height: selectedPhoto.height
              },
              approval: {
                ...selectedPhoto.approval,
                approved_by: selectedPhoto.approval?.approved_by || undefined,
                approved_at: selectedPhoto.approval?.approved_at ? new Date(selectedPhoto.approval.approved_at).toISOString() : undefined
              }
            }}
            selectedPhotoIndex={selectedPhotoIndex}
            photos={displayedPhotos.map(photo => ({
              ...photo,
              type: photo.type || 'image',
              takenBy: 'Guest',
              imageUrl: photo.src,
              createdAt: new Date(photo.createdAt),
              metadata: {
                width: photo.width,
                height: photo.height
              },
              approval: {
                ...photo.approval,
                approved_by: photo.approval?.approved_by || undefined,
                approved_at: photo.approval?.approved_at ? new Date(photo.approval.approved_at).toISOString() : undefined
              }
            }))}
            onClose={() => setPhotoViewerOpen(false)}
            onPrev={() => navigatePhoto('prev')}
            onNext={() => navigatePhoto('next')}
            downloadPhoto={async () => {
              if (!selectedPhoto?.src) return;
              try {
                const response = await fetch(selectedPhoto.src);
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `photo-${selectedPhoto.id || Date.now()}.jpg`;
                link.click();
                URL.revokeObjectURL(url);
              } catch {
                // CORS-restricted image hosts: fall back to opening the image
                window.open(selectedPhoto.src, '_blank', 'noopener');
              }
            }}
          />
        </Suspense>
      )}
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