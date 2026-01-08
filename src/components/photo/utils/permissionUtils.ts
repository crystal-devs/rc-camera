/**
 * Permission utility functions for PhotoGallery
 * Centralizes permission checking logic
 */

export interface UserPermissions {
    upload: boolean;
    download: boolean;
    moderate: boolean;
    delete: boolean;
}

export type UserRole = 'creator' | 'co_host' | 'participant' | 'guest';

/**
 * Determines if a user is a guest based on their role
 */
export function isGuestUser(userRole?: UserRole | string): boolean {
    return userRole !== 'creator' && userRole !== 'co_host';
}

/**
 * Gets effective permissions based on user role and base permissions
 * Guests have restricted permissions regardless of base permissions
 */
export function getEffectivePermissions(
    userRole: UserRole | string | undefined,
    basePermissions: UserPermissions
): UserPermissions {
    const isGuest = isGuestUser(userRole);

    return {
        upload: isGuest ? false : basePermissions.upload,
        download: basePermissions.download,
        moderate: isGuest ? false : basePermissions.moderate,
        delete: isGuest ? false : basePermissions.delete,
    };
}

/**
 * Checks if user can upload based on permissions and upload flag
 */
export function canUserUpload(
    permissions: UserPermissions,
    canUpload: boolean
): boolean {
    return canUpload && permissions.upload;
}

/**
 * Validates if user has permission for a specific action
 */
export function hasPermission(
    permissions: UserPermissions,
    action: keyof UserPermissions
): boolean {
    return permissions[action] === true;
}
