// app/events/[eventId]/page.tsx
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ImageIcon,
    ShareIcon,
    SettingsIcon,
    QrCodeIcon,
    ExternalLinkIcon,
    RefreshCwIcon,
    CopyIcon,
    InfoIcon,
    LockIcon,
    ClockIcon,
    EyeIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import useEventStore from '@/stores/useEventStore';

export default function EventDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params.eventId as string;

    const {
        selectedEvent,
        getEventFromCacheOrFetch,
        isLoadingEvent,
        userRole
    } = useEventStore();

    const [authToken, setAuthToken] = React.useState('');
    const [wallUrl, setWallUrl] = React.useState('');

    // Initialize auth token
    React.useEffect(() => {
        const token = localStorage.getItem('authToken') || '';
        setAuthToken(token);
    }, []);

    // Fetch event data
    React.useEffect(() => {
        if (eventId && authToken && (!selectedEvent || selectedEvent._id !== eventId)) {
            getEventFromCacheOrFetch(eventId, authToken);
        }
    }, [eventId, authToken, selectedEvent, getEventFromCacheOrFetch]);

    // Generate wall URL
    React.useEffect(() => {
        if (selectedEvent?.share_token) {
            const baseUrl = window.location.origin;
            setWallUrl(`${baseUrl}/wall/${selectedEvent.share_token}`);
        }
    }, [selectedEvent]);

    const handleCopyLink = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Link copied to clipboard!');
        } catch (error) {
            toast.error('Failed to copy link');
        }
    };

    const handleOpenAlbum = () => {
        if (selectedEvent) {
            router.push(`/events/${selectedEvent._id}`);
        }
    };

    const handleShare = () => {
        if (selectedEvent) {
            router.push(`/events/${selectedEvent._id}/share`);
        }
    };

    const handleManageUploads = () => {
        if (selectedEvent) {
            router.push(`/events/${selectedEvent._id}/manage`);
        }
    };

    const handleDownloadQR = () => {
        if (selectedEvent) {
            router.push(`/events/${selectedEvent._id}/qr`);
        }
    };

    const handleOpenWall = () => {
        if (wallUrl) {
            window.open(wallUrl, '_blank');
        }
    };

    const handleShareWall = () => {
        handleCopyLink(wallUrl);
    };

    const handleGoToSettings = () => {
        if (selectedEvent) {
            router.push(`/events/${selectedEvent._id}/settings`);
        }
    };

    const getPrivacyText = () => {
        if (!selectedEvent) return '';

        switch (selectedEvent.visibility) {
            case 'public':
                return 'Public - Anyone can find and access this event';
            case 'anyone_with_link':
                return 'Accessible to all with link/QR code. Guest can view and upload to the album.';
            case 'private':
                return 'Private - Only invited users can access';
            default:
                return 'Unknown privacy setting';
        }
    };

    const getModerationText = () => {
        // Based on your API, this might be determined by permissions or settings
        // For now, showing a general message
        return 'Uploads immediately visible in the album, no pre-publishing moderation.';
    };

    if (isLoadingEvent) {
        return (
            <div className="container mx-auto py-8 px-6">
                <div className="flex items-center justify-center h-64">
                    <RefreshCwIcon className="h-8 w-8 animate-spin text-gray-400" />
                </div>
            </div>
        );
    }

    if (!selectedEvent) {
        return (
            <div className="container mx-auto py-8 px-6">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold text-gray-900">Event not found</h1>
                    <p className="text-gray-600 mt-2">The event you're looking for doesn't exist or you don't have access to it.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-6 max-w-6xl">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                            Welcome, {selectedEvent.created_by}! 👋
                        </h1>
                        <p className="text-gray-600">
                            This is your dashboard, where you can access your album and photo wall.
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.location.reload()}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <RefreshCwIcon className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Event Title */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-6">{selectedEvent.title}</h2>
                    </div>

                    {/* How it works section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900">How it works?</h3>
                        </div>

                        {/* Action Cards */}
                        <div className="space-y-4">
                            {/* Open Album */}
                            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-lg">
                                <div className="flex items-start gap-4">
                                    <div className="bg-green-100 p-2 rounded-lg">
                                        <ImageIcon className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-1">Open your album</h4>
                                        <p className="text-sm text-gray-600">
                                            The album is where all added photos and videos will appear.
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    className="bg-gray-900 hover:bg-gray-800 text-white w-32"
                                    onClick={handleOpenAlbum}
                                >
                                    Open
                                </Button>
                            </div>

                            {/* Invite Others */}
                            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-lg">
                                <div className="flex items-start gap-4">
                                    <div className="bg-blue-100 p-2 rounded-lg">
                                        <ShareIcon className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-1">Invite others to contribute</h4>
                                        <p className="text-sm text-gray-600">
                                            Share your album so others can add their uploads too!
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    className='w-32'
                                    onClick={handleShare}
                                >
                                    Share
                                </Button>
                            </div>

                            {/* Manage Uploads */}
                            <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-100 rounded-lg">
                                <div className="flex items-start gap-4">
                                    <div className="bg-orange-100 p-2 rounded-lg">
                                        <SettingsIcon className="h-5 w-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-1">Manage uploads</h4>
                                        <p className="text-sm text-gray-600">
                                            Moderate uploads, hide, delete, and publish in bulk!
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    className='w-32'

                                    onClick={handleManageUploads}
                                >
                                    Manage
                                </Button>
                            </div>

                            {/* Download QR */}
                            <div className="flex items-center justify-between p-4 bg-purple-50 border border-purple-100 rounded-lg">
                                <div className="flex items-start gap-4">
                                    <div className="bg-purple-100 p-2 rounded-lg">
                                        <QrCodeIcon className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-1">Download QR code</h4>
                                        <p className="text-sm text-gray-600">
                                            Print it on invitations or display it at your event for easy guest uploads.
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    className='w-32'

                                    onClick={handleDownloadQR}
                                >
                                    Download
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Photo Wall Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900">Your photo wall (slideshow)</h3>
                            <h4 className="text-sm font-medium text-gray-600">How it works?</h4>
                        </div>

                        <p className="text-sm text-gray-600">
                            Watch it on any screen or connect to a TV or projector for a live stream of uploads.
                        </p>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                            <div className="text-center mb-6">
                                <div className="bg-gray-100 rounded-lg p-12 mb-4">
                                    <p className="text-gray-500 text-sm">
                                        Your photo wall preview will appear<br />
                                        once photos and videos are added in<br />
                                        your album. ❤️
                                    </p>
                                </div>

                                <div className="bg-white border rounded-lg p-3 mb-4">
                                    <Input
                                        value={wallUrl}
                                        readOnly
                                        className="text-center text-sm border-0 focus-visible:ring-0"
                                    />
                                </div>

                                <div className="flex justify-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleOpenWall}
                                    >
                                        Open
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleShareWall}
                                    >
                                        Share
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Statistics */}
                    <Card className="shadow-none">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-medium flex items-center gap-2">
                                    📊 Statistics
                                </CardTitle>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <RefreshCwIcon className="h-4 w-4" />
                                </Button>
                            </div>
                            <CardDescription className="text-sm">
                                See your uploads by status and check remaining storage.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-600">
                                        {selectedEvent.stats.total_size_mb.toFixed(2)} GB of 0.0 GB used (0%)
                                    </span>
                                    <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                                        Upgrade
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 flex items-center gap-1">
                                        Published <ExternalLinkIcon className="h-3 w-3" />
                                    </span>
                                    <span className="text-sm font-medium">{selectedEvent.stats.photos + selectedEvent.stats.videos}</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 flex items-center gap-1">
                                        Needs approval <ExternalLinkIcon className="h-3 w-3" />
                                    </span>
                                    <span className="text-sm font-medium">{selectedEvent.stats.pending_approval}</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 flex items-center gap-1">
                                        Unpublished <ExternalLinkIcon className="h-3 w-3" />
                                    </span>
                                    <span className="text-sm font-medium">0</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Album Status */}
                    <Card className="shadow-none">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium flex items-center gap-2">
                                🔒 Album status
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 text-sm ml-auto"
                                    onClick={handleGoToSettings}
                                >
                                    Go to Settings
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Privacy */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm font-medium">Privacy</span>
                                    <InfoIcon className="h-4 w-4 text-gray-400" />
                                </div>
                                <p className="text-xs text-gray-600">
                                    {getPrivacyText()}
                                </p>
                            </div>

                            <Separator />

                            {/* Moderation */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm font-medium">Moderation</span>
                                </div>
                                <p className="text-xs text-gray-600">
                                    {getModerationText()}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Event Details */}
                    <Card className="shadow-none">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-medium">Event Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                                <EyeIcon className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600">Visibility:</span>
                                <Badge variant="secondary" className="text-xs">
                                    {selectedEvent.visibility}
                                </Badge>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                                <ClockIcon className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600">Created:</span>
                                <span className="text-gray-900">
                                    {new Date(selectedEvent.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            {selectedEvent.location?.name && (
                                <div className="text-sm">
                                    <span className="text-gray-600">Location:</span>
                                    <span className="text-gray-900 ml-1">{selectedEvent.location.name}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}