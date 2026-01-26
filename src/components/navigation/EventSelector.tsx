// components/navigation/EventSelector.tsx - Industry-standard optimized version
'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    ChevronDownIcon,
    CheckIcon,
    PlusIcon,
    Calendar,
    RefreshCw,
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
import { ErrorBoundary, EventSelectorError } from '@/components/ui/error-boundary';
import { EventSelectorSkeleton, EventSelectorTriggerSkeleton } from '@/components/ui/event-selector-skeleton';
import { useEventSelector } from '@/hooks/useEventSelector';
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
    const [showCreateEventDialogue, setShowCreateEventDialogue] = React.useState(false);

    // Use the optimized hook
    const {
        events,
        selectedEvent,
        isLoading,
        error,
        searchTerm,
        setSearchTerm,
        selectEvent,
        refreshEvents,
        hasEvents
    } = useEventSelector();

    // Enhanced event selection with navigation
    const handleEventSelect = React.useCallback((event: any) => {
        // Close dropdown first for better UX
        setOpen(false);

        // Use the hook's selectEvent method
        selectEvent(event);

        // Additional navigation logic if needed
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
    }, [selectEvent, pathname, router]);

    return (
        <ErrorBoundary>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-[280px] justify-between border-gray-200 dark:border-gray-700"
                        disabled={isLoading}
                    >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            {isLoading ? (
                                <EventSelectorTriggerSkeleton />
                            ) : (
                                <>
                                    <Calendar size={16} className="text-gray-500" />
                                    <span className="font-medium text-sm truncate text-left">
                                        {selectedEvent
                                            ? selectedEvent.title
                                            : (isLoading ? 'Loading...' : 'No events available')
                                        }
                                    </span>
                                </>
                            )}
                        </div>
                        <ChevronDownIcon className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                        <CommandInput
                            placeholder="Search events..."
                            className="h-9"
                            value={searchTerm}
                            onValueChange={setSearchTerm}
                        />
                        <CommandList>
                            <CommandEmpty>
                                {isLoading ? 'Loading events...' : 'No events found.'}
                            </CommandEmpty>
                            {isLoading ? (
                                <EventSelectorSkeleton />
                            ) : (
                                events.length > 0 && (
                                    <CommandGroup>
                                        {events.map((event: any) => (
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
                                )
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
                    // Refresh events to include the new one
                    refreshEvents();
                    setShowCreateEventDialogue(false);
                }}
            />
        </ErrorBoundary>
    );
}