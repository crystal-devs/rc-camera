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
    SettingsIcon
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
import FloatingNav from '@/components/navigation/FloatingNav';
import PhotoGallery from '@/components/album/PhotoGallery';
import AlbumManagement from '@/components/album/AlbumManagement';
import EventHeader from '@/components/event/EventHeader';
import EventHeaderDetails from '@/components/event/EventDetailsHeader';

interface Event {
    id: string;
    name: string;
    description?: string;
    date: Date;
    endDate?: Date;
    location?: string;
    coverImage?: string;
    createdAt: Date;
    createdById: number;
    accessType: 'public' | 'restricted';
    accessCode?: string;
    template?: string;
    isActive: boolean;
}

export default function EventDetailsPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);
    const router = useRouter();
    const [event, setEvent] = useState<Event | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('photos');
    const [qrDialogOpen, setQrDialogOpen] = useState(false);
    const [defaultAlbumId, setDefaultAlbumId] = useState<string | null>(null);

    useEffect(() => {
        const loadEvent = async () => {
            try {
                // Get event details
                const eventData = await db.events.get(eventId);
                if (!eventData) {
                    router.push('/events');
                    return;
                }

                setEvent(eventData);

                // Get default album
                const defaultAlbum = await db.albums
                    .where('eventId')
                    .equals(eventId)
                    .and(album => album.isDefault === true)
                    .first();

                if (defaultAlbum) {
                    setDefaultAlbumId(defaultAlbum.id);
                }
            } catch (error) {
                console.error('Error loading event:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadEvent();
    }, [eventId, router]);

    const getShareUrl = () => {
        return `${window.location.origin}/join?event=${eventId}&code=${event?.accessCode || ''}`;
    };

    const copyShareLink = () => {
        navigator.clipboard.writeText(getShareUrl());
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
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
                <p className="text-gray-500 mb-6">
                    The event you're looking for doesn't exist or has been removed.
                </p>
                <Button onClick={() => router.push('/events')}>Back to Events</Button>
            </div>
        );
    }

    return (
        <div className="w-full pb-20">
            {/* New Header Component */}
            <EventHeaderDetails event={event} />

            <div className="container mx-auto px-4 py-6">
                {/* Event Info Section - Simplified */}
                <div className="flex flex-wrap gap-3 mb-6">
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
                    <p className="text-gray-700 mb-6">{event.description}</p>
                )}

                {/* Action Buttons - Mobile Responsive */}
                <div className="flex flex-wrap gap-2 mb-6">
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
                                    Scan this QR code to join the event and view photos
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex flex-col items-center py-4">
                                <div className="bg-white p-4 rounded-lg shadow-sm">
                                    {/* QR code would go here */}
                                </div>

                                <div className="mt-4 text-center">
                                    <p className="text-sm font-medium mb-1">{event.name}</p>
                                    <p className="text-xs text-gray-500">Access Code: {event.accessCode}</p>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" className="w-full sm:w-auto" onClick={copyShareLink}>
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
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full mb-6">
                        <TabsTrigger value="photos" className="flex-1">
                            <CameraIcon className="h-4 w-4 mr-2" />
                            Photos
                        </TabsTrigger>
                        <TabsTrigger value="albums" className="flex-1">
                            <FolderIcon className="h-4 w-4 mr-2" />
                            Albums
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="photos">
                        {defaultAlbumId && (
                            <PhotoGallery
                                eventId={eventId}
                                albumId={defaultAlbumId}
                                canUpload={true}
                            />
                        )}
                    </TabsContent>

                    <TabsContent value="albums">
                        <AlbumManagement eventId={eventId} />
                    </TabsContent>
                </Tabs>
            </div>

            <FloatingNav />
        </div>
    );
}