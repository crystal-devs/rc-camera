// hooks/useEventSelector.ts - Industry-standard event selector hook
'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { fetchEvents } from '@/services/apis/events.api';
import useEventStore from '@/stores/useEventStore';
import type { Event as StoreEvent } from '@/stores/useEventStore';
import type { Event } from '@/types/backend-types/event.type';

interface UseEventSelectorOptions {
  enableSearch?: boolean;
  enableAutoSelect?: boolean;
}

export const useEventSelector = (options: UseEventSelectorOptions = {}) => {
  const { enableSearch = true, enableAutoSelect = true } = options;
  const router = useRouter();
  const pathname = usePathname();

  const {
    selectedEvent,
    events: storeEvents,
    setEvents,
    setSelectedEvent,
    isLoadingEvent,
    lastEventId
  } = useEventStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);

  // Get auth token
  const authToken = typeof window !== 'undefined'
    ? (localStorage.getItem('rc-token') || '')
    : '';

  // React Query for server state management
  const {
    data: events,
    isLoading: isLoadingEvents,
    error: eventsError,
    refetch: refetchEvents
  } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: fetchEvents,
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    }
  });

  // Debounced search (300ms)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filtered events based on search
  const filteredEvents = useMemo(() => {
    if (!events) return [];

    if (!enableSearch || !debouncedSearchTerm.trim()) {
      return events;
    }

    return events.filter((event: Event) =>
      event.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [events, debouncedSearchTerm, enableSearch]);

  // Auto-select event on first load
  useEffect(() => {
    if (!enableAutoSelect || !events || events.length === 0 || hasInitialized || selectedEvent) {
      return;
    }

    const extractEventIdFromPath = (path: string): string | null => {
      const match = path.match(/\/events\/(\w+)/);
      return match ? match[1] : null;
    };

    const initializeSelection = () => {
      const urlEventId = extractEventIdFromPath(pathname || '');
      const preferredId = urlEventId || lastEventId || null;

      let eventToSelect = events[0];
      if (preferredId) {
        const found = events.find((e: Event) => e._id === preferredId);
        if (found) eventToSelect = found;
      }

      console.log('🎯 Auto-selecting event:', eventToSelect.title);
      setSelectedEvent(eventToSelect as unknown as StoreEvent, eventToSelect.user_role);
      setHasInitialized(true);
    };

    initializeSelection();
  }, [events, enableAutoSelect, hasInitialized, selectedEvent, pathname, lastEventId, setSelectedEvent]);

  // Event selection handler
  const selectEvent = useCallback((event: any) => {
    console.log('🎯 Selecting event:', event.title);

    // Update store
    setSelectedEvent(event, event.user_role);

    // Navigate to event page
    const currentPath = pathname || '';
    const isOnEventPage = currentPath.includes('/events/');

    if (!isOnEventPage) {
      router.push(`/events/${event._id}`);
    }
  }, [setSelectedEvent, pathname, router]);

  // Create new event handler
  const createNewEvent = useCallback(() => {
    // This would typically open a modal or navigate to create page
    console.log('📝 Creating new event...');
    // Implementation depends on your create flow
  }, []);

  // Refresh events
  const refreshEvents = useCallback(() => {
    refetchEvents();
  }, [refetchEvents]);

  return {
    // Data
    events: filteredEvents,
    selectedEvent,
    allEvents: events || [],

    // State
    isLoading: isLoadingEvents || isLoadingEvent,
    error: eventsError,
    searchTerm,
    hasEvents: (events?.length ?? 0) > 0,

    // Actions
    setSearchTerm,
    selectEvent,
    createNewEvent,
    refreshEvents,

    // Utilities
    authToken
  };
};