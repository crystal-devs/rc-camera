// app/events/[eventId]/page.tsx
'use client';

import {
    CalendarIcon,
    CameraIcon,
    FolderIcon,
    MapPinIcon,
    ShareIcon,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { use, useEffect, useState, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

import AlbumManagement from '@/components/album/AlbumManagement';
import PhotoGallery from '@/components/photo/PhotoGallery';
import EventHeaderDetails from '@/components/event/EventDetailsHeader';
import { format } from 'date-fns';

// Import our optimized hook
import { useEventData } from '@/hooks/useEventData';
import useEventStore from '@/stores/useEventStore';

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

            <div className="mx-auto px-0 py-0 sm:px-2 sm:py-2">
                {/* Event Info Section */}
                {/* <div className="flex flex-wrap gap-3 mb-4 sm:mb-6">
                    <div className="flex items-center text-sm">
                        <CalendarIcon className="h-4 w-4 mr-1.5" />
                        {format(new Date(event.start_date), 'MMM d, yyyy')}
                    </div>

                    {event.location?.address && (
                        <div className="flex items-center text-sm text-gray-600">
                            <MapPinIcon className="h-4 w-4 mr-1.5" />
                            {event.location.name || event.location.address}
                        </div>
                    )}
                </div>

                {event.description && (
                    <p className="text-gray-700 mb-4 sm:mb-6">{event.description}</p>
                )} */}

                {/* Quick Actions */}
                {/* <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                    <Button onClick={quickShare} variant="outline" size="sm">
                        <ShareIcon className="h-4 w-4 mr-2" />
                        Share Event
                    </Button>
                </div> */}

                {/* Tabs Section */}
                {/* <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                >
                    <TabsList className="w-full mb-6">
                        <TabsTrigger value="photos" className="flex-1">
                            <CameraIcon className="h-4 w-4 mr-2" />
                            Photos
                        </TabsTrigger>
                        <TabsTrigger value="albums" className="flex-1">
                            <FolderIcon className="h-4 w-4 mr-2" />
                            Albums ({albums.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="photos">
                        <PhotoGallery
                            eventId={eventId}
                            albumId={null}
                            canUpload={true}
                        />
                    </TabsContent>

                    <TabsContent value="albums">
                        {isLoadingAlbums ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <Skeleton key={i} className="h-24 w-full" />
                                ))}
                            </div>
                        ) : (
                            <AlbumManagement
                                eventId={eventId}
                                initialAlbums={albums}
                                onAlbumCreated={updateAlbumsList}
                                onRefresh={refreshAlbums}
                            />
                        )}
                    </TabsContent>
                </Tabs> */}

                <PhotoGallery
                    eventId={eventId}
                    albumId={null}
                    canUpload={true}
                />
            </div>
        </div>
    );
}