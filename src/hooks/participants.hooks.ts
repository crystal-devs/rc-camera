
// hooks/participants.hooks.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth';
import {
    getEventParticipants,
    getParticipantStats,
    inviteParticipants,
    updateParticipant,
    removeParticipant,
    type ParticipantFilters,
    type InviteParticipantRequest,
} from '@/services/apis/participants.api';
import { toast } from 'sonner';
import { useMemo } from 'react';

// Query keys
export const participantsKeys = {
    all: ['participants'] as const,
    byEvent: (eventId: string) => [...participantsKeys.all, eventId] as const,
    participants: (eventId: string, filters: ParticipantFilters) =>
        [...participantsKeys.byEvent(eventId), 'list', filters] as const,
    stats: (eventId: string) => [...participantsKeys.byEvent(eventId), 'stats'] as const,
};

/**
 * Hook to fetch event participants with filtering
 */
export const useEventParticipants = (eventId: string, filters: ParticipantFilters = {}) => {
    const authToken = useAuthToken();

    return useQuery({
        queryKey: participantsKeys.participants(eventId, filters),
        queryFn: () => {
            if (!authToken) throw new Error('Authentication required');
            return getEventParticipants(eventId, filters, authToken);
        },
        enabled: !!authToken && !!eventId,
        staleTime: 2 * 60 * 1000, // 2 minutes
        retry: 2,
    });
};

/**
 * Hook to fetch participant statistics
 */
export const useParticipantStats = (eventId: string) => {
    const authToken = useAuthToken();

    return useQuery({
        queryKey: participantsKeys.stats(eventId),
        queryFn: () => {
            if (!authToken) throw new Error('Authentication required');
            return getParticipantStats(eventId, authToken);
        },
        enabled: !!authToken && !!eventId,
        staleTime: 1 * 60 * 1000, // 1 minute
        retry: 2,
    });
};

/**
 * Hook for inviting participants
 */
export const useInviteParticipants = (eventId: string) => {
    const authToken = useAuthToken();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (invites: InviteParticipantRequest[]) => {
            if (!authToken) throw new Error('Authentication required');
            return inviteParticipants(eventId, invites, authToken);
        },
        onSuccess: (result, invites) => {
            // Invalidate participant queries to refetch fresh data
            queryClient.invalidateQueries({
                queryKey: participantsKeys.byEvent(eventId)
            });

            const successCount = result.invitedCount;
            const totalCount = invites.length;

            if (successCount === totalCount) {
                toast.success(`${successCount} participant${successCount > 1 ? 's' : ''} invited successfully!`);
            } else {
                toast.success(`${successCount} of ${totalCount} participants invited successfully.`);
                result.errors?.forEach(error => toast.error(error));
            }
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Failed to invite participants');
        },
    });
};

/**
 * Hook for updating a participant
 */
export const useUpdateParticipant = (eventId: string) => {
    const authToken = useAuthToken();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            participantId,
            updates
        }: {
            participantId: string;
            updates: Parameters<typeof updateParticipant>[2]
        }) => {
            if (!authToken) throw new Error('Authentication required');
            return updateParticipant(eventId, participantId, updates, authToken);
        },
        onSuccess: () => {
            // Invalidate queries to get fresh data
            queryClient.invalidateQueries({
                queryKey: participantsKeys.byEvent(eventId)
            });
            toast.success('Participant updated successfully');
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Failed to update participant');
        },
    });
};

/**
 * Hook for removing a participant
 */
export const useRemoveParticipant = (eventId: string) => {
    const authToken = useAuthToken();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (participantId: string) => {
            if (!authToken) throw new Error('Authentication required');
            return removeParticipant(eventId, participantId, authToken);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: participantsKeys.byEvent(eventId)
            });
            toast.success('Participant removed successfully');
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Failed to remove participant');
        },
    });
};

/**
 * Hook for bulk operations on participants
 */
export const useBulkParticipantOperations = (eventId: string) => {
    const authToken = useAuthToken();
    const queryClient = useQueryClient();

    const bulkRemove = useMutation({
        mutationFn: async (participantIds: string[]) => {
            if (!authToken) throw new Error('Authentication required');

            const results = await Promise.allSettled(
                participantIds.map(id => removeParticipant(eventId, id, authToken))
            );

            return results;
        },
        onSuccess: (results) => {
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const errorCount = results.filter(r => r.status === 'rejected').length;

            if (successCount > 0) {
                toast.success(`${successCount} participant${successCount > 1 ? 's' : ''} removed`);
            }
            if (errorCount > 0) {
                toast.error(`Failed to remove ${errorCount} participant${errorCount > 1 ? 's' : ''}`);
            }

            queryClient.invalidateQueries({
                queryKey: participantsKeys.byEvent(eventId)
            });
        },
        onError: () => {
            toast.error('Failed to remove participants');
        },
    });

    const bulkUpdateAccessType = useMutation({
        mutationFn: async ({
            participantIds,
            accessType
        }: {
            participantIds: string[];
            accessType: 'co_host' | 'viewer'
        }) => {
            if (!authToken) throw new Error('Authentication required');

            const results = await Promise.allSettled(
                participantIds.map(id =>
                    updateParticipant(eventId, id, { accessType }, authToken)
                )
            );

            return results;
        },
        onSuccess: (results, { accessType }) => {
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const errorCount = results.filter(r => r.status === 'rejected').length;

            if (successCount > 0) {
                const accessName = accessType === 'co_host' ? 'Co-host' : 'Viewer';
                toast.success(`${successCount} participant${successCount > 1 ? 's' : ''} updated to ${accessName}`);
            }
            if (errorCount > 0) {
                toast.error(`Failed to update ${errorCount} participant${errorCount > 1 ? 's' : ''}`);
            }

            queryClient.invalidateQueries({
                queryKey: participantsKeys.byEvent(eventId)
            });
        },
        onError: () => {
            toast.error('Failed to update participants');
        },
    });

    return {
        bulkRemove,
        bulkUpdateAccessType,
    };
};

/**
 * Hook to get filtered participants with client-side filtering
 * This is useful when you want to filter without refetching
 */
export const useFilteredParticipants = (
    eventId: string,
    serverFilters: ParticipantFilters = {},
    clientFilters: { search?: string; selectedOnly?: boolean } = {}
) => {
    const { data, ...queryResult } = useEventParticipants(eventId, serverFilters);

    const filteredParticipants = useMemo(() => {
        if (!data?.participants) return [];

        let filtered = [...data.participants];

        // Client-side search filter
        if (clientFilters.search) {
            const query = clientFilters.search.toLowerCase();
            filtered = filtered.filter(p =>
                (p.name && p.name.toLowerCase().includes(query)) ||
                (p.email && p.email.toLowerCase().includes(query))
            );
        }

        return filtered;
    }, [data?.participants, clientFilters.search]);

    return {
        participants: filteredParticipants,
        stats: data?.stats,
        totalCount: data?.totalCount || 0,
        currentPage: data?.currentPage || 1,
        totalPages: data?.totalPages || 0,
        ...queryResult,
    };
};