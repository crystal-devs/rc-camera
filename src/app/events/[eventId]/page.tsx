// app/events/[eventId]/page.tsx
'use client';

import {
    CalendarIcon,
    CameraIcon,
    FolderIcon,
    MapPinIcon,
    QrCodeIcon,
    SettingsIcon,
    ShareIcon,
    UsersIcon
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { use, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

import AlbumManagement from '@/components/album/AlbumManagement';
import PhotoGallery from '@/components/album/PhotoGallery';
import EventHeaderDetails from '@/components/event/EventDetailsHeader';
import ShareManagement from '@/components/event/ShareManagement';
import { fetchEventAlbums } from '@/services/apis/albums.api';
import { getEventById } from '@/services/apis/events.api';
import {
    getTokenInfo
} from '@/services/apis/sharing.api';
import EventCoverSection from '@/components/event/EventCoverSection';
import { format } from 'date-fns';



// Main Event Details Page Component
export default function EventDetailsPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();

    const [event, setEvent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('photos');
    const [qrDialogOpen, setQrDialogOpen] = useState(false);
    const [shareSheetOpen, setShareSheetOpen] = useState(false);
    const [defaultAlbumId, setDefaultAlbumId] = useState<string | null>(null);
    const [albums, setAlbums] = useState<any[]>([]);
    const [albumsLoaded, setAlbumsLoaded] = useState(false);

    const isSharedAccess = searchParams.get('via') === 'share';
    const shareToken = searchParams.get('token');
    const showWelcome = searchParams.get('welcome') === 'true';
    const isReturning = searchParams.get('returning') === 'true';
    const status = searchParams.get('status');

    // Authentication
    const [authToken, setAuthToken] = useState<string>('');
    const [sharePermissions, setSharePermissions] = useState(null);
    const [isSharedUser, setIsSharedUser] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('authToken') || '';
        setAuthToken(token);
    }, []);

    // Add this function inside your component
    const validateShareAccess = async () => {
        if (!isSharedAccess || !shareToken) return;

        try {
            const tokenInfo = await getTokenInfo(shareToken);
            setSharePermissions(tokenInfo.token.permissions);
            setIsSharedUser(true);

            // Store sharing context in localStorage for consistent experience
            localStorage.setItem('shareContext', JSON.stringify({
                token: shareToken,
                permissions: tokenInfo.token.permissions,
                eventId: eventId
            }));
        } catch (error) {
            console.error('Invalid share token:', error);
            // Redirect to join page if token is invalid
            router.push(`/join/${shareToken}`);
        }
    };

    // Call this in useEffect
    useEffect(() => {
        validateShareAccess();
    }, [isSharedAccess, shareToken]);

    // Add an album update function that can be passed to AlbumManagement
    const updateAlbumsList = (newAlbum: any) => {
        console.log(`EventDetailsPage: Updating albums list with new album: ${newAlbum.id}`, newAlbum);

        setAlbums(prevAlbums => {
            // If it's a default album, remove any existing default album
            if (newAlbum.isDefault) {
                const updatedAlbums = [newAlbum, ...prevAlbums.filter(album => !album.isDefault && album.id !== newAlbum.id)];
                console.log(`Updated albums list (default album case): ${updatedAlbums.length} albums`);
                return updatedAlbums;
            }
            // Otherwise, just add it to the top of the list
            const updatedAlbums = [newAlbum, ...prevAlbums.filter(album => album.id !== newAlbum.id)];
            console.log(`Updated albums list: ${updatedAlbums.length} albums`);
            return updatedAlbums;
        });

        // If this is a default album, update the defaultAlbumId
        if (newAlbum.isDefault) {
            console.log(`Setting default album ID to: ${newAlbum.id}`);
            setDefaultAlbumId(newAlbum.id);
        }

        // Ensure we mark albums as loaded
        setAlbumsLoaded(true);
    };

    useEffect(() => {
        const loadEvent = async () => {
            try {
                const token = localStorage.getItem('authToken') || '';
                console.log(`Loading event data for ID: ${eventId}`);

                // Verify token presence
                if (!token) {
                    console.error('No auth token available');
                    toast.error("Authentication required. Please log in to view events.");
                    router.push('/login');
                    return;
                }

                console.log('Attempting to fetch event details from API...');
                const eventData = await getEventById(eventId, token);

                if (eventData) {
                    console.log('Event data fetched successfully:', eventData);
                    setEvent(eventData);
                } else {
                    console.error('No event data returned from API');
                    toast.error("Event not found. It may have been deleted or you don't have permission to view it.");
                }
            } catch (error) {
                console.error('Error loading event:', error);

                // More informative error messages based on error type
                if (error instanceof Error) {
                    if (error.message.includes('Network Error') || error.message.includes('connect')) {
                        toast.error(
                            "Network error: Cannot connect to the server. The API server might be down or not running.",
                            { duration: 8000 }
                        );
                    } else if (error.message.includes('401') || error.message.includes('403') ||
                        error.message.includes('Authentication')) {
                        toast.error("Authentication error. Please log in again.", { duration: 5000 });
                        router.push('/login');
                    } else if (error.message.includes('404') || error.message.includes('not found')) {
                        toast.error("Event not found. It may have been deleted or is not accessible.", { duration: 5000 });
                    } else {
                        toast.error(`Error: ${error.message}`, { duration: 5000 });
                    }
                } else {
                    toast.error("Failed to load event details. Please try again.");
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadEvent();
    }, [eventId, router]);

    // Load albums when the component mounts or eventId changes
    useEffect(() => {
        const loadAlbums = async () => {
            try {
                setIsLoading(true);
                await refreshAlbums();
            } catch (error) {
                console.error('Error loading albums:', error);
                toast.error("Failed to load albums. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        // Reset state when eventId changes
        setAlbumsLoaded(false);
        setAlbums([]);
        setDefaultAlbumId(null);

        // Always load albums on mount or when eventId changes
        loadAlbums();

    }, [eventId]);

    // Function to manually refresh albums
    const refreshAlbums = async () => {
        console.log(`Manually refreshing albums for event ${eventId}`);
        try {
            if (!eventId) {
                console.error('No eventId provided for refreshAlbums');
                return [];
            }

            const token = localStorage.getItem('authToken') || '';
            if (!token) {
                console.error('No auth token available for refreshAlbums');
                toast.error("Authentication required. Please log in again.");
                router.push('/login');
                return [];
            }

            // First try using the fixed fetchEventAlbums function
            let fetchedAlbums = await fetchEventAlbums(eventId, token);
            console.log(`Fetched ${fetchedAlbums.length} albums in refresh using API`);

            // Sort albums - default album first, then by creation date
            fetchedAlbums.sort((a, b) => {
                if (a.isDefault && !b.isDefault) return -1;
                if (!a.isDefault && b.isDefault) return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

            // Find the default album
            const defaultAlbum = fetchedAlbums.find(album => album.isDefault);
            if (defaultAlbum) {
                console.log(`Setting default album to: ${defaultAlbum.id}`);
                setDefaultAlbumId(defaultAlbum.id);
            } else if (fetchedAlbums.length > 0) {
                console.log(`No default album found, using first album: ${fetchedAlbums[0].id}`);
                setDefaultAlbumId(fetchedAlbums[0].id);
            } else {
                console.log('No albums found in refresh, clearing defaultAlbumId');
                setDefaultAlbumId(null);
            }

            setAlbums(fetchedAlbums);
            setAlbumsLoaded(true);

            return fetchedAlbums;
        } catch (error) {
            console.error('Error refreshing albums:', error);

            if (error instanceof Error) {
                toast.error(error.message || "Failed to refresh albums. Please try again.");
            } else {
                toast.error("Failed to refresh albums. Please try again.");
            }
            return [];
        }
    };

    // Quick Share Function
    const quickShare = async () => {
        try {
            if (!authToken) {
                toast.error('Authentication required');
                return;
            }

            // Create a quick share token
            const tokenData = {
                name: 'Quick Share Link',
                tokenType: 'invite' as const,
                permissions: {
                    view: true,
                    upload: true,
                    download: false,
                    share: false,
                    comment: true
                }
            };

            const shareUrl = `${window.location.origin}/join/${event.share_token}`;

            await navigator.clipboard.writeText(shareUrl);
            toast.success('Share link copied to clipboard!');
        } catch (error) {
            console.error('Error creating quick share:', error);
            toast.error('Failed to create share link');
        }
    };

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
        <div className="w-full pb-16 sm:pb-20">
            {/* Sticky Header */}
            <EventHeaderDetails event={event} />

            {/* Cover Image Section */}
            <EventCoverSection event={event} />

            <div className="mx-auto px-2 py-4 sm:px-2 sm:py-2">
                {/* Event Info Section */}
                <div className="flex flex-wrap gap-3 mb-4 sm:mb-6">
                    <div className="flex items-center text-sm ">
                        <CalendarIcon className="h-4 w-4 mr-1.5" />
                        {format(new Date(event.start_date), 'MMM d, yyyy')}
                    </div>


                    {event.location.address && (
                        <div className="flex items-center text-sm text-gray-600">
                            <MapPinIcon className="h-4 w-4 mr-1.5" />
                            {typeof event.location === 'object' && event.location !== null
                                ? (event.location.name || event.location.address || '')
                                : event.location}
                        </div>
                    )}
                </div>

                {event.description && (
                    <p className="text-gray-700 mb-4 sm:mb-6">{event.description}</p>
                )}

                {/* Action Buttons */}
                {/* <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                    <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <QrCodeIcon className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">QR Code</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Share Event</DialogTitle>
                                <DialogDescription>
                                    Scan this QR code or share the link to invite others
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col items-center py-4">
                                <div className="bg-white p-4 rounded-lg shadow-sm border">
                                    <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                                        <span className="text-gray-400">QR Code would appear here</span>
                                    </div>
                                </div>
                                <div className="mt-4 text-center">
                                    <p className="text-sm font-medium mb-1">{event.name}</p>
                                    <p className="text-xs text-gray-600">
                                        Share this QR code for quick access
                                    </p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={quickShare} className="w-full">
                                    <ShareIcon className="h-4 w-4 mr-2" />
                                    Copy Share Link
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div> */}
                {/* Tabs Section */}
                <Tabs
                    value={activeTab}
                    onValueChange={(value) => {
                        setActiveTab(value);
                    }}
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

                    </TabsContent>

                    <TabsContent value="albums">
                        <AlbumManagement
                            eventId={eventId}
                            initialAlbums={albums}
                            onAlbumCreated={updateAlbumsList}
                            onRefresh={refreshAlbums}
                        />
                    </TabsContent>
                </Tabs>

                <PhotoGallery
                    eventId={eventId}
                    albumId={null}
                    canUpload={true}
                />

            </div>
        </div>
    );
}