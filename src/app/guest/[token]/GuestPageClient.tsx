'use client';

import React, { useState, useCallback, useEffect, memo, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    Camera,
    Upload,
    CheckCircle2,
    Loader2,
    X,
    Plus,
    WifiOffIcon,
    WifiIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TransformedPhoto, transformApiPhoto, Event } from '@/types/events';
import { PinterestPhotoGrid } from '@/components/photo/PinterestPhotoGrid';
import { RowsPhotoGallery } from '@/components/photo/layout/RowsPhotoGallery';
import { Photo } from '@/types/PhotoGallery.types';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { uploadGuestPhotos } from '@/services/apis/guest.api';
import { getTokenInfo } from '@/services/apis/sharing.api';
import { DynamicEventCover } from '@/components/guest/DynamicEventCover';
import { GuestHeader } from '@/components/guest/GuestHeader';
import { useEventWebSocket } from '@/hooks/useEventWebSocket';
import { useInfiniteMediaQuery } from '@/hooks/useInfiniteMediaQuery';
import { NotificationBanner } from '@/components/guest/NotificationBanner';
import { useGuestClaim } from '@/hooks/useGuestClaim';
import { createGuestBulkDownload, getDownloadStatus, downloadZipFile } from '@/services/apis/bulk-download.api';
import { getStylingConfig, getThemeColors, generateEventCSS } from '@/constants/styling.constant';
import dynamic from 'next/dynamic';

// 🚀 OPTIMIZATION: Dynamic imports for heavy components
const FullscreenPhotoViewer = dynamic(() => import('@/components/photo/FullscreenPhotoViewer').then(mod => mod.FullscreenPhotoViewer), {
    loading: () => <div className="fixed inset-0 bg-black z-50 animate-pulse" />,
    ssr: false
});

const SelfieUploadModal = dynamic(() => import('@/components/guest/SelfieUploadModal').then(mod => mod.SelfieUploadModal), {
    ssr: false
});

const BulkDownloadButton = dynamic(() => import('./BulkDownloadButton').then(mod => mod.BulkDownloadButton), {
    ssr: false,
    loading: () => <Button variant="outline" disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</Button>
});

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

