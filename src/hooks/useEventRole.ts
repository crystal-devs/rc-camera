// hooks/useEventRole.ts
import { useMemo } from 'react'

import useEventStore from '@/stores/useEventStore'
import { UserRole, parseRole, hasRolePrivilege } from '@/types/roles'

/**
 * The current account's role in the loaded event, derived from the
 * server-computed `user_role` on the fetched event document.
 *
 * This is the single client-side source of truth for role-based UI decisions
 * (nav visibility, route guards, creator-only actions). Never read the
 * persisted `userRole` from the event store for access checks — it survives
 * account and event switches in localStorage and goes stale, which let guests
 * open host-only screens.
 *
 * @param eventId When provided, the role is only reported if the loaded event
 *                matches this id (use in `/events/[eventId]/…` routes so a
 *                stale selection for another event can't grant access).
 */
export function useEventRole(eventId?: string) {
    const { selectedEvent } = useEventStore()

    return useMemo(() => {
        const matchesEvent = !!selectedEvent && (!eventId || selectedEvent._id === eventId)
        const role = matchesEvent ? parseRole(selectedEvent.user_role) : null

        return {
            /** Role in this event, or null while the event hasn't loaded yet */
            role,
            /** True until the (matching) event has been loaded into the store */
            isLoading: !matchesEvent,
            isCreator: role === UserRole.CREATOR,
            isCoHost: role === UserRole.CO_HOST,
            /** Creator or co-host — may open management screens (settings, guests…) */
            canManageEvent: role !== null && hasRolePrivilege(role, UserRole.CO_HOST),
        }
    }, [selectedEvent, eventId])
}
