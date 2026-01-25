// app/events/[eventId]/media/page.tsx - OPTIMIZED VERSION
'use client';

import { Download, Share2, AlertCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { use, useEffect, useState, useCallback, memo, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import PhotoGallery from '@/components/photo/PhotoGallery';

import { useEventData } from '@/hooks/useEventData';
import useEventStore from '@/stores/useEventStore';
import { useSecureAuth } from '@/contexts/SecureAuthContext';

// ✅ Import bulk download services at top level
import {
    createEventBulkDownload,
    getEventDownloadStatus,
    downloadZipFile
} from '@/services/apis/bulk-download.api';

// ✅ Optimize skeleton rendering - extract constant
const SKELETON_COUNT = 8;
const SKELETON_ITEMS = Array.from({ length: SKELETON_COUNT }, (_, i) => i);

const OptimizedEventDetailsPage = memo(function OptimizedEventDetailsPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Optimized hook for event data
    const {
        event,
        albums,
        isLoading,
        error,
        refreshAlbums,
        authToken
    } = useEventData(eventId);

    const { user, isAuthenticated, isLoading: isAuthLoading } = useSecureAuth();
    const { invalidateAlbumsCache } = useEventStore();

    // ✅ Extract primitive values from user object
    const currentUserId = user?.id;

    // Download state
    const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    // ✅ Add loading state for quick share
    const [isCopying, setIsCopying] = useState(false);

    // ✅ Store interval ref for cleanup
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Share access validation
    const isSharedAccess = searchParams.get('via') === 'share';
    const shareToken = searchParams.get('token');

    // ✅ Extract primitive values for stable dependencies
    const eventTitle = event?.title || 'event';
    const eventShareToken = event?.share_token;

    // Handle authentication and access control
    useEffect(() => {
        // If it's a shared link, we don't need to force login
        if (isSharedAccess && shareToken) {
            if (process.env.NODE_ENV === 'development') {
                console.log('Share access validated for token:', shareToken);
            }
            return;
        }

        // Wait for auth initialization
        if (isAuthLoading) return;

        // Only redirect if not authenticated and not shared access
        if (!isAuthenticated) {
            if (process.env.NODE_ENV === 'development') {
                console.log('Redirecting to login from media page');
            }
            const returnUrl = typeof window !== 'undefined'
                ? encodeURIComponent(window.location.pathname)
                : '';
            router.push(`/login?returnUrl=${returnUrl}`);
        }
    }, [isSharedAccess, shareToken, isAuthenticated, router, isAuthLoading]);

    // ✅ Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, []);

    // Optimized album update
    const updateAlbumsList = useCallback(() => {
        invalidateAlbumsCache(eventId);
        refreshAlbums();
    }, [eventId, invalidateAlbumsCache, refreshAlbums]);

    // ✅ Quick share with loading state and primitive dependencies
    const quickShare = useCallback(async () => {
        if (!eventShareToken || !authToken) {
            toast.error('Event not available');
            return;
        }

        setIsCopying(true);
        try {
            const shareUrl = typeof window !== 'undefined'
                ? `${window.location.origin}/join/${eventShareToken}`
                : '';

            await navigator.clipboard.writeText(shareUrl);
            toast.success('Share link copied!', {
                description: 'Anyone with this link can view the event'
            });
        } catch (error) {
            toast.error('Failed to copy link');
        } finally {
            setIsCopying(false);
        }
    }, [eventShareToken, authToken]);

    // ✅ Polling with proper cleanup
    const pollDownloadStatus = useCallback((jobId: string) => {
        // Clear any existing interval
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
        }

        pollIntervalRef.current = setInterval(async () => {
            try {
                const response = await getEventDownloadStatus(jobId, authToken || undefined);

                if (response.success && response.data) {
                    setDownloadProgress(response.data.progress || 0);

                    if (response.data.status === "completed" && response.data.downloadUrl) {
                        if (pollIntervalRef.current) {
                            clearInterval(pollIntervalRef.current);
                            pollIntervalRef.current = null;
                        }
                        await downloadZipFile(response.data.downloadUrl, `${eventTitle}_photos.zip`);
                        toast.success('Download completed!');
                        setIsDownloading(false);
                        setDownloadProgress(null);
                    } else if (response.data.status === "failed") {
                        if (pollIntervalRef.current) {
                            clearInterval(pollIntervalRef.current);
                            pollIntervalRef.current = null;
                        }
                        toast.error("Download failed. Please try again.");
                        setIsDownloading(false);
                        setDownloadProgress(null);
                    }
                }
            } catch (error) {
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                }
                if (process.env.NODE_ENV === 'development') {
                    console.error('Polling error:', error);
                }
                setIsDownloading(false);
                setDownloadProgress(null);
            }
        }, 2000); // Poll every 2 seconds
    }, [authToken, eventTitle]);

    // ✅ Improved bulk download with primitive dependencies
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
                    await downloadZipFile(response.data.downloadUrl, `${eventTitle}_photos.zip`);
                    toast.success('Download started!');
                    setIsDownloading(false);
                    setDownloadProgress(null);
                } else if (response.data.jobId) {
                    // Start polling with progress
                    pollDownloadStatus(response.data.jobId);
                }
            } else {
                throw new Error(response.message || 'Failed to start download');
            }
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Download error:', error);
            }
            toast.error(error instanceof Error ? error.message : 'Download failed');
            setIsDownloading(false);
            setDownloadProgress(null);
        }
    }, [currentUserId, authToken, eventId, eventTitle, pollDownloadStatus]);

    // Loading state with optimized skeleton
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
                        {SKELETON_ITEMS.map((i) => (
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
        <div className="w-full px-2 sm:px-4 py-4 sm:py-8">
            {/* Header with actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">{event.title}</h1>
                    {event.description && (
                        <p className="text-muted-foreground mt-1">{event.description}</p>
                    )}
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    {/* ✅ Added aria-label and loading state */}
                    <Button
                        onClick={quickShare}
                        variant="outline"
                        className="flex-1 sm:flex-none"
                        disabled={isCopying}
                        aria-label="Share event link"
                    >
                        <Share2 className="w-4 h-4 mr-2" />
                        {isCopying ? 'Copying…' : 'Share'}
                    </Button>
                    {/* ✅ Added aria-label and aria-busy */}
                    <Button
                        onClick={handleBulkDownload}
                        disabled={isDownloading}
                        variant="default"
                        className="flex-1 sm:flex-none"
                        aria-label="Download all event photos"
                        aria-busy={isDownloading}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        {isDownloading ? 'Preparing…' : 'Download All'}
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
                displayConfig={{
                    targetRowHeight: 170
                }}
            />
        </div>
    );
});

OptimizedEventDetailsPage.displayName = 'OptimizedEventDetailsPage';

export default OptimizedEventDetailsPage;