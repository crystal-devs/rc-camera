// app/events/[eventId]/page.tsx
'use client';

import { Download } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { use, useEffect, useState, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import PhotoGallery from '@/components/photo/PhotoGallery';

// Import our optimized hook
import { useEventData } from '@/hooks/useEventData';
import useEventStore from '@/stores/useEventStore';
import { useAuth } from '@/hooks/use-auth';

export default function OptimizedEventDetailsPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Use our optimized hook - this handles all the caching and API calls
    const {
        event,
        albums,
        isLoadingEvent,
        isLoadingAlbums,
        isLoading,
        error,
        refreshAlbums,
        authToken
    } = useEventData(eventId);

    // Get user authentication
    const { currentUserId } = useAuth();

    // Local state
    const [activeTab, setActiveTab] = useState('photos');

    // Store methods for cache management
    const { invalidateAlbumsCache } = useEventStore();

    // Handle URL parameters (keeping your existing logic)
    const isSharedAccess = searchParams.get('via') === 'share';
    const shareToken = searchParams.get('token');

    // Validation for shared access (keeping your existing logic)
    useEffect(() => {
        const validateShareAccess = async () => {
            if (!isSharedAccess || !shareToken) return;

            try {
                // Your existing share validation logic
                console.log('Validating share access for token:', shareToken);
                // Add your validation logic here
            } catch (error) {
                console.error('Invalid share token:', error);
                router.push(`/join/${shareToken}`);
            }
        };

        validateShareAccess();
    }, [isSharedAccess, shareToken, router]);

    // Optimized album update function
    const updateAlbumsList = useCallback((newAlbum: any) => {
        console.log('📁 Updating albums list with new album:', newAlbum.id);

        // Invalidate cache to force fresh fetch
        invalidateAlbumsCache(eventId);

        // Refresh albums from API
        refreshAlbums();
    }, [eventId, invalidateAlbumsCache, refreshAlbums]);

    // Quick share function (keeping your existing logic)
    const quickShare = useCallback(async () => {
        if (!event || !authToken) {
            toast.error('Event not available');
            return;
        }

        try {
            const shareUrl = `${window.location.origin}/join/${event.share_token}`;
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Share link copied to clipboard!');
        } catch (error) {
            console.error('Error creating quick share:', error);
            toast.error('Failed to create share link');
        }
    }, [event, authToken]);

    // Bulk download functions
    const handleBulkDownload = useCallback(async (eventId: string) => {
        if (!currentUserId) {
            toast.error('You must be logged in to download');
            return;
        }

        try {
            const { createEventBulkDownload, getEventDownloadStatus, downloadZipFile } = await import('@/services/apis/bulk-download.api');

            const response = await createEventBulkDownload(
                eventId,
                currentUserId,
                'user',
                'original',
                authToken || undefined
            );

            if (response.status && response.data) {
                // Check if download URL is already available (existing download)
                if (response.data.downloadUrl) {
                    await downloadZipFile(response.data.downloadUrl, `${event?.title || 'event'}_photos.zip`);
                    toast.success('Download started!');
                } else if (response.data.jobId) {
                    // Start polling for status
                    const cleanup = startPollingStatus(response.data.jobId, getEventDownloadStatus, downloadZipFile, event?.title);

                    // Store cleanup function for component unmount
                    return () => cleanup();
                } else {
                    throw new Error('No download URL or job ID received');
                }
            } else {
                throw new Error(response.message || 'Failed to start download');
            }
        } catch (error) {
            console.error('Bulk download error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to start download');
        }
    }, [currentUserId, authToken, event?.title]);

    const startPollingStatus = useCallback((jobId: string, getStatusFn: any, downloadFn: any, eventTitle?: string) => {
        let isCompleted = false;

        const interval = setInterval(async () => {
            // Prevent polling if already completed
            if (isCompleted) {
                clearInterval(interval);
                return;
            }

            try {
                const response = await getStatusFn(jobId, authToken || undefined);

                if (response.success && response.data) {
                    console.log(`Progress: ${response.data.progress}%`);

                    if (response.data.jobStatus === "completed" && response.data.downloadUrl) {
                        isCompleted = true;
                        clearInterval(interval);
                        await downloadFn(response.data.downloadUrl, `${eventTitle || 'event'}_photos.zip`);
                        toast.success('Download completed!');
                    } else if (response.data.jobStatus === "failed") {
                        isCompleted = true;
                        clearInterval(interval);
                        toast.error("Download failed. Please try again.");
                    }
                }
            } catch (error) {
                console.error('Polling error:', error);
                isCompleted = true;
                clearInterval(interval);
            }
        }, 10000);

        // Return cleanup function
        return () => {
            isCompleted = true;
            clearInterval(interval);
        };
    }, [authToken]);

    // Loading state
    if (isLoading) {
        return (
            <div className="w-full">
                <Skeleton className="h-64 w-full" />
                <div className="container mx-auto px-4">
                    <Skeleton className="h-8 w-2/3 mt-6 mb-2" />
                    <Skeleton className="h-6 w-1/2 mb-6" />
                    <Skeleton className="h-10 w-full mb-6" />
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-32 rounded-lg" />
                        <Skeleton className="h-32 rounded-lg" />
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="container mx-auto px-2 py-8 sm:px-4 sm:py-16 text-center">
                <h1 className="text-2xl font-bold mb-4">Error Loading Event</h1>
                <p className="text-gray-500 mb-6">{error}</p>
                <Button onClick={() => router.push('/events')}>Back to Events</Button>
            </div>
        );
    }

    // Event not found
    if (!event) {
        return (
            <div className="container mx-auto px-2 py-8 sm:px-4 sm:py-16 text-center">
                <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
                <p className="text-gray-500 mb-6">
                    The event you're looking for doesn't exist or has been removed.
                </p>
                <Button onClick={() => router.push('/events')}>Back to Events</Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-2 py-2 sm:px-4 sm:py-8 bg-background">
            {/* Event Header */}
            {/* <EventHeaderDetails event={event} /> */}

            {/* Download Button */}
            <div className="flex justify-end mb-4">
                <Button
                    onClick={() => handleBulkDownload(eventId)}
                    variant="outline"
                    className="flex items-center gap-2"
                >
                    <Download className="w-4 h-4" />
                    Download All Media
                </Button>
            </div>

            <div className="mx-auto px-0 py-0 sm:px-2 sm:py-2">
                <PhotoGallery
                    eventId={eventId}
                    albumId={null}
                    canUpload={true}
                />
            </div>
        </div>
    );
}