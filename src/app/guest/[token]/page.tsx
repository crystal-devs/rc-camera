// app/guest/[token]/page.tsx - Updated with Dynamic Styling
'use client';

import React, { useState, useCallback, use, useEffect, memo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WifiIcon, WifiOffIcon, SparklesIcon, UploadIcon, TrashIcon, Camera, X, Loader2, Plus, Download, Users, Calendar, MapPin, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TransformedPhoto } from '@/types/events';
import { PinterestPhotoGrid } from '@/components/photo/PinterestPhotoGrid';
import { useInfiniteMediaQuery } from '@/hooks/useInfiniteMediaQuery';
import { notFound } from 'next/navigation';
import { useSimpleWebSocket } from '@/hooks/useWebSocket';
import { toast } from 'sonner';
import { uploadGuestPhotos } from '@/services/apis/guest.api';
import { getTokenInfo } from '@/services/apis/sharing.api';
import { FullscreenPhotoViewer } from '@/components/album/FullscreenPhotoViewer';
import { BulkDownloadButton } from './BulkDownloadButton';

import { DynamicEventCover } from '@/components/guest/DynamicEventCover';
import { generateEventCSS } from '@/constants/styling.constant';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
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

  // Real-time activity state
  const [realtimeActivity, setRealtimeActivity] = useState<{
    isNewMediaUploading: boolean;
    isProcessingComplete: boolean;
    isMediaBeingRemoved: boolean;
    newMediaCount: number;
    removedMediaCount: number;
    lastActivityTime: number;
  }>({
    isNewMediaUploading: false,
    isProcessingComplete: false,
    isMediaBeingRemoved: false,
    newMediaCount: 0,
    removedMediaCount: 0,
    lastActivityTime: Date.now()
  });

  // Upload functionality states
  const [showUploadDialog, setShowUploadDialog] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '' });

  // Event details state
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [accessDetails, setAccessDetails] = useState<any>(null);

  const [auth] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  });

  console.log('🎯 ShareToken in GuestPageContent:', shareToken);

  // Fetch event details
  const fetchEventDetails = async (shareToken: string) => {
    try {
      const response = await getTokenInfo(shareToken, auth);
      console.log('🔍 Full response:', response);

      if (response && response.status === true && response.data) {
        setEventDetails(response.data.event);
        setAccessDetails(response.data.access);
      } else {
        console.warn("⚠️ Unexpected response format", response);
      }
    } catch (err) {
      console.error('❌ Error fetching event details:', err);
    }
  };

  useEffect(() => {
    if (shareToken) {
      fetchEventDetails(shareToken);
    }
  }, [shareToken]);

  // Apply dynamic styling to the document when eventDetails change
  useEffect(() => {
    if (eventDetails && document.documentElement) {
      const cssVars = generateEventCSS(eventDetails);
      
      Object.entries(cssVars).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
      });
    }
  }, [eventDetails]);

  // WebSocket connection - Guest mode
  const webSocket = {};
  // const webSocket = useSimpleWebSocket(shareToken, shareToken, 'guest');

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
  } = useInfiniteMediaQuery({
    shareToken,
    auth,
    limit: 10,
  });

  useEffect(() => {
    if (!webSocket.socket) return;

    // Handle new media uploaded
    const handleNewMediaUploaded = (payload: any) => {
      console.log('📸 New media uploaded in guest page:', payload);

      setRealtimeActivity(prev => ({
        ...prev,
        isNewMediaUploading: true,
        newMediaCount: prev.newMediaCount + 1,
        lastActivityTime: Date.now()
      }));

      setTimeout(() => {
        setRealtimeActivity(prev => ({
          ...prev,
          isNewMediaUploading: false
        }));
      }, 3000);
    };

    const handleProcessingComplete = (payload: any) => {
      console.log('✨ Processing completed in guest page:', payload);

      setRealtimeActivity(prev => ({
        ...prev,
        isProcessingComplete: true,
        lastActivityTime: Date.now()
      }));

      setTimeout(() => {
        setRealtimeActivity(prev => ({
          ...prev,
          isProcessingComplete: false
        }));
      }, 2000);
    };

    const handleEventStatsUpdate = (payload: any) => {
      console.log('📊 Event stats updated in guest page:', payload);
    };

    const handleGuestMediaRemovedUI = (payload: any) => {
      console.log('🗑️ Media removed in guest page (UI update):', payload);

      setRealtimeActivity(prev => ({
        ...prev,
        isMediaBeingRemoved: true,
        removedMediaCount: prev.removedMediaCount + 1,
        lastActivityTime: Date.now()
      }));

      setTimeout(() => {
        setRealtimeActivity(prev => ({
          ...prev,
          isMediaBeingRemoved: false
        }));
      }, 3000);
    };

    webSocket.socket.on('new_media_uploaded', handleNewMediaUploaded);
    webSocket.socket.on('media_processing_complete', handleProcessingComplete);
    webSocket.socket.on('event_stats_update', handleEventStatsUpdate);
    webSocket.socket.on('guest_media_removed', handleGuestMediaRemovedUI);
    webSocket.socket.on('media_removed', handleGuestMediaRemovedUI);

    return () => {
      webSocket.socket?.off('new_media_uploaded', handleNewMediaUploaded);
      webSocket.socket?.off('media_processing_complete', handleProcessingComplete);
      webSocket.socket?.off('event_stats_update', handleEventStatsUpdate);
      webSocket.socket?.off('guest_media_removed', handleGuestMediaRemovedUI);
      webSocket.socket?.off('media_removed', handleGuestMediaRemovedUI);
    };
  }, [webSocket.socket]);

  const handleRoomStats = useCallback((payload: any) => {
    console.log('📊 Room stats update:', payload);
    setRoomStats(payload);
  }, []);

  useEffect(() => {
    if (!webSocket.socket) return;

    webSocket.socket.on('room_user_counts', handleRoomStats);
    return () => webSocket.socket?.off('room_user_counts', handleRoomStats);
  }, [webSocket.socket, handleRoomStats]);

  // Upload functionality
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
      console.log('📁 Files selected:', files.map(f => f.name));
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one photo');
      return;
    }

    try {
      setUploading(true);
      console.log('🔍 Starting upload:', {
        fileCount: selectedFiles.length,
        shareToken: shareToken.substring(0, 8) + '...',
        hasAuth: !!auth,
        guestInfo
      });

      const result = await uploadGuestPhotos(
        shareToken,
        selectedFiles,
        guestInfo,
        auth || undefined
      );

      console.log('✅ Upload result:', result);

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
          refresh();
        } else {
          toast.error('All uploads failed. Please try again.');
        }
      } else {
        toast.error(result.message || 'Upload failed');
      }

    } catch (error: any) {
      console.error('❌ Upload error:', error);
      toast.error(error.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const downloadPhoto = useCallback((photo: TransformedPhoto) => {
    const link = document.createElement('a');
    link.href = photo.src;
    link.download = `photo-${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Enhanced Connection Status Component
  const ConnectionStatus = () => {
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
        {realtimeActivity.isNewMediaUploading && (
          <UploadIcon className="h-3 w-3 animate-pulse" />
        )}
        {realtimeActivity.isProcessingComplete && (
          <SparklesIcon className="h-3 w-3 animate-pulse" />
        )}
      </Badge>
    );
  };

  // Real-time Activity Indicator
  const RealtimeActivityIndicator = memo(() => {
    if (!webSocket.isAuthenticated) return null;

    return (
      <div className="flex items-center gap-2 text-xs">
        {realtimeActivity.isNewMediaUploading && (
          <div className="flex items-center gap-1 text-blue-600 animate-pulse">
            <UploadIcon className="h-3 w-3" />
            <span>New photos uploading...</span>
          </div>
        )}
        {realtimeActivity.isProcessingComplete && (
          <div className="flex items-center gap-1 text-green-600 animate-pulse">
            <SparklesIcon className="h-3 w-3" />
            <span>High-quality versions ready!</span>
          </div>
        )}
        {realtimeActivity.isMediaBeingRemoved && (
          <div className="flex items-center gap-1 text-orange-600 animate-pulse">
            <TrashIcon className="h-3 w-3" />
            <span>Photos being removed...</span>
          </div>
        )}
        {realtimeActivity.newMediaCount > 0 && !realtimeActivity.isNewMediaUploading && (
          <div className="flex items-center gap-1 text-green-600">
            <span>+{realtimeActivity.newMediaCount} new photos</span>
          </div>
        )}
        {realtimeActivity.removedMediaCount > 0 && !realtimeActivity.isMediaBeingRemoved && (
          <div className="flex items-center gap-1 text-orange-600">
            <span>-{realtimeActivity.removedMediaCount} photos removed</span>
          </div>
        )}
      </div>
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

  const renderContent = useCallback(() => {
    if (isInitialLoading) {
      return (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading photos...</p>
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
              <Upload className="w-4 h-4 mr-2" />
              Upload First Photo
            </Button>
          )}
          {webSocket.isAuthenticated && (
            <span className="block mt-2 text-sm text-green-600">
              ✓ You'll see new photos in real-time
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Real-time activity banner */}
        {webSocket.isAuthenticated && (
          realtimeActivity.isNewMediaUploading ||
          realtimeActivity.isProcessingComplete ||
          realtimeActivity.isMediaBeingRemoved
        ) && (
            <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <RealtimeActivityIndicator />
                <button
                  onClick={refresh}
                  className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Refresh Now
                </button>
              </div>
            </div>
          )}

        {/* Use the integrated pinterest grid */}
        <PinterestPhotoGrid
          photos={photos}
          onPhotoClick={handlePhotoClick}
          hasNextPage={hasNextPage}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMore}
          eventStyling={eventDetails?.styling_config}
        />
      </div>
    );
  }, [photos, isInitialLoading, isLoadingMore, hasNextPage, isError, error, handlePhotoClick, loadMore, refresh, webSocket.isAuthenticated, realtimeActivity, eventDetails]);

  // Handle missing shareToken
  if (!shareToken) {
    notFound();
  }

  console.log(eventDetails, 'eventDetailseventDetails')
  
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background, #f8f9fa)' }}>
      {/* Dynamic Event Cover */}
      <DynamicEventCover
        eventDetails={eventDetails}
        photoCount={photos.length}
        totalPhotos={totalPhotos}
      >
        {/* Action buttons in the cover */}
        {/* <div className="flex items-center gap-4 mt-6">
          <ConnectionStatus />
          <RoomStatsDisplay roomStats={roomStats} />

          {eventDetails?.permissions?.can_upload && (
            <Button
              onClick={() => setShowUploadDialog(true)}
              className="text-white flex items-center gap-2"
              style={{ backgroundColor: 'var(--color-accent, #007bff)' }}
            >
              <Upload className="w-4 h-4" />
              Upload Photos
            </Button>
          )}

          {eventDetails?.permissions?.can_download && (
            <BulkDownloadButton
              shareToken={shareToken}
              eventTitle={eventDetails?.title}
              totalPhotos={totalPhotos}
              authToken={auth}
              guestId={`guest_${Date.now()}`}
              guestName={guestInfo.name}
              guestEmail={guestInfo.email}
              disabled={isInitialLoading || photos.length === 0}
            />
          )}

          <button
            onClick={refresh}
            disabled={isInitialLoading || isLoadingMore}
            className="px-4 py-2 bg-white/20 text-white rounded hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors backdrop-blur-sm"
          >
            Refresh
          </button>
        </div> */}
      </DynamicEventCover>

      {/* Photo Gallery Section */}
      <div className="max-w-full mx-auto px-0 py-8">
        {renderContent()}
      </div>

      {/* Guest Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-500" />
              Share Your Photos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 p-4">
            {/* Guest info form for non-authenticated users */}
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

            {/* File selection */}
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

              {/* Selected files preview */}
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

            {/* Upload guidelines */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-xs text-blue-700 space-y-1">
                <p>• Photos will be {eventDetails?.permissions?.require_approval ? 'reviewed before appearing' : 'visible immediately'}</p>
                <p>• Supported formats: JPG, PNG, HEIC, MP4, MOV</p>
                <p>• Please only upload appropriate content</p>
              </div>
            </div>

            {/* Action buttons */}
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

      {photoViewerOpen && selectedPhoto && (
        <FullscreenPhotoViewer
          selectedPhoto={{
            ...selectedPhoto,
            takenBy: (selectedPhoto as any).takenBy ?? '',
            imageUrl: (selectedPhoto as any).imageUrl ?? selectedPhoto.src ?? '',
          }}
          selectedPhotoIndex={selectedPhotoIndex}
          photos={photos.map(photo => ({
            ...photo,
            takenBy: (photo as any).takenBy ?? '',
            imageUrl: (photo as any).imageUrl ?? photo.src ?? '',
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