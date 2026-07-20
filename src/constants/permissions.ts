// constants/permissions.ts - Permission action vocabulary
//
// EXACT mirror of rc-api/src/configs/permissions.policy.ts — keep the two in
// sync. The client deliberately has NO role→permission matrix: the server's
// GET /event/:id/my-access response is the single source of truth for what
// the current user may do (see docs/RBAC_DESIGN.md). The client only names
// the actions so checks are typo-safe.

export const ACTIONS = [
    // Event lifecycle
    'event.view',
    'event.update',          // edit details + full settings screen
    'event.archive',         // close/reopen for guests — creator only
    'event.delete',          // creator only
    'event.transfer',        // creator only

    // Media
    'media.view',
    'media.upload',
    'media.download',
    'media.approve',         // moderation queue approve/reject
    'media.delete',
    'media.hide',

    // Participants
    'participants.view',     // see who joined (guest-safe: names/avatars only)
    'participants.manage',   // host management surface: full list, activity, stats, sessions
    'participants.invite',
    'participants.remove',   // remove/block guests, revoke guest sessions
    'participants.update',   // status/permission records of guests
    'cohost.invite',         // share or manage the co-host invite link
    'cohost.manage',         // approve/reject/remove/block co-hosts — creator only

    // Content organisation
    'album.manage',          // create/edit/delete albums

    // Sharing & display
    'share.manage',          // share link, PIN, photo wall settings

    // Insights
    'analytics.view',
    'data.export',
] as const;

export type PermissionAction = (typeof ACTIONS)[number];

/** Map form kept for compatibility with older call sites. */
export type PermissionRecord = Record<PermissionAction, boolean>;

export function isPermissionAction(value: string): value is PermissionAction {
    return (ACTIONS as readonly string[]).includes(value);
}

/** Human-readable labels for error messages and tooltips. */
export const PERMISSION_LABELS: Record<PermissionAction, string> = {
    'event.view': 'view this event',
    'event.update': 'edit event settings',
    'event.archive': 'close or reopen the event',
    'event.delete': 'delete the event',
    'event.transfer': 'transfer event ownership',
    'media.view': 'view photos',
    'media.upload': 'upload photos',
    'media.download': 'download photos',
    'media.approve': 'moderate photos',
    'media.delete': 'delete photos',
    'media.hide': 'hide photos',
    'participants.view': 'see the guest list',
    'participants.manage': 'manage participants',
    'participants.invite': 'invite guests',
    'participants.remove': 'remove guests',
    'participants.update': 'update guests',
    'cohost.invite': 'invite co-hosts',
    'cohost.manage': 'manage co-hosts',
    'album.manage': 'manage albums',
    'share.manage': 'manage sharing settings',
    'analytics.view': 'view analytics',
    'data.export': 'export data',
};
