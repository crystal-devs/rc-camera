// app/events/[eventId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import {
    CalendarIcon,
    MapPinIcon,
    UsersIcon,
    QrCodeIcon,
    ShareIcon,
    CameraIcon,
    FolderIcon,
    SettingsIcon,
    RefreshCcwIcon
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/db';
import PhotoGallery from '@/components/album/PhotoGallery';
import AlbumManagement from '@/components/album/AlbumManagement';
import EventHeader from '@/components/event/EventHeader';
import EventHeaderDetails from '@/components/event/EventDetailsHeader';
import EventCoverSection from '@/components/event/EventCoverSection';
import { getEventById } from '@/services/apis/events.api';
import { fetchEventAlbums } from '@/services/apis/albums.api';
import { Album, ApiAlbum } from '@/types/album';
import { Event } from '@/types/events';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api-config';
import { mapApiAlbumToAlbum } from '@/lib/album-mappers';

export default function EventDetailsPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);
    const router = useRouter();
    const [event, setEvent] = useState<Event | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('photos');
    const [qrDialogOpen, setQrDialogOpen] = useState(false);
    const [defaultAlbumId, setDefaultAlbumId] = useState<string | null>(null);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [albumsLoaded, setAlbumsLoaded] = useState(false);

    // Add an album update function that can be passed to AlbumManagement
    const updateAlbumsList = (newAlbum: Album) => {
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
                    console.log('Event data fetched successfully:', eventData.name);
                    setEvent(eventData as Event);
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
        // Use the refreshAlbums function for initial load and refreshes
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
        
    }, [eventId]); // Only depend on eventId, so it reloads when event changes

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
            
            // Try the direct fetch method as a fallback
            console.log('Error in standard refresh, trying direct fetch as fallback');
            try {
                return albums;
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                
                if (error instanceof Error) {
                    toast.error(error.message || "Failed to refresh albums. Please try again.");
                } else {
                    toast.error("Failed to refresh albums. Please try again.");
                }
                return [];
            }
        }
    };

    const [shareToken, setShareToken] = useState<string | null>(null);
    const [isCreatingShareToken, setIsCreatingShareToken] = useState(false);

    const getShareUrl = () => {
        // If we have a generated share token, use it for a more secure link
        if (shareToken) {
            return `${window.location.origin}/join?token=${shareToken}`;
        }
        
        // Legacy fallback
        if (event?.accessType === 'restricted') {
            return `${window.location.origin}/join?event=${eventId}&code=${event?.accessCode || ''}`;
        }
        
        // For public events, no need for access code
        return `${window.location.origin}/join?event=${eventId}`;
    };

    const generateShareToken = async (): Promise<string | null> => {
        if (!event) return null;
        
        try {
            setIsCreatingShareToken(true);
            const token = localStorage.getItem('authToken') || '';
            
            console.log('Generating share token for event:', eventId);
            console.log('Auth token available:', !!token);
            
            // Import the createShareToken function
            const { createShareToken } = await import('@/services/apis/sharing.api');
            
            console.log('Calling createShareToken with:', {
                type: 'event',
                eventId,
                permissions: { canView: true, canUpload: true, canDownload: true }
            });
            
            const shareTokenData = await createShareToken(
                'event',
                eventId,
                undefined, // No specific album
                { canView: true, canUpload: true, canDownload: true },
                undefined, // No expiration
                undefined, // No password
                token
            );
            
            console.log('Share token created successfully:', shareTokenData);
            setShareToken(shareTokenData.token);
            toast.success("Secure share link created!");
            return shareTokenData.token;
        } catch (error) {
            console.error('Error generating share token:', error);
            toast.error("Failed to create share link. Using fallback link.");
            return null;
        } finally {
            setIsCreatingShareToken(false);
        }
    };

    const copyShareLink = async () => {
        // If we don't have a share token yet, create one first
        let tokenToUse = shareToken;
        
        console.log('copyShareLink called, current shareToken:', shareToken);
        console.log('Event access type:', event?.accessType);
        
        if (!tokenToUse && event && event.accessType !== 'public') {
            console.log('No existing token, generating new one...');
            tokenToUse = await generateShareToken();
            console.log('New token generated:', tokenToUse);
        } else {
            console.log('Using existing token or public event, no need to generate');
        }
        
        // Copy the share URL to clipboard
        const shareUrl = getShareUrl();
        console.log('Final share URL being copied:', shareUrl);
        navigator.clipboard.writeText(shareUrl);
        toast.success("Share link copied to clipboard");
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
                {/* Event Info Section - Simplified */}
                <div className="flex flex-wrap gap-3 mb-4 sm:mb-6">
                    <div className="flex items-center text-sm text-gray-600">
                        <CalendarIcon className="h-4 w-4 mr-1.5" />
                        {new Date(event.date).toLocaleDateString()}
                    </div>

                    {event.accessType && (
                        <div className="flex items-center text-sm text-gray-600">
                            <UsersIcon className="h-4 w-4 mr-1.5" />
                            {event.accessType === 'public' ? 'Public' : 'Restricted'}
                        </div>
                    )}
                </div>

                {event.description && (
                    <p className="text-gray-700 mb-4 sm:mb-6">{event.description}</p>
                )}

                {/* Action Buttons - Mobile Responsive */}
                <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                    <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="sm:flex items-center">
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
                                <div className="bg-white p-4 rounded-lg shadow-sm">
                                    {/* QR code would be generated based on the share URL */}
                                    {/* We'd use a QR code library in a real implementation */}
                                </div>

                                <div className="mt-4 text-center">
                                    <p className="text-sm font-medium mb-1">{event.name}</p>
                                    {event.accessType === 'restricted' && !shareToken && (
                                        <p className="text-xs text-yellow-600">
                                            This event requires an access code
                                        </p>
                                    )}
                                    {shareToken && (
                                        <p className="text-xs text-green-600">
                                            Using secure share token
                                        </p>
                                    )}
                                </div>
                            </div>

                            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between w-full">
                                {!shareToken && event?.accessType !== 'public' && (
                                    <Button 
                                        variant="outline" 
                                        className="w-full sm:w-auto" 
                                        onClick={generateShareToken}
                                        disabled={isCreatingShareToken}
                                    >
                                        {isCreatingShareToken ? (
                                            <span>Creating...</span>
                                        ) : (
                                            <>
                                                <RefreshCcwIcon className="h-4 w-4 mr-2" />
                                                Create Secure Link
                                            </>
                                        )}
                                    </Button>
                                )}
                                
                                <Button 
                                    variant={shareToken ? "default" : "outline"}
                                    className="w-full sm:w-auto" 
                                    onClick={copyShareLink}
                                >
                                    <ShareIcon className="h-4 w-4 mr-2" />
                                    Copy Link
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button variant="outline" className="sm:flex items-center" onClick={copyShareLink}>
                        <ShareIcon className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Share</span>
                    </Button>
                
                </div>

                {/* Tabs Section */}
                <Tabs 
                    value={activeTab} 
                    onValueChange={(value) => {
                        // When switching tabs, no need to force a reload anymore
                        // since we're storing albums at the page level
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
                        {/* For Photos tab, we always render the gallery and explicitly set albumId to null */}
                        {/* This ensures we show ALL photos from ALL albums in this event */}
                        <PhotoGallery
                            eventId={eventId}
                            albumId={null} // Explicitly null to show all event photos
                            canUpload={true}
                        />
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
            </div>
        </div>
    );
}