// hooks/useEventRole.ts
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import useEventStore from '@/stores/useEventStore'
import { getMyAccess } from '@/services/apis/events.api'
import { queryKeys } from '@/lib/queryKeys'
import { useAuthToken } from '@/hooks/use-auth'
import { UserRole, parseRole, hasRolePrivilege } from '@/types/roles'

/**
 * The current account's role in an event, resolved from the server's
 * `my-access` endpoint — the same policy the API enforces (docs/RBAC_DESIGN.md).
 *
 * This is a server-state hook (React Query), not a read of client state: it no
 * longer trusts the persisted `user_role` on the event store, which survived
 * account/event switches in localStorage and went stale, letting guests open
 * host-only screens. It is provider-independent (safe outside PermissionProvider,
 * e.g. the global sidebar); inside an event route, PermissionProvider remains
 * the authoritative gate and this hook agrees with it because both read
 * `my-access`.
 *
 * @param eventId The event to resolve access for. Defaults to the currently
 *                selected event, so a stale selection can never grant access to
 *                a different event's screens.
 */
export function useEventRole(eventId?: string) {
    const { selectedEvent } = useEventStore()
    const token = useAuthToken()

    const targetEventId = eventId ?? selectedEvent?._id ?? null
    const enabled = !!targetEventId && !!token

    const { data, isPending } = useQuery({
        queryKey: queryKeys.eventAccess(targetEventId ?? 'none'),
        queryFn: () => getMyAccess(targetEventId as string, token as string),
        enabled,
        // Role rarely changes mid-session; PermissionProvider refetches on the
        // `permission_updated` socket event, and React Query dedupes callers.
        staleTime: 60_000,
    })

    return useMemo(() => {
        const role = data ? parseRole(data.role) : null

        return {
            /** Role in this event, or null while access hasn't resolved yet */
            role,
            // Loading until access resolves for a target event. Crucially this
            // stays true while the auth token is still hydrating (token null →
            // the query is disabled) so a guard like `!isLoading && !canManage`
            // can't eject a legitimate host on a hard refresh before auth loads.
            isLoading: !!targetEventId && (!token || isPending),
            isCreator: role === UserRole.CREATOR,
            isCoHost: role === UserRole.CO_HOST,
            /** Creator or co-host — may open management screens (settings, guests…) */
            canManageEvent: role !== null && hasRolePrivilege(role, UserRole.CO_HOST),
        }
    }, [data, targetEventId, token, isPending])
}
