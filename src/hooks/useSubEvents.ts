// hooks/useSubEvents.ts - React Query hooks for event functions (sub-events)
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSubEvents,
  createSubEvent,
  updateSubEvent,
  deleteSubEvent,
  type SubEvent,
  type SubEventInput,
} from '@/services/apis/sub-events.api';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthToken } from '@/hooks/use-auth';

/**
 * Functions for an event, in timeline order. Server state — never mirror this
 * into the form/Zustand state, or the host chips and guest dividers drift apart.
 */
export const useSubEvents = (eventId?: string) => {
  const authToken = useAuthToken();
  const enabled = !!eventId && !!authToken;

  const query = useQuery({
    queryKey: queryKeys.subEvents(eventId ?? 'none'),
    queryFn: () => getSubEvents(eventId as string, authToken as string),
    enabled,
    staleTime: 60_000,
  });

  return {
    subEvents: query.data ?? [],
    // Stay loading while the auth token hydrates, so callers can't read an
    // empty list as "this event has no functions".
    isLoading: !!eventId && (!authToken || query.isPending),
    error: query.error,
  };
};

/** Invalidate functions + the event payloads that embed them. */
const useInvalidateSubEvents = () => {
  const queryClient = useQueryClient();
  return (eventId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.subEvents(eventId) });
    // The event detail payload embeds sub_events too.
    queryClient.invalidateQueries({ queryKey: queryKeys.event(eventId) });
  };
};

export const useCreateSubEvent = (eventId: string) => {
  const authToken = useAuthToken();
  const invalidate = useInvalidateSubEvents();

  return useMutation({
    mutationFn: (input: SubEventInput) => createSubEvent(eventId, input, authToken || ''),
    onSuccess: () => invalidate(eventId),
  });
};

export const useUpdateSubEvent = (eventId: string) => {
  const authToken = useAuthToken();
  const invalidate = useInvalidateSubEvents();

  return useMutation({
    mutationFn: ({ subEventId, input }: { subEventId: string; input: SubEventInput }) =>
      updateSubEvent(eventId, subEventId, input, authToken || ''),
    onSuccess: () => invalidate(eventId),
  });
};

export const useDeleteSubEvent = (eventId: string) => {
  const authToken = useAuthToken();
  const invalidate = useInvalidateSubEvents();

  return useMutation({
    mutationFn: (subEventId: string) => deleteSubEvent(eventId, subEventId, authToken || ''),
    onSuccess: () => invalidate(eventId),
  });
};

export type { SubEvent };
