// components/navigation/ModernEventSelector.tsx
'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    ChevronDownIcon,
    CheckIcon,
    PlusIcon,
    Calendar,
} from 'lucide-react';

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import useEventStore from '@/stores/useEventStore';
import { fetchEvents } from '@/services/apis/events.api';

// Helper function to determine the current page type
const getCurrentPageType = (pathname: string): string => {
    if (pathname.includes('/settings')) return 'settings';
    if (pathname.includes('/capture')) return 'capture';
    if (pathname.includes('/templates')) return 'templates';
    if (pathname.includes('/highlights')) return 'highlights';
    if (pathname.includes('/shop')) return 'shop';
    if (pathname.includes('/upload')) return 'upload';
    if (pathname.includes('/wall')) return 'wall';
    if (pathname.includes('/events/')) return 'photos';
    return 'dashboard';
};

export function EventSelector() {
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = React.useState(false);

    const {
        selectedEvent,
        events,
        setEvents,
        setSelectedEvent,
        isLoadingEvent
    } = useEventStore();

    const [isLoadingEvents, setIsLoadingEvents] = React.useState(false);
    const [authToken, setAuthToken] = React.useState('');

    // Initialize auth token
    React.useEffect(() => {
        const token = localStorage.getItem('authToken') || '';
        setAuthToken(token);
    }, []);

    // Fetch events when dropdown opens and we don't have events yet
    React.useEffect(() => {
        const loadEvents = async () => {
            if (!open || events.length > 0 || !authToken || isLoadingEvents) return;

            setIsLoadingEvents(true);

            try {
                const fetchedEvents = await fetchEvents();
                setEvents(fetchedEvents);
                console.log(`✅ Loaded ${fetchedEvents.length} events`);
            } catch (error) {
                console.error('❌ Failed to load events:', error);
            } finally {
                setIsLoadingEvents(false);
            }
        };

        loadEvents();
    }, [open, events.length, authToken, isLoadingEvents, setEvents]);

    const handleEventSelect = (event: any) => {
        console.log('🎯 Selecting event:', event.title);

        // Update the store first
        setSelectedEvent(event, event.user_role);
        setOpen(false);

        // Determine where to navigate based on current page
        const currentPageType = getCurrentPageType(pathname);
        let targetRoute = '';

        switch (currentPageType) {
            case 'settings':
                targetRoute = `/events/${event._id}/settings`;
                break;
            case 'templates':
                targetRoute = `/events/${event._id}/templates`;
                break;
            case 'highlights':
                targetRoute = `/events/${event._id}/highlights`;
                break;
            case 'shop':
                targetRoute = `/events/${event._id}/shop`;
                break;
            case 'photos':
            default:
                targetRoute = `/events/${event._id}`;
                break;
        }

        console.log(`🔄 Navigating to ${targetRoute}`);
        router.push(targetRoute);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[280px] justify-between border-gray-200 dark:border-gray-700"
                    disabled={isLoadingEvent}
                >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Calendar size={16} className="text-gray-500" />
                        <span className="font-medium text-sm truncate text-left">
                            {selectedEvent
                                ? selectedEvent.title
                                : (isLoadingEvent ? 'Loading...' : 'Select an event')
                            }
                        </span>
                    </div>
                    <ChevronDownIcon className="ml-2 h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[320px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search events..." className="h-9" />
                    <CommandList>
                        <CommandEmpty>
                            {isLoadingEvents ? 'Loading events...' : 'No events found.'}
                        </CommandEmpty>
                        {!isLoadingEvents && events.length > 0 && (
                            <CommandGroup>
                                {events.map((event) => (
                                    <CommandItem
                                        key={event._id}
                                        value={event.title}
                                        onSelect={() => handleEventSelect(event)}
                                        className="flex items-center gap-3 p-3"
                                    >
                                        <div className="bg-primary/10 p-1.5">
                                            <Calendar size={14} className="text-primary" />
                                        </div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm truncate">
                                                    {event.title}
                                                </span>
                                                {selectedEvent?._id === event._id && (
                                                    <CheckIcon className="ml-auto h-4 w-4 text-primary" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <Badge
                                                    variant={event.user_role === 'creator' ? 'default' : 'secondary'}
                                                    className="text-xs h-4"
                                                >
                                                    {event.user_role}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                        <Separator />
                        <CommandGroup>
                            <CommandItem
                                onSelect={() => {
                                    setOpen(false);
                                    router.push('/events/create');
                                }}
                                className="flex items-center gap-3 p-3 text-primary"
                            >
                                <div className="bg-primary/10 p-1.5">
                                    <PlusIcon size={14} className="text-primary" />
                                </div>
                                <span className="font-medium">Create New Event</span>
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}