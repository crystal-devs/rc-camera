// app/events/[eventId]/media/page.tsx - IMPROVED VERSION
'use client';

import { Download, Share2, AlertCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { use, useEffect, useState, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import PhotoGallery from '@/components/photo/PhotoGallery';

import { useEventData } from '@/hooks/useEventData';
import useEventStore from '@/stores/useEventStore';
import { useAuth } from '@/contexts/AuthContext';

export default function OptimizedEventDetailsPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Optimized hook for event data
    const {
        event,
        albums,
        isLoadingEvent,
        isLoadingAlbums,
        isLoading,
        error,
        refreshAlbums,
        authToken,
        isInitialized
    } = useEventData(eventId);

    const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
    const { invalidateAlbumsCache } = useEventStore();
    const currentUserId = user?.id; // Derive ID from user object

    // Download state
    const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    // Share access validation
    const isSharedAccess = searchParams.get('via') === 'share';
    const shareToken = searchParams.get('token');

    // Handle authentication and access control
    useEffect(() => {
        // If it's a shared link, we don't need to force login
        if (isSharedAccess && shareToken) {
            console.log('Share access validated for token:', shareToken);
            return;
        }

        // Wait for auth initialization
        if (isAuthLoading) return;

        // Only redirect if:
        // 1. Not loading auth
        // 2. Not authenticated
        // 3. Not a shared access link
        if (!isAuthenticated) {
            console.log('Redirecting to login from media page');
            const returnUrl = encodeURIComponent(window.location.pathname);
            router.push(`/login?returnUrl=${returnUrl}`);
        }
    }, [isSharedAccess, shareToken, isAuthenticated, router, isAuthLoading]);

    // Optimized album update
    const updateAlbumsList = useCallback((newAlbum: any) => {
        invalidateAlbumsCache(eventId);
        refreshAlbums();
    }, [eventId, invalidateAlbumsCache, refreshAlbums]);

    // Quick share with better feedback
    const quickShare = useCallback(async () => {
        if (!event || !authToken) {
            toast.error('Event not available');
            return;
        }

        try {
            const shareUrl = `${window.location.origin}/join/${event.share_token}`;
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Share link copied!', {
                description: 'Anyone with this link can view the event'
            });
        } catch (error) {
            toast.error('Failed to copy link');
        }
    }, [event, authToken]);

    // Improved bulk download with progress
    const handleBulkDownload = useCallback(async () => {
        if (!currentUserId) {
            toast.error('Login required', {
                description: 'You must be logged in to download media'
            });
            return;
        }

        setIsDownloading(true);
        setDownloadProgress(0);

        try {
            const { createEventBulkDownload, getEventDownloadStatus, downloadZipFile } =
                await import('@/services/apis/bulk-download.api');

            const response = await createEventBulkDownload(
                eventId,
                currentUserId,
                'user',
                'original',
                authToken || undefined
            );

            if (response.status && response.data) {
                if (response.data.downloadUrl) {
                    // Immediate download available
                    await downloadZipFile(response.data.downloadUrl, `${event?.title || 'event'}_photos.zip`);
                    toast.success('Download started!');
                    setIsDownloading(false);
                    setDownloadProgress(null);
                } else if (response.data.jobId) {
                    // Start polling with progress
                    pollDownloadStatus(response.data.jobId, getEventDownloadStatus, downloadZipFile);
                }
            } else {
                throw new Error(response.message || 'Failed to start download');
            }
        } catch (error) {
            console.error('Download error:', error);
            toast.error(error instanceof Error ? error.message : 'Download failed');
            setIsDownloading(false);
            setDownloadProgress(null);
        }
    }, [currentUserId, authToken, eventId, event?.title]);

    // Polling with progress updates
    const pollDownloadStatus = useCallback((jobId: string, getStatusFn: any, downloadFn: any) => {
        const interval = setInterval(async () => {
            try {
                const response = await getStatusFn(jobId, authToken || undefined);

                if (response.success && response.data) {
                    setDownloadProgress(response.data.progress || 0);

                    if (response.data.jobStatus === "completed" && response.data.downloadUrl) {
                        clearInterval(interval);
                        await downloadFn(response.data.downloadUrl, `${event?.title || 'event'}_photos.zip`);
                        toast.success('Download completed!');
                        setIsDownloading(false);
                        setDownloadProgress(null);
                    } else if (response.data.jobStatus === "failed") {
                        clearInterval(interval);
                        toast.error("Download failed. Please try again.");
                        setIsDownloading(false);
                        setDownloadProgress(null);
                    }
                }
            } catch (error) {
                clearInterval(interval);
                console.error('Polling error:', error);
                setIsDownloading(false);
                setDownloadProgress(null);
            }
        }, 2000); // Poll every 2 seconds

        return () => clearInterval(interval);
    }, [authToken, event?.title]);

    // Loading state with better skeleton
    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                    <Skeleton className="h-4 w-full max-w-md" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[...Array(8)].map((_, i) => (
                            <Skeleton key={i} className="aspect-square rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Error state with better UI
    if (error || !event) {
        return (
            <div className="container mx-auto px-4 py-16">
                <Card className="max-w-md mx-auto p-6">
                    <div className="text-center space-y-4">
                        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                        <h1 className="text-2xl font-bold">
                            {error ? 'Error Loading Event' : 'Event Not Found'}
                        </h1>
                        <p className="text-muted-foreground">
                            {error || "The event you're looking for doesn't exist or has been removed."}
                        </p>
                        <Button onClick={() => router.push('/events')}>
                            Back to Events
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
            {/* Header with actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">{event.title}</h1>
                    {event.description && (
                        <p className="text-muted-foreground mt-1">{event.description}</p>
                    )}
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                        onClick={quickShare}
                        variant="outline"
                        className="flex-1 sm:flex-none"
                    >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                    </Button>
                    <Button
                        onClick={handleBulkDownload}
                        disabled={isDownloading}
                        variant="default"
                        className="flex-1 sm:flex-none"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        {isDownloading ? 'Preparing...' : 'Download All'}
                    </Button>
                </div>
            </div>

            {/* Download progress indicator */}
            {isDownloading && downloadProgress !== null && (
                <Alert className="mb-6">
                    <AlertDescription>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Preparing download...</span>
                                <span>{downloadProgress}%</span>
                            </div>
                            <Progress value={downloadProgress} className="h-2" />
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Photo Gallery */}
            <PhotoGallery
                eventId={eventId}
                albumId={null}
                canUpload={true}
            />
        </div>
    );
}