// app/events/[eventId]/layout.tsx
'use client';

import { ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { PermissionProvider } from '@/lib/permissions/PermissionContext';

/**
 * Wraps every host-side event page with the permission context, which loads
 * the server-computed role + permission set from GET /event/:id/my-access.
 * Pages and components below can use usePermissionCheck / PermissionGuard /
 * RoleGuard without wiring anything themselves.
 */
export default function EventLayout({ children }: { children: ReactNode }) {
    const params = useParams();
    const eventId = params.eventId as string;

    return (
        <PermissionProvider eventId={eventId}>
            {children}
        </PermissionProvider>
    );
}
