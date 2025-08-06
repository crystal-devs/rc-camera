// app/guest/[token]/page.tsx - Fixed version
'use client';

import React, { useState, useCallback, use, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WifiIcon, WifiOffIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FullscreenPhotoViewer } from '@/components/photo/FullscreenPhotoViewer';
import { TransformedPhoto } from '@/types/events';
import { PinterestPhotoGrid } from '@/components/photo/PinterestPhotoGrid';
import { useInfiniteMediaQuery } from '@/hooks/useInfiniteMediaQuery';
import { notFound } from 'next/navigation';
import { useSimpleWebSocket } from '@/hooks/useWebSocket';

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

  const [auth] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  });

  console.log('🎯 ShareToken in GuestPageContent:', shareToken);

  // 🚀 WebSocket connection - Guest mode
  // Pass shareToken as both eventIdOrShareToken and shareToken for clarity
  const webSocket = useSimpleWebSocket(shareToken, shareToken, 'guest');

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
    limit: 20,
  });

  // Real-time WebSocket handlers
  useEffect(() => {
    if (!webSocket.socket) return;

    const socket = webSocket.socket;

    // Handle media status updates (admin changes status)
    const handleStatusUpdate = (payload: any) => {
      console.log('📡 Guest received status update:', payload);

      const { previousStatus, newStatus } = payload;
      const wasVisible = ['approved', 'auto_approved'].includes(previousStatus);
      const isVisible = ['approved', 'auto_approved'].includes(newStatus);

      // Only refresh if visibility changed
      if (wasVisible !== isVisible) {
        console.log('🔄 Guest: Photo visibility changed, refreshing...');
        refresh();
      }
    };

    // Handle specific guest events from backend
    const handleMediaApproved = (payload: any) => {
      console.log('📸 Guest: New media approved:', payload);
      refresh(); // Refresh to show new photo
    };

    const handleMediaRemoved = (payload: any) => {
      console.log('📸 Guest: Media removed:', payload);
      refresh(); // Refresh to hide removed photo
    };

    // Subscribe to events
    socket.on('media_status_updated', handleStatusUpdate);
    socket.on('media_approved', handleMediaApproved);
    socket.on('media_removed', handleMediaRemoved);

    return () => {
      socket.off('media_status_updated', handleStatusUpdate);
      socket.off('media_approved', handleMediaApproved);
      socket.off('media_removed', handleMediaRemoved);
    };
  }, [webSocket.socket, refresh]);

  // 🎯 Connection Status Component
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
      </Badge>
    );
  };

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

  const downloadPhoto = useCallback((photo: TransformedPhoto) => {
    const link = document.createElement('a');
    link.href = photo.src;
    link.download = `photo-${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

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
          <div className="text-6xl text-gray-300 mb-4">📷</div>
          <h3 className="text-xl font-medium text-gray-600 mb-2">No photos yet</h3>
          <p className="text-gray-400 mb-4">Photos will appear here once they're approved!</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <PinterestPhotoGrid
          photos={photos}
          onPhotoClick={handlePhotoClick}
          hasNextPage={hasNextPage}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMore}
        />
      </div>
    );
  }, [photos, isInitialLoading, isLoadingMore, hasNextPage, isError, error, handlePhotoClick, loadMore, refresh]);

  // Handle missing shareToken
  if (!shareToken) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Event Photos</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>
                  {photos.length} of {totalPhotos || '?'}
                </span>
                {isLoadingMore && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
                    Loading more...
                  </span>
                )}
                {hasNextPage && !isLoadingMore && <span className="text-green-600">• More available</span>}
                {!hasNextPage && photos.length > 0 && <span className="text-gray-400">• All loaded</span>}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ConnectionStatus />
              <button
                onClick={refresh}
                disabled={isInitialLoading || isLoadingMore}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Refresh
              </button>
              {process.env.NODE_ENV === 'development' && webSocket.isAuthenticated && webSocket.user && (
                <Badge variant="outline" className="text-xs">
                  {webSocket.user.type}: {webSocket.user.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">{renderContent()}</div>

      {photoViewerOpen && selectedPhoto && (
        <FullscreenPhotoViewer
          selectedPhoto={selectedPhoto}
          selectedPhotoIndex={selectedPhotoIndex}
          photos={photos}
          onClose={() => setPhotoViewerOpen(false)}
          onPrev={() => navigatePhoto('prev')}
          onNext={() => navigatePhoto('next')}
          downloadPhoto={downloadPhoto}
        />
      )}
    </div>
  );
}

export default function EventPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params); // Resolve the token from params

  console.log('🎯 Guest page received token:', token);

  return (
    <QueryClientProvider client={queryClient}>
      <GuestPageContent shareToken={token} />
    </QueryClientProvider>
  );
}