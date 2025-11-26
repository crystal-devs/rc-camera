// types/roles.ts - Unified Role System
/**
 * Standard user roles for Rose Click platform
 * This is the single source of truth for all role-related functionality
 */
export enum UserRole {
  /** Event creator - full permissions */
  CREATOR = 'creator',
  /** Co-host - elevated permissions, cannot delete event */
  CO_HOST = 'co_host',
  /** Guest - basic permissions based on event settings */
  GUEST = 'guest',
}

/**
 * Role hierarchy - higher number = more permissions
 * Used for permission inheritance and comparisons
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.CREATOR]: 3,
  [UserRole.CO_HOST]: 2,
  [UserRole.GUEST]: 1,
};

/**
 * Human-readable role labels for UI
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.CREATOR]: 'Event Creator',
  [UserRole.CO_HOST]: 'Co-Host',
  [UserRole.GUEST]: 'Guest',
};

/**
 * Role descriptions for tooltips and help text
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.CREATOR]: 'Full control over event settings, content, and participants. Can delete the event.',
  [UserRole.CO_HOST]: 'Can manage participants, moderate content, and handle event operations. Cannot delete the event or transfer ownership.',
  [UserRole.GUEST]: 'Can view and upload content based on event permissions. Limited management capabilities.',
};

/**
 * Type guard to check if a string is a valid UserRole
 */
export function isValidRole(role: unknown): role is UserRole {
  return (
    typeof role === 'string' &&
    Object.values(UserRole).includes(role as UserRole)
  );
}

/**
 * Parse a role string into UserRole enum, with fallback
 */
export function parseRole(role: unknown, fallback: UserRole = UserRole.GUEST): UserRole {
  if (isValidRole(role)) {
    return role;
  }
  
  // Handle legacy role mappings
  if (typeof role === 'string') {
    const normalized = role.toLowerCase();
    switch (normalized) {
      case 'owner':
      case 'admin':
        return UserRole.CREATOR;
      case 'moderator':
      case 'cohost':
      case 'co-host':
        return UserRole.CO_HOST;
      case 'viewer':
      case 'participant':
      case 'member':
        return UserRole.GUEST;
    }
  }
  
  return fallback;
}

/**
 * Check if a role has higher or equal privileges than another
 */
export function hasRolePrivilege(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Get the next higher role in hierarchy (for upgrades)
 */
export function getNextRole(currentRole: UserRole): UserRole | null {
  switch (currentRole) {
    case UserRole.GUEST:
      return UserRole.CO_HOST;
    case UserRole.CO_HOST:
      return UserRole.CREATOR;
    case UserRole.CREATOR:
      return null; // Already at the top
  }
}

/**
 * Get the next lower role in hierarchy (for downgrades)
 */
export function getPreviousRole(currentRole: UserRole): UserRole | null {
  switch (currentRole) {
    case UserRole.CREATOR:
      return UserRole.CO_HOST;
    case UserRole.CO_HOST:
      return UserRole.GUEST;
    case UserRole.GUEST:
      return null; // Already at the bottom
  }
}

/**
 * Role metadata for UI components
 */
export interface RoleMetadata {
  role: UserRole;
  label: string;
  description: string;
  hierarchy: number;
  color: string;
  icon: string;
}

/**
 * Get full metadata for a role
 */
export function getRoleMetadata(role: UserRole): RoleMetadata {
  const colors: Record<UserRole, string> = {
    [UserRole.CREATOR]: 'text-purple-600 bg-purple-50 border-purple-200',
    [UserRole.CO_HOST]: 'text-blue-600 bg-blue-50 border-blue-200',
    [UserRole.GUEST]: 'text-gray-600 bg-gray-50 border-gray-200',
  };

  const icons: Record<UserRole, string> = {
    [UserRole.CREATOR]: 'crown',
    [UserRole.CO_HOST]: 'shield',
    [UserRole.GUEST]: 'user',
  };

  return {
    role,
    label: ROLE_LABELS[role],
    description: ROLE_DESCRIPTIONS[role],
    hierarchy: ROLE_HIERARCHY[role],
    color: colors[role],
    icon: icons[role],
  };
}
