// constants/permissions.ts - Permission Matrix & Constants
import { UserRole } from '@/types/roles';

/**
 * All possible permission actions in the system
 * Each action represents a specific capability
 */
export enum PermissionAction {
    // View permissions
    VIEW_EVENT = 'view_event',
    VIEW_MEDIA = 'view_media',
    VIEW_PARTICIPANTS = 'view_participants',
    VIEW_ANALYTICS = 'view_analytics',

    // Upload permissions
    UPLOAD_MEDIA = 'upload_media',
    UPLOAD_TO_QUEUE = 'upload_to_queue',

    // Download permissions
    DOWNLOAD_MEDIA = 'download_media',
    BULK_DOWNLOAD = 'bulk_download',

    // Content moderation
    APPROVE_MEDIA = 'approve_media',
    REJECT_MEDIA = 'reject_media',
    DELETE_MEDIA = 'delete_media',
    HIDE_MEDIA = 'hide_media',
    MODERATE_CONTENT = 'moderate_content',

    // Participant management
    INVITE_PARTICIPANTS = 'invite_participants',
    REMOVE_PARTICIPANTS = 'remove_participants',
    UPDATE_PARTICIPANT_ROLE = 'update_participant_role',
    UPDATE_PARTICIPANT_PERMISSIONS = 'update_participant_permissions',

    // Event management
    EDIT_EVENT = 'edit_event',
    DELETE_EVENT = 'delete_event',
    MANAGE_EVENT_SETTINGS = 'manage_event_settings',
    TRANSFER_OWNERSHIP = 'transfer_ownership',

    // Sharing & links
    CREATE_SHARE_LINK = 'create_share_link',
    REVOKE_SHARE_LINK = 'revoke_share_link',
    MANAGE_SHARE_SETTINGS = 'manage_share_settings',

    // Albums
    CREATE_ALBUM = 'create_album',
    DELETE_ALBUM = 'delete_album',
    EDIT_ALBUM = 'edit_album',

    // Export & analytics
    EXPORT_DATA = 'export_data',
    VIEW_LOGS = 'view_logs',

    // Advanced features
    MANAGE_COHOSTS = 'manage_cohosts',
    VIEW_PRIVATE_INFO = 'view_private_info',
}

/**
 * Permission groups for easier management
 */
export const PERMISSION_GROUPS = {
    VIEW: [
        PermissionAction.VIEW_EVENT,
        PermissionAction.VIEW_MEDIA,
    ],
    UPLOAD: [
        PermissionAction.UPLOAD_MEDIA,
        PermissionAction.UPLOAD_TO_QUEUE,
    ],
    MODERATION: [
        PermissionAction.APPROVE_MEDIA,
        PermissionAction.REJECT_MEDIA,
        PermissionAction.DELETE_MEDIA,
        PermissionAction.HIDE_MEDIA,
        PermissionAction.MODERATE_CONTENT,
    ],
    PARTICIPANT_MANAGEMENT: [
        PermissionAction.INVITE_PARTICIPANTS,
        PermissionAction.REMOVE_PARTICIPANTS,
        PermissionAction.UPDATE_PARTICIPANT_ROLE,
        PermissionAction.UPDATE_PARTICIPANT_PERMISSIONS,
    ],
    EVENT_MANAGEMENT: [
        PermissionAction.EDIT_EVENT,
        PermissionAction.MANAGE_EVENT_SETTINGS,
        PermissionAction.DELETE_EVENT,
        PermissionAction.TRANSFER_OWNERSHIP,
    ],
    ADMIN: [
        PermissionAction.MANAGE_COHOSTS,
        PermissionAction.VIEW_LOGS,
        PermissionAction.VIEW_PRIVATE_INFO,
        PermissionAction.EXPORT_DATA,
    ],
} as const;

/**
 * Permission record type - map of all actions to boolean
 */
export type PermissionRecord = Record<PermissionAction, boolean>;

