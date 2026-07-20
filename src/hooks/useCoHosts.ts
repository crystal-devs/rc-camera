// hooks/useCoHosts.ts - React Query hooks for co-host list + per-function scope
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEventCoHosts, setCoHostScope, type CoHost } from '@/services/apis/cohost.api';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthToken } from '@/hooks/use-auth';

/** Co-hosts for an event, including each one's per-function scope. */
export const useCoHosts = (eventId?: string) => {
  const authToken = useAuthToken();
  const enabled = !!eventId && !!authToken;

  const query = useQuery({
    queryKey: queryKeys.coHosts(eventId ?? 'none'),
    queryFn: () => getEventCoHosts(eventId as string, authToken as string),
    enabled,
    staleTime: 30_000,
  });

  return {
    coHosts: (query.data?.data?.co_hosts ?? []) as CoHost[],
    isLoading: !!eventId && (!authToken || query.isPending),
    error: query.error,
  };
};

/** Set (or clear) a co-host's per-function scope. */
export const useSetCoHostScope = (eventId: string) => {
  const authToken = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, subEventIds }: { userId: string; subEventIds: string[] }) =>
      setCoHostScope(eventId, userId, subEventIds, authToken || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coHosts(eventId) });
    },
  });
};