interface GuestPageClientProps {
    shareToken: string;
    initialEvent: Event | null;
    initialAccess: any;
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

export function GuestPageClient({ shareToken, initialEvent, initialAccess }: GuestPageClientProps) {
    const router = useRouter();

    // Consolidated state management with initial data from server
    const [eventState, setEventState] = useState<EventState>({
        details: initialEvent,
        access: initialAccess,
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
    // Tab state
    const [activeTab, setActiveTab] = useState<'all' | 'my_photos' | 'highlights'>('all');
    const [matchedPhotos, setMatchedPhotos] = useState<TransformedPhoto[] | null>(null);

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

    // Guest Token State (Phase 2 Persistence)
    const [guestToken, setGuestToken] = useState<string | null>(null);

    // Initialize Guest Token from LocalStorage
    useEffect(() => {
        if (typeof window !== 'undefined' && eventState.details?._id) {
            const storedToken = localStorage.getItem(`guest_token_${eventState.details._id}`);
            if (storedToken) {
                setGuestToken(storedToken);
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
                        setMatchedPhotos([]);
                    }
                } catch (error) {
                    console.error("Failed to fetch personal photos", error);
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
        if (activeTab === 'my_photos' && matchedPhotos) {
            return matchedPhotos;
        }
        return photos;
    }, [photos, matchedPhotos, activeTab]);

    const handleSearchResults = useCallback((results: any[]) => {
        if (results && results.length > 0 && results[0].token) {
            const { token, isNewIdentity } = results[0];
            setGuestToken(token);
            if (eventState.details?._id) {
                localStorage.setItem(`guest_token_${eventState.details._id}`, token);
            }
            setActiveTab('my_photos');
        }
    }, [eventState.details?._id]);

    const handleTabChange = useCallback((tab: 'all' | 'my_photos' | 'highlights') => {
        // Always allow switching to any tab
        setActiveTab(tab);
        // The empty state component will handle prompting for selfie upload
    }, []);

    // Refresh photos after successful claim
    useEffect(() => {
        if (claimResult && claimResult.mediaMigrated > 0) {
            setTimeout(() => {
                refresh();
            }, 1000);
        }
    }, [claimResult, refresh]);

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

    // Optimized WebSocket event handlers
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
                if (result.data.uploads && Array.isArray(result.data.uploads)) {
                    const newPhotos = result.data.uploads.map((upload: any) => ({
                        id: upload.mediaId,
                        src: upload.originalUrl,
                        width: upload.width || 800,
                        height: upload.height || 600,
                        uploaded_by: guestInfo.name || 'Guest',
                        approval: upload.approval || { status: 'approved' },
                        createdAt: new Date().toISOString(),
                        albumId: eventState.details?._id,
                        eventId: eventState.details?._id,
                        type: 'image',
                        imageUrl: upload.originalUrl,
                        responsive_urls: {
                            thumbnail: upload.originalUrl,
                            display: upload.originalUrl,
                            full: upload.originalUrl,
                            original: upload.originalUrl
                        },
                        processing: { status: 'processing' }
                    } as TransformedPhoto));

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
                }

                const { summary } = result.data;
                if (summary && summary.success > 0) {
                    toast.success(
                        summary.failed === 0
                            ? `All ${summary.success} photo(s) uploaded successfully!`
                            : `${summary.success} photo(s) uploaded, ${summary.failed} failed`
                    );
                    setSelectedFiles([]);
                    setGuestInfo({ name: '', email: '' });
                    setShowUploadDialog(false);
                } else if (result.data.uploads?.length > 0) {
                    toast.success('Photos uploaded successfully!');
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

    if (!eventState.details) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-black p-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-gray-500 text-sm">Loading event...</p>
            </div>
        );
    }

    const handleBulkDownload = useCallback(() => {
        const downloadBtn = document.querySelector('button[class*="BulkDownloadButton"]');
        if (downloadBtn instanceof HTMLElement) {
            downloadBtn.click();
        } else {
            const downloadSection = document.querySelector('.min-h-screen > main > div:nth-child(3)');
            if (downloadSection) {
                downloadSection.scrollIntoView({ behavior: 'smooth' });
                toast.info("Please use the Download button here");
            }
        }
    }, []);

    const cssString = useMemo(() => {
        if (!eventState.details) return '';
        try {
            const cssVars = generateEventCSS(eventState.details);
            return Object.entries(cssVars)
                .map(([key, value]) => `${key}: ${value};`)
                .join(' ');
        } catch (e) {
            console.error('Failed to generate CSS', e);
            return '';
        }
    }, [eventState.details]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black">
            {cssString && (
                <style dangerouslySetInnerHTML={{ __html: `:root { ${cssString} }` }} />
            )}

            <GuestHeader
                eventDetails={eventState.details}
                themeColors={themeColors}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onDownload={handleBulkDownload}
                isDownloading={isDownloading}
                totalPhotos={totalPhotos}
                onFindMe={() => setShowFindMeModal(true)}
                hasMatches={!!matchedPhotos && matchedPhotos.length > 0}
                onUpload={() => setShowUploadDialog(true)}
                connectionStatus={<ConnectionStatus />}
            />

            {/* Dynamic Cover with Title */}
            <DynamicEventCover
                eventDetails={eventState.details}
                photoCount={Math.max(totalPhotos, (eventState.details as any).stats?.count || 0)}
                totalPhotos={totalPhotos}
            >
                {/* Can place upload button here if needed, but keeping it simple for now */}
            </DynamicEventCover>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
                {/* Notification Banner */}
                {showNotificationBanner && (
                    <NotificationBanner
                        isVisible={showNotificationBanner}
                        type="info"
                        message={`${bufferedCount} new photos available`}
                        count={bufferedCount}
                        onAction={handleApplyBufferedChanges}
                        actionLabel="Update"
                        onDismiss={handleDismissNotification}
                    />
                )}

                {/* Claim Banner (if applicable) */}
                {hasClaimableContent && claimSummary && (
                    <div className="mb-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full text-blue-600 dark:text-blue-300">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-medium text-blue-800 dark:text-blue-200">
                                    Previous guest session found
                                </h4>
                                <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                                    We found {claimSummary.totalMedia} photos uploaded by you from a previous session.
                                    Would you like to link them to your current account?
                                </p>
                            </div>
                            <Button size="sm" onClick={() => window.location.reload()}>
                                Link Photos
                            </Button>
                        </div>
                    </div>
                )}

                <div className="mb-6 flex justify-between items-center">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {activeTab === 'all'
                            ? `${Math.max(displayedPhotos.length, (eventState.details as any).stats?.count || 0)} photos shared`
                            : `${displayedPhotos.length} photos found`
                        }
                    </div>

                    <BulkDownloadButton
                        shareToken={shareToken}
                        eventTitle={eventState.details.title}
                        totalPhotos={totalPhotos}
                        authToken={auth}
                        // If logged in as guest
                        guestName={guestInfo.name}
                        guestEmail={guestInfo.email}
                    />
                </div>

                {/* Rows Layout (Google Photos Style) - Only show if not showing empty state */}
                {!(activeTab === 'my_photos' && !guestToken) && (
                    <RowsPhotoGallery
                        photos={displayedPhotos as any}
                        onPhotoClick={(photo, index) => handlePhotoClick(photo as any, index)}
                        userPermissions={{
                            upload: eventState.access?.can_upload || true,
                            download: eventState.access?.can_download || true,
                            moderate: false,
                            delete: false
                        }}
                        currentTab="approved"
                        onStatusUpdate={() => { }}
                        targetRowHeight={220}
                        onNearEnd={hasNextPage && !isInitialLoading ? loadMore : undefined}
                        selectionMode={false}
                    />
                )}

                {/* Loading States */}
                {isInitialLoading && (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-color)]" />
                    </div>
                )}

                {isLoadingMore && (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        <span className="ml-2 text-sm text-gray-500">Loading more moments...</span>
                    </div>
                )}

                {/* End of content */}
                {!hasNextPage && !isInitialLoading && displayedPhotos.length > 0 && (
                    <div className="text-center py-12 text-gray-400 text-sm">
                        You've reached the end
                    </div>
                )}

                {/* Empty State */}
                {!isInitialLoading && activeTab === 'my_photos' && !guestToken && (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12">
                        <div className="relative mb-8">
                            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
                                <Camera className="w-16 h-16 text-blue-500 dark:text-blue-400" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 text-center">
                            Find Your Photos
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8">
                            Upload a quick selfie and our AI will instantly find all the photos you appear in.
                            No more scrolling through hundreds of images!
                        </p>
                        <Button
                            onClick={() => setShowFindMeModal(true)}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                        >
                            <Camera className="w-5 h-5 mr-2" />
                            Upload Selfie to Find Me
                        </Button>
                        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl">
                            <div className="text-center">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                                    <span className="text-2xl">⚡</span>
                                </div>
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">Instant Results</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">AI scans the entire gallery in seconds</p>
                            </div>
                            <div className="text-center">
                                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                                    <span className="text-2xl">🔒</span>
                                </div>
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">Private & Secure</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Your selfie is not stored or shared</p>
                            </div>
                            <div className="text-center">
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                                    <span className="text-2xl">✨</span>
                                </div>
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">Accurate Matching</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Advanced facial recognition technology</p>
                            </div>
                        </div>
                    </div>
                )}

                {!isInitialLoading && displayedPhotos.length === 0 && activeTab !== 'my_photos' && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <Camera className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                            No photos yet
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                            Be the first to share a moment from this event!
                        </p>
                        <Button
                            onClick={() => setShowUploadDialog(true)}
                            className="bg-[var(--primary-color)] text-[var(--primary-foreground)] hover:brightness-110"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Upload Photos
                        </Button>
                    </div>
                )}
            </main>

            {/* Floating Upload Button (Mobile) */}
            <button
                onClick={() => setShowUploadDialog(true)}
                className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-[var(--primary-color)] text-[var(--primary-foreground)] rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40"
            >
                <Plus className="w-7 h-7" />
            </button>

            {/* Upload Dialog */}
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Share your photos</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {!auth && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Your Name</label>
                                    <Input
                                        placeholder="John Doe"
                                        value={guestInfo.name}
                                        onChange={(e) => setGuestInfo(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email (Optional)</label>
                                    <Input
                                        type="email"
                                        placeholder="john@example.com"
                                        value={guestInfo.email}
                                        onChange={(e) => setGuestInfo(prev => ({ ...prev, email: e.target.value }))}
                                    />
                                </div>
                            </div>
                        )}

                        <div
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${selectedFiles.length > 0
                                ? 'border-[var(--primary-color)] bg-blue-50 dark:bg-blue-900/10'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                        >
                            <input
                                type="file"
                                id="photo-upload"
                                multiple
                                accept="image/*,video/*"
                                className="hidden"
                                onChange={handleFileSelect}
                                disabled={uploading}
                            />

                            {selectedFiles.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex flex-wrap gap-2 justify-center max-h-40 overflow-y-auto">
                                        {selectedFiles.map((file, i) => (
                                            <div key={i} className="relative group">
                                                <div className="w-16 h-16 rounded overflow-hidden bg-gray-100">
                                                    {file.type.startsWith('image/') ? (
                                                        <img
                                                            src={URL.createObjectURL(file)}
                                                            alt={file.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                                            Video
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        removeFile(i);
                                                    }}
                                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {selectedFiles.length} files selected
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setSelectedFiles([])}
                                            disabled={uploading}
                                            className="flex-1"
                                        >
                                            Clear
                                        </Button>
                                        <label
                                            htmlFor="photo-upload"
                                            className="flex-1 cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                                        >
                                            Add More
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <label
                                    htmlFor="photo-upload"
                                    className="cursor-pointer flex flex-col items-center gap-2"
                                >
                                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            Click to upload photos
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            JPG, PNG, GIF up to 50MB
                                        </p>
                                    </div>
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => setShowUploadDialog(false)}
                            disabled={uploading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpload}
                            disabled={uploading || selectedFiles.length === 0}
                            className="bg-[var(--primary-color)] text-[var(--primary-foreground)] hover:brightness-110"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                'Upload Photos'
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Selfie Upload Modal */}
            {showFindMeModal && (
                <SelfieUploadModal
                    isOpen={showFindMeModal}
                    onClose={() => setShowFindMeModal(false)}
                    onSearchResults={handleSearchResults}
                    eventId={eventState.details._id}
                />
            )}

            {/* Full Screen Viewer (Lazy Loaded) */}
            {photoViewerOpen && selectedPhoto && (
                <FullscreenPhotoViewer
                    selectedPhoto={selectedPhoto as any}
                    selectedPhotoIndex={selectedPhotoIndex}
                    photos={photos as any}
                    userPermissions={{
                        download: eventState.access?.can_download || true,
                        delete: false
                    }}
                    onClose={() => setPhotoViewerOpen(false)}
                    onPrev={() => navigatePhoto('prev')}
                    onNext={() => navigatePhoto('next')}
                    deletePhoto={() => { }}
                    downloadPhoto={(photo) => {
                        const link = document.createElement('a');
                        link.href = photo.imageUrl;
                        link.download = `photo-${photo.id}.jpg`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }}
                />
            )}
        </div>
    );
}

// Wrap with Client Providers
export default function GuestPageClientWrapper(props: GuestPageClientProps) {
    return (
        <QueryClientProvider client={queryClient}>
            <GuestPageClient {...props} />
        </QueryClientProvider>
    );
}