/**
 * Role-based default permissions
 * This is the source of truth for what each role can do by default
 */
export const ROLE_PERMISSIONS: Record<UserRole, PermissionRecord> = {
    [UserRole.CREATOR]: {
        // View - full access
        [PermissionAction.VIEW_EVENT]: true,
        [PermissionAction.VIEW_MEDIA]: true,
        [PermissionAction.VIEW_PARTICIPANTS]: true,
        [PermissionAction.VIEW_ANALYTICS]: true,

        // Upload - full access
        [PermissionAction.UPLOAD_MEDIA]: true,
        [PermissionAction.UPLOAD_TO_QUEUE]: true,

        // Download - full access
        [PermissionAction.DOWNLOAD_MEDIA]: true,
        [PermissionAction.BULK_DOWNLOAD]: true,

        // Moderation - full access
        [PermissionAction.APPROVE_MEDIA]: true,
        [PermissionAction.REJECT_MEDIA]: true,
        [PermissionAction.DELETE_MEDIA]: true,
        [PermissionAction.HIDE_MEDIA]: true,
        [PermissionAction.MODERATE_CONTENT]: true,

        // Participants - full access
        [PermissionAction.INVITE_PARTICIPANTS]: true,
        [PermissionAction.REMOVE_PARTICIPANTS]: true,
        [PermissionAction.UPDATE_PARTICIPANT_ROLE]: true,
        [PermissionAction.UPDATE_PARTICIPANT_PERMISSIONS]: true,

        // Event - full access
        [PermissionAction.EDIT_EVENT]: true,
        [PermissionAction.DELETE_EVENT]: true,
        [PermissionAction.MANAGE_EVENT_SETTINGS]: true,
        [PermissionAction.TRANSFER_OWNERSHIP]: true,

        // Sharing - full access
        [PermissionAction.CREATE_SHARE_LINK]: true,
        [PermissionAction.REVOKE_SHARE_LINK]: true,
        [PermissionAction.MANAGE_SHARE_SETTINGS]: true,

        // Albums - full access
        [PermissionAction.CREATE_ALBUM]: true,
        [PermissionAction.DELETE_ALBUM]: true,
        [PermissionAction.EDIT_ALBUM]: true,

        // Export - full access
        [PermissionAction.EXPORT_DATA]: true,
        [PermissionAction.VIEW_LOGS]: true,

        // Advanced - full access
        [PermissionAction.MANAGE_COHOSTS]: true,
        [PermissionAction.VIEW_PRIVATE_INFO]: true,
    },

    [UserRole.CO_HOST]: {
        // View - full access
        [PermissionAction.VIEW_EVENT]: true,
        [PermissionAction.VIEW_MEDIA]: true,
        [PermissionAction.VIEW_PARTICIPANTS]: true,
        [PermissionAction.VIEW_ANALYTICS]: true,

        // Upload - full access
        [PermissionAction.UPLOAD_MEDIA]: true,
        [PermissionAction.UPLOAD_TO_QUEUE]: true,

        // Download - full access
        [PermissionAction.DOWNLOAD_MEDIA]: true,
        [PermissionAction.BULK_DOWNLOAD]: true,

        // Moderation - full access
        [PermissionAction.APPROVE_MEDIA]: true,
        [PermissionAction.REJECT_MEDIA]: true,
        [PermissionAction.DELETE_MEDIA]: true,
        [PermissionAction.HIDE_MEDIA]: true,
        [PermissionAction.MODERATE_CONTENT]: true,

        // Participants - can invite but not remove or change roles
        [PermissionAction.INVITE_PARTICIPANTS]: true,
        [PermissionAction.REMOVE_PARTICIPANTS]: false,
        [PermissionAction.UPDATE_PARTICIPANT_ROLE]: false,
        [PermissionAction.UPDATE_PARTICIPANT_PERMISSIONS]: false,

        // Event - can edit settings but not delete or transfer
        [PermissionAction.EDIT_EVENT]: true,
        [PermissionAction.DELETE_EVENT]: false,
        [PermissionAction.MANAGE_EVENT_SETTINGS]: true,
        [PermissionAction.TRANSFER_OWNERSHIP]: false,

        // Sharing - full access
        [PermissionAction.CREATE_SHARE_LINK]: true,
        [PermissionAction.REVOKE_SHARE_LINK]: true,
        [PermissionAction.MANAGE_SHARE_SETTINGS]: true,

        // Albums - full access
        [PermissionAction.CREATE_ALBUM]: true,
        [PermissionAction.DELETE_ALBUM]: true,
        [PermissionAction.EDIT_ALBUM]: true,

        // Export - limited
        [PermissionAction.EXPORT_DATA]: true,
        [PermissionAction.VIEW_LOGS]: false,

        // Advanced - no access
        [PermissionAction.MANAGE_COHOSTS]: false,
        [PermissionAction.VIEW_PRIVATE_INFO]: false,
    },

    [UserRole.GUEST]: {
        // View - basic access
        [PermissionAction.VIEW_EVENT]: true,
        [PermissionAction.VIEW_MEDIA]: true,
        [PermissionAction.VIEW_PARTICIPANTS]: false,
        [PermissionAction.VIEW_ANALYTICS]: false,

        // Upload - based on event settings (defaults to true, can be overridden)
        [PermissionAction.UPLOAD_MEDIA]: true,
        [PermissionAction.UPLOAD_TO_QUEUE]: true,

        // Download - based on event settings (defaults to false)
        [PermissionAction.DOWNLOAD_MEDIA]: false,
        [PermissionAction.BULK_DOWNLOAD]: false,

        // Moderation - no access
        [PermissionAction.APPROVE_MEDIA]: false,
        [PermissionAction.REJECT_MEDIA]: false,
        [PermissionAction.DELETE_MEDIA]: false,
        [PermissionAction.HIDE_MEDIA]: false,
        [PermissionAction.MODERATE_CONTENT]: false,

        // Participants - no access
        [PermissionAction.INVITE_PARTICIPANTS]: false,
        [PermissionAction.REMOVE_PARTICIPANTS]: false,
        [PermissionAction.UPDATE_PARTICIPANT_ROLE]: false,
        [PermissionAction.UPDATE_PARTICIPANT_PERMISSIONS]: false,

        // Event - no access
        [PermissionAction.EDIT_EVENT]: false,
        [PermissionAction.DELETE_EVENT]: false,
        [PermissionAction.MANAGE_EVENT_SETTINGS]: false,
        [PermissionAction.TRANSFER_OWNERSHIP]: false,

        // Sharing - no access
        [PermissionAction.CREATE_SHARE_LINK]: false,
        [PermissionAction.REVOKE_SHARE_LINK]: false,
        [PermissionAction.MANAGE_SHARE_SETTINGS]: false,

        // Albums - no access
        [PermissionAction.CREATE_ALBUM]: false,
        [PermissionAction.DELETE_ALBUM]: false,
        [PermissionAction.EDIT_ALBUM]: false,

        // Export - no access
        [PermissionAction.EXPORT_DATA]: false,
        [PermissionAction.VIEW_LOGS]: false,

        // Advanced - no access
        [PermissionAction.MANAGE_COHOSTS]: false,
        [PermissionAction.VIEW_PRIVATE_INFO]: false,
    },
};

