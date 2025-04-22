import React, { useState } from 'react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

import {
    ChevronLeftIcon,
    BookmarkIcon,
    HeartIcon,
    ShareIcon,
    MoreHorizontalIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { toast } from 'sonner';

interface EventHeaderProps {
    event: {
        id: string;
        name: string;
        location?: string;
        coverImage?: string;
        template?: string;
        isFavorite?: boolean;
    };
}


export default function EventHeader({ event }: EventHeaderProps) {
    const router = useRouter();
    const [isFavorite, setIsFavorite] = useState(event.isFavorite || false);

    const toggleFavorite = () => {
        setIsFavorite(!isFavorite);
        // Here you would save the favorite status to your database
    };
    return (
        <div>
            {/* Navigation and Action Buttons */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
                    onClick={() => router.back()}
                >
                    <ChevronLeftIcon className="h-6 w-6" />
                </Button>

                {/* Right Side Action Buttons */}
                <div className="flex gap-2">
                    {/* Bookmark Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
                    >
                        <BookmarkIcon className="h-5 w-5" />
                    </Button>

                    {/* Like/Heart Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 ${isFavorite ? 'text-green-400' : 'text-white'
                            }`}
                        onClick={toggleFavorite}
                    >
                        <HeartIcon className="h-5 w-5" fill={isFavorite ? "currentColor" : "none"} />
                    </Button>

                    {/* More Options Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
                            >
                                <MoreHorizontalIcon className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/events/${event.id}/edit`)}>
                                Edit Event
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/events/${event.id}/guests`)}>
                                Manage Guests
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-red-600"
                                onClick={async () => {
                                    if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
                                        try {
                                            // In a real app, you'd delete all related data too
                                            await db.events.delete(event.id);
                                            router.push('/events');
                                            toast.success(
                                                "The event has been permanently removed.",
                                            );
                                        } catch (error) {
                                            console.error('Error deleting event:', error);
                                        }
                                    }
                                }}
                            >
                                Delete Event
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    )
}
