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
import type { Event as StoreEvent } from '@/stores/useEventStore';
import { fetchEvents } from '@/services/apis/events.api';
import EventCreateModal from '@/components/event/CreateEventModel';

// Helper function to determine the current page type
const getCurrentPageType = (pathname: string): string => {
    if (pathname.includes('/settings')) return 'settings';
    if (pathname.includes('/capture')) return 'capture';
    if (pathname.includes('/templates')) return 'templates';
    if (pathname.includes('/highlights')) return 'highlights';
    if (pathname.includes('/shop')) return 'shop';
    if (pathname.includes('/upload')) return 'upload';
    if (pathname.includes('/wall')) return 'wall';
    if (pathname.includes('/media')) return 'media';
    if (pathname.includes('/events/')) return 'dashboard';
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
        isLoadingEvent,
        lastEventId
    } = useEventStore();

    const [isLoadingEvents, setIsLoadingEvents] = React.useState(false);
    const [authToken, setAuthToken] = React.useState('');
    const [showCreateEventDialogue, setShowCreateEventDialogue] = React.useState(false);
    const [hasInitialized, setHasInitialized] = React.useState(false);

    // Initialize auth token
    React.useEffect(() => {
        const token = localStorage.getItem('authToken') || '';
        setAuthToken(token);
    }, []);

    // Bootstrap: fetch and select initial event on first load
    React.useEffect(() => {
        const extractEventIdFromPath = (path: string): string | null => {
            const match = path.match(/\/events\/(\w+)/);
            return match ? match[1] : null;
        };

        const initializeEvent = async () => {
            // Guard conditions - prevent multiple initializations
            if (!authToken) return;
            if (hasInitialized) return;
            if (isLoadingEvents) return;
            if (selectedEvent) return;

            console.log('🔄 Initializing events...');
            setIsLoadingEvents(true);
            setHasInitialized(true);

            try {
                // Always fetch fresh events on initialization
                const apiEvents = await fetchEvents();
                console.log('📦 Fetched events:', apiEvents.length);

                setEvents(apiEvents as unknown as StoreEvent[]);

                // Handle empty events array
                if (!apiEvents || apiEvents.length === 0) {
                    console.log('⚠️ No events available');
                    setIsLoadingEvents(false);
                    return;
                }

                // Select appropriate event
                const urlEventId = extractEventIdFromPath(pathname || '');
                const preferredId = urlEventId || lastEventId || null;

                let eventToSelect = apiEvents[0];
                if (preferredId) {
                    const found = apiEvents.find(e => e._id === preferredId);
                    if (found) eventToSelect = found;
                }

                // Update the store first
                setSelectedEvent(eventToSelect as unknown as StoreEvent, eventToSelect.user_role);

                // If we're not already on this event's route, navigate
                const alreadyOnEvent = pathname?.includes(`/events/${eventToSelect._id}`);
                if (!alreadyOnEvent) {
                    const currentPageType = getCurrentPageType(pathname || '');
                    let targetRoute = '';

                    switch (currentPageType) {
                        case 'settings':
                            targetRoute = `/events/${eventToSelect._id}/settings`;
                            break;
                        case 'templates':
                            targetRoute = `/events/${eventToSelect._id}/templates`;
                            break;
                        case 'highlights':
                            targetRoute = `/events/${eventToSelect._id}/highlights`;
                            break;
                        case 'shop':
                            targetRoute = `/events/${eventToSelect._id}/shop`;
                            break;
                        case 'media':
                            targetRoute = `/events/${eventToSelect._id}/media`;
                            break;
                        default:
                            targetRoute = `/events/${eventToSelect._id}`;
                            break;
                    }

                    console.log(`🔄 Navigating to ${targetRoute}`);
                    router.replace(targetRoute);
                }
            } catch (error) {
                console.error('❌ Failed to initialize events:', error);
            } finally {
                setIsLoadingEvents(false);
            }
        };

        initializeEvent();
    }, [authToken, hasInitialized]); // Removed problematic dependencies

    // Fetch events when dropdown opens and we don't have events yet
    React.useEffect(() => {
        const loadEvents = async () => {
            if (!open || events.length > 0 || !authToken || isLoadingEvents) return;

            setIsLoadingEvents(true);

            try {
                const fetchedEvents = await fetchEvents();
                setEvents(fetchedEvents as unknown as StoreEvent[]);
                console.log(`✅ Loaded ${fetchedEvents.length} events`);
            } catch (error) {
                console.error('❌ Failed to load events:', error);
            } finally {
                setIsLoadingEvents(false);
            }
        };

        loadEvents();
    }, [open, authToken]); // Removed events.length and isLoadingEvents from dependencies

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
            case 'media':
                targetRoute = `/events/${event._id}/media`;
                break;
            default:
                targetRoute = `/events/${event._id}`;
                break;
        }

        console.log(`🔄 Navigating to ${targetRoute}`);
        router.push(targetRoute);
    };

    return (
        <>
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
                                    : (isLoadingEvent ? 'Loading...' : 'No events available')
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
                                        setShowCreateEventDialogue(true);
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

            <EventCreateModal
                open={showCreateEventDialogue}
                onOpenChange={setShowCreateEventDialogue}
                onCreated={(created) => {
                    const updated = [...events as StoreEvent[], created as unknown as StoreEvent];
                    setEvents(updated);
                    setSelectedEvent(created as unknown as StoreEvent, created.user_role);
                    setShowCreateEventDialogue(false);
                }}
            />
        </>
    );
}