/**
 * Guest permission overrides based on event settings
 * These are the permissions that can be customized per event for guests
 */
export const GUEST_CUSTOMIZABLE_PERMISSIONS: PermissionAction[] = [
    PermissionAction.UPLOAD_MEDIA,
    PermissionAction.UPLOAD_TO_QUEUE,
    PermissionAction.DOWNLOAD_MEDIA,
    PermissionAction.CREATE_ALBUM,
];

/**
 * Permission inheritance rules
 * Higher roles inherit all permissions from lower roles
 */
export function inheritPermissions(
    baseRole: UserRole,
    customPermissions?: Partial<PermissionRecord>
): PermissionRecord {
    const roleDefaults = { ...ROLE_PERMISSIONS[baseRole] };

    if (!customPermissions) {
        return roleDefaults;
    }

    // For guests, allow customization of specific permissions
    if (baseRole === UserRole.GUEST) {
        GUEST_CUSTOMIZABLE_PERMISSIONS.forEach((action) => {
            if (customPermissions[action] !== undefined) {
                roleDefaults[action] = customPermissions[action];
            }
        });
    }

    // For higher roles, custom permissions can only restrict, not expand
    if (baseRole === UserRole.CO_HOST || baseRole === UserRole.CREATOR) {
        Object.entries(customPermissions).forEach(([action, value]) => {
            const permAction = action as PermissionAction;
            // Can only set to false, cannot grant new permissions
            if (value === false && roleDefaults[permAction]) {
                roleDefaults[permAction] = false;
            }
        });
    }

    return roleDefaults;
}

