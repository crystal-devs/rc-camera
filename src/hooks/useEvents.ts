// hooks/useEvents.ts - React Query hook for events management
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { fetchEvents, createEvent, updateEvent, deleteEvent, toggleEventArchive } from '@/services/apis/events.api';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthToken } from '@/hooks/use-auth';
import type { Event } from '@/types/backend-types/event.type';

// Hook for fetching events list
export const useEvents = (options?: { enableBackgroundRefetch?: boolean }) => {
  const { enableBackgroundRefetch = false } = options || {};
  const authToken = useAuthToken();

  return useQuery({
    queryKey: queryKeys.eventsList(),
    queryFn: ({ signal }) => fetchEvents(authToken || '', signal),
    enabled: !!authToken,
    staleTime: enableBackgroundRefetch ? 0 : 5 * 60 * 1000, // No stale time for background refetch
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: enableBackgroundRefetch ? 'always' : false,
    refetchOnWindowFocus: enableBackgroundRefetch ? true : false,
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
    meta: {
      // Add cancellation support
      cancelOnUnmount: true,
    },
  });
};

// Hook for creating events
export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  const authToken = useAuthToken();

  return useMutation({
    mutationFn: (eventData: Partial<Event>) => createEvent(eventData, authToken || ''),
    onSuccess: (newEvent) => {
      // Update the events list cache
      queryClient.setQueryData<Event[]>(queryKeys.eventsList(), (oldEvents = []) => {
        return [newEvent, ...oldEvents];
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.events() });
    },
    retry: 1,
  });
};

// Hook for updating events
export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  const authToken = useAuthToken();

  return useMutation({
    mutationFn: ({ eventId, eventData }: { eventId: string; eventData: Partial<Event> }) =>
      updateEvent(eventId, eventData, authToken || ''),
    onMutate: async ({ eventId, eventData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.eventsList() });

      // Snapshot the previous value
      const previousEvents = queryClient.getQueryData<Event[]>(queryKeys.eventsList());

      // Optimistically update the cache
      queryClient.setQueryData<Event[]>(queryKeys.eventsList(), (oldEvents = []) => {
        return oldEvents.map(event =>
          event._id === eventId ? { ...event, ...eventData } : event
        );
      });

      // Return a context object with the snapshotted value
      return { previousEvents };
    },
    onError: (err, { eventId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousEvents) {
        queryClient.setQueryData(queryKeys.eventsList(), context.previousEvents);
      }
    },
    onSuccess: (updatedEvent) => {
      // Update the events list cache with the actual server response
      queryClient.setQueryData<Event[]>(queryKeys.eventsList(), (oldEvents = []) => {
        return oldEvents.map(event =>
          event._id === updatedEvent._id ? updatedEvent : event
        );
      });

      // Update individual event cache
      queryClient.setQueryData(queryKeys.event(updatedEvent._id), updatedEvent);
    },
    retry: 1,
  });
};

// Hook for deleting events
export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  const authToken = useAuthToken();

  return useMutation({
    mutationFn: (eventId: string) => deleteEvent(eventId, authToken || ''),
    onSuccess: (_, deletedEventId) => {
      // Remove from events list cache
      queryClient.setQueryData<Event[]>(queryKeys.eventsList(), (oldEvents = []) => {
        return oldEvents.filter(event => event._id !== deletedEventId);
      });

      // Remove individual event cache
      queryClient.removeQueries({ queryKey: queryKeys.event(deletedEventId) });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.events() });
    },
    retry: 1,
  });
};

// Hook for closing/reopening an event for guests (the dedicated archive route)
export const useToggleEventArchive = () => {
  const queryClient = useQueryClient();
  const authToken = useAuthToken();

  return useMutation({
    mutationFn: ({ eventId, archive }: { eventId: string; archive: boolean }) =>
      toggleEventArchive(eventId, archive, authToken || ''),
    onSuccess: (updatedEvent) => {
      if (updatedEvent?._id) {
        queryClient.setQueryData(queryKeys.event(updatedEvent._id), updatedEvent);
        queryClient.setQueryData<Event[]>(queryKeys.eventsList(), (oldEvents = []) =>
          oldEvents.map(event => (event._id === updatedEvent._id ? updatedEvent : event))
        );
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.events() });
    },
    retry: 1,
  });
};

// Hook for refreshing events
export const useRefreshEvents = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.events() });
  }, [queryClient]);
};