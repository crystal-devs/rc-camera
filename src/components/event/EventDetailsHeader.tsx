// Slim Sticky Header Component
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, BookmarkIcon, HeartIcon, ShareIcon, MoreHorizontalIcon } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useStore } from '@/lib/store';

interface EventHeaderProps {
    event: {
        _id: string;
        name: string;
        isFavorite?: boolean;
    };
}

export default function EventDetailsHeader({ event }: EventHeaderProps) {
    const router = useRouter();
    const { fetchUsage } = useStore();
    const [isFavorite, setIsFavorite] = useState(event.isFavorite || false);

    const toggleFavorite = () => {
        setIsFavorite(!isFavorite);
        // Here you would save the favorite status to your database
    };

    const copyShareLink = () => {
        const shareUrl = `${window.location.origin}/join?event=${event._id}`;
        navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard");
    };

    const handleDeleteEvent = async () => {
        if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
            try {
                const authToken = localStorage.getItem('rc-token');
                if (!authToken) {
                    toast.error("You need to be logged in to delete this event");
                    return;
                }

                // Import the deleteEvent function from the API
                const { deleteEvent } = await import('@/services/apis/events.api');

                // Call the API to delete the event
                await deleteEvent(event._id, authToken);

                // Ensure usage data is refreshed
                fetchUsage();

                router.push('/events');
                toast.success("The event has been permanently removed.");
            } catch (error) {
                console.error('Error deleting event:', error);
                toast.error("Failed to delete the event. Please try again.");
            }
        }
    };

    return (
        <div className="sticky top-0 z-30 w-full bg-transparent backdrop-blur-md shadow-sm">
            {/* Desktop Header */}
            <div className="hidden sm:flex items-center justify-between px-4 py-3">
                <div className="flex items-center">
                    {/* No back button on desktop */}
                    <h1 className="text-lg font-semibold truncate max-w-[300px] md:max-w-[400px]">{event.name}</h1>
                </div>

                {/* Right side actions - desktop */}
                <div className="flex gap-2">
                    {/* Share Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full"
                        onClick={copyShareLink}
                    >
                        <ShareIcon className="h-4 w-4" />
                    </Button>

                    {/* More Options Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-full"
                            >
                                <MoreHorizontalIcon className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/events/${event._id}/edit`)}>
                                Edit Event
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/events/${event._id}/guests`)}>
                                Manage Guests
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-red-600"
                                onClick={handleDeleteEvent}
                            >
                                Delete Event
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Mobile Header */}
            <div className="sm:hidden flex items-center justify-between px-2 py-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() => router.back()}
                >
                    <ChevronLeftIcon className="h-5 w-5" />
                </Button>

                <h1 className="text-base font-semibold truncate max-w-[160px]">{event.name}</h1>

                {/* Right side actions - mobile */}
                <div className="flex gap-1">
                    {/* Share Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full"
                        onClick={copyShareLink}
                    >
                        <ShareIcon className="h-4 w-4" />
                    </Button>

                    {/* More Options Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-full"
                            >
                                <MoreHorizontalIcon className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/events/${event._id}/edit`)}>
                                Edit Event
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/events/${event._id}/guests`)}>
                                Manage Guests
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-red-600"
                                onClick={handleDeleteEvent}
                            >
                                Delete Event
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}