/**
 * Get user-friendly permission labels
 */
export const PERMISSION_LABELS: Record<PermissionAction, string> = {
    [PermissionAction.VIEW_EVENT]: 'View Event',
    [PermissionAction.VIEW_MEDIA]: 'View Media',
    [PermissionAction.VIEW_PARTICIPANTS]: 'View Participants',
    [PermissionAction.VIEW_ANALYTICS]: 'View Analytics',
    [PermissionAction.UPLOAD_MEDIA]: 'Upload Media',
    [PermissionAction.UPLOAD_TO_QUEUE]: 'Upload to Queue',
    [PermissionAction.DOWNLOAD_MEDIA]: 'Download Media',
    [PermissionAction.BULK_DOWNLOAD]: 'Bulk Download',
    [PermissionAction.APPROVE_MEDIA]: 'Approve Media',
    [PermissionAction.REJECT_MEDIA]: 'Reject Media',
    [PermissionAction.DELETE_MEDIA]: 'Delete Media',
    [PermissionAction.HIDE_MEDIA]: 'Hide Media',
    [PermissionAction.MODERATE_CONTENT]: 'Moderate Content',
    [PermissionAction.INVITE_PARTICIPANTS]: 'Invite Participants',
    [PermissionAction.REMOVE_PARTICIPANTS]: 'Remove Participants',
    [PermissionAction.UPDATE_PARTICIPANT_ROLE]: 'Update Participant Role',
    [PermissionAction.UPDATE_PARTICIPANT_PERMISSIONS]: 'Update Participant Permissions',
    [PermissionAction.EDIT_EVENT]: 'Edit Event',
    [PermissionAction.DELETE_EVENT]: 'Delete Event',
    [PermissionAction.MANAGE_EVENT_SETTINGS]: 'Manage Event Settings',
    [PermissionAction.TRANSFER_OWNERSHIP]: 'Transfer Ownership',
    [PermissionAction.CREATE_SHARE_LINK]: 'Create Share Link',
    [PermissionAction.REVOKE_SHARE_LINK]: 'Revoke Share Link',
    [PermissionAction.MANAGE_SHARE_SETTINGS]: 'Manage sharing Settings',
    [PermissionAction.CREATE_ALBUM]: 'Create Album',
    [PermissionAction.DELETE_ALBUM]: 'Delete Album',
    [PermissionAction.EDIT_ALBUM]: 'Edit Album',
    [PermissionAction.EXPORT_DATA]: 'Export Data',
    [PermissionAction.VIEW_LOGS]: 'View Logs',
    [PermissionAction.MANAGE_COHOSTS]: 'Manage Co-hosts',
    [PermissionAction.VIEW_PRIVATE_INFO]: 'View Private Information',
};
