// lib/permissions/PermissionManager.ts - Core Permission Management System
import { UserRole, hasRolePrivilege } from '@/types/roles';
import {
    PermissionAction,
    PermissionRecord,
    ROLE_PERMISSIONS,
    inheritPermissions,
    GUEST_CUSTOMIZABLE_PERMISSIONS,
} from '@/constants/permissions';
import { PermissionError, PermissionErrorCode } from '@/lib/errors/PermissionError';
import { logger } from '@/lib/logger/Logger';

/**
 * Permission cache entry
 */
interface PermissionCacheEntry {
    permissions: PermissionRecord;
    timestamp: number;
    ttl: number;
}

/**
 * Permission manager configuration
 */
export interface PermissionManagerConfig {
    /** Cache TTL in milliseconds (default: 5 minutes) */
    cacheTTL?: number;
    /** Enable permission caching */
    enableCache?: boolean;
    /** Strict mode - throw errors on permission denial */
    strictMode?: boolean;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
    allowed: boolean;
    reason?: string;
}

/**
 * Core Permission Manager Class
 * Handles all permission checking and enforcement logic
 */
export class PermissionManager {
    private role: UserRole;
    private customPermissions?: Partial<PermissionRecord>;
    private permissions: PermissionRecord;
    private config: Required<PermissionManagerConfig>;
    private static cache = new Map<string, PermissionCacheEntry>();

    constructor(
        role: UserRole,
        customPermissions?: Partial<PermissionRecord>,
        config: PermissionManagerConfig = {}
    ) {
        this.role = role;
        this.customPermissions = customPermissions;
        this.config = {
            cacheTTL: config.cacheTTL || 5 * 60 * 1000, // 5 minutes
            enableCache: config.enableCache !== false,
            strictMode: config.strictMode || false,
        };

        // Calculate final permissions
        this.permissions = this.calculatePermissions();

        logger.debug('PermissionManager initialized', {
            role,
            hasCustomPermissions: !!customPermissions,
            permissionCount: Object.keys(this.permissions).length,
        });
    }

    /**
     * Calculate final permissions based on role and custom overrides
     */
    private calculatePermissions(): PermissionRecord {
        const cacheKey = this.getCacheKey();

        // Check cache first
        if (this.config.enableCache) {
            const cached = PermissionManager.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < cached.ttl) {
                logger.debug('Using cached permissions', { role: this.role });
                return cached.permissions;
            }
        }

        // Calculate permissions
        const permissions = inheritPermissions(this.role, this.customPermissions);

        // Cache the result
        if (this.config.enableCache) {
            PermissionManager.cache.set(cacheKey, {
                permissions,
                timestamp: Date.now(),
                ttl: this.config.cacheTTL,
            });
        }

        return permissions;
    }

    /**
     * Generate cache key
     */
    private getCacheKey(): string {
        const customStr = this.customPermissions
            ? JSON.stringify(this.customPermissions)
            : 'none';
        return `${this.role}:${customStr}`;
    }

    /**
     * Check if user has a specific permission
     */
    can(action: PermissionAction): boolean {
        const allowed = this.permissions[action] === true;

        logger.debug('Permission check', {
            action,
            role: this.role,
            allowed,
        });

        return allowed;
    }

    /**
     * Check if user can perform action, with detailed result
     */
    check(action: PermissionAction): PermissionCheckResult {
        const allowed = this.can(action);

        if (!allowed) {
            return {
                allowed: false,
                reason: `Role "${this.role}" does not have permission for action "${action}"`,
            };
        }

        return { allowed: true };
    }

    /**
     * Enforce permission - throws error if not allowed
     */
    enforce(action: PermissionAction): void {
        if (!this.can(action)) {
            logger.warn('Permission enforcement failed', {
                action,
                role: this.role,
            });

            throw PermissionError.denied(action, {
                userRole: this.role,
                action,
            });
        }
    }

    /**
     * Check multiple permissions at once (AND logic)
     */
    canAll(...actions: PermissionAction[]): boolean {
        return actions.every((action) => this.can(action));
    }

    /**
     * Check if user has at least one of the permissions (OR logic)
     */
    canAny(...actions: PermissionAction[]): boolean {
        return actions.some((action) => this.can(action));
    }

    /**
     * Enforce multiple permissions (AND logic)
     */
    enforceAll(...actions: PermissionAction[]): void {
        const deniedActions = actions.filter((action) => !this.can(action));

        if (deniedActions.length > 0) {
            logger.warn('Multiple permission enforcement failed', {
                deniedActions,
                role: this.role,
            });

            throw PermissionError.denied(deniedActions[0], {
                userRole: this.role,
                action: deniedActions[0],
                additionalInfo: {
                    allRequired: actions,
                    denied: deniedActions,
                },
            });
        }
    }

    /**
     * Check if user has minimum role level
     */
    hasMinimumRole(minimumRole: UserRole): boolean {
        return hasRolePrivilege(this.role, minimumRole);
    }

    /**
     * Get all allowed actions
     */
    getAllowedActions(): PermissionAction[] {
        return (Object.entries(this.permissions)
            .filter(([_, allowed]) => allowed)
            .map(([action]) => action) as PermissionAction[]);
    }

    /**
     * Get all denied actions
     */
    getDeniedActions(): PermissionAction[] {
        return (Object.entries(this.permissions)
            .filter(([_, allowed]) => !allowed)
            .map(([action]) => action) as PermissionAction[]);
    }

    /**
     * Get permission record (read-only)
     */
    getPermissions(): Readonly<PermissionRecord> {
        return Object.freeze({ ...this.permissions });
    }

    /**
     * Get user role
     */
    getRole(): UserRole {
        return this.role;
    }

    /**
     * Check if permissions have been customized
     */
    hasCustomPermissions(): boolean {
        return !!this.customPermissions && Object.keys(this.customPermissions).length > 0;
    }

    /**
     * Update permissions (creates new instance for immutability)
     */
    withCustomPermissions(customPermissions: Partial<PermissionRecord>): PermissionManager {
        // Validate custom permissions to prevent escalation
        this.validateCustomPermissions(customPermissions);

        return new PermissionManager(
            this.role,
            { ...this.customPermissions, ...customPermissions },
            this.config
        );
    }

    /**
     * Validate custom permissions to prevent role escalation
     */
    private validateCustomPermissions(customPermissions: Partial<PermissionRecord>): void {
        const basePermissions = ROLE_PERMISSIONS[this.role];

        for (const [action, value] of Object.entries(customPermissions)) {
            const permAction = action as PermissionAction;

            // For guests, only allow customization of specific permissions
            if (this.role === UserRole.GUEST) {
                if (!GUEST_CUSTOMIZABLE_PERMISSIONS.includes(permAction)) {
                    throw PermissionError.eventRestriction(
                        `Guest permissions cannot be customized for action: ${action}`,
                        { action: permAction, userRole: this.role }
                    );
                }
            } else {
                // For other roles, only allow restricting permissions, not granting
                if (value === true && basePermissions[permAction] === false) {
                    throw PermissionError.eventRestriction(
                        `Cannot grant permission not available in base role: ${action}`,
                        { action: permAction, userRole: this.role }
                    );
                }
            }
        }
    }

    /**
     * Create a permission manager with different role
     */
    withRole(newRole: UserRole): PermissionManager {
        return new PermissionManager(
            newRole,
            this.customPermissions,
            this.config
        );
    }

    /**
     * Clear cache for this user
     */
    clearCache(): void {
        const cacheKey = this.getCacheKey();
        PermissionManager.cache.delete(cacheKey);
        logger.debug('Permission cache cleared', { role: this.role });
    }

    /**
     * Clear all permission cache (static method)
     */
    static clearAllCache(): void {
        PermissionManager.cache.clear();
        logger.info('All permission caches cleared');
    }

    /**
     * Get cache statistics (for debugging)
     */
    static getCacheStats() {
        return {
            size: PermissionManager.cache.size,
            entries: Array.from(PermissionManager.cache.entries()).map(([key, value]) => ({
                key,
                age: Date.now() - value.timestamp,
                ttl: value.ttl,
            })),
        };
    }

    /**
     * Create permission manager from API response
     */
    static fromAPI(data: {
        role: string;
        permissions?: Partial<Record<string, boolean>>;
    }, config?: PermissionManagerConfig): PermissionManager {
        // Parse role from API (handles legacy roles)
        const { parseRole } = require('@/types/roles');
        const role = parseRole(data.role);

        // Convert API permissions to PermissionRecord
        const customPermissions: Partial<PermissionRecord> = {};
        if (data.permissions) {
            Object.entries(data.permissions).forEach(([key, value]) => {
                if (Object.values(PermissionAction).includes(key as PermissionAction)) {
                    customPermissions[key as PermissionAction] = value;
                }
            });
        }

        return new PermissionManager(role, customPermissions, config);
    }

    /**
     * Serialize to JSON (for storage/transfer)
     */
    toJSON() {
        return {
            role: this.role,
            customPermissions: this.customPermissions,
            permissions: this.permissions,
        };
    }

    /**
     * Create from JSON
     */
    static fromJSON(data: ReturnType<PermissionManager['toJSON']>, config?: PermissionManagerConfig): PermissionManager {
        return new PermissionManager(data.role, data.customPermissions, config);
    }
}

/**
 * Factory function for creating permission managers
 */
export function createPermissionManager(
    role: UserRole,
    customPermissions?: Partial<PermissionRecord>,
    config?: PermissionManagerConfig
): PermissionManager {
    return new PermissionManager(role, customPermissions, config);
}

/**
 * Create default guest permission manager
 */
export function createGuestPermissionManager(
    eventPermissions?: {
        allowUpload?: boolean;
        allowDownload?: boolean;
        allowAlbumCreation?: boolean;
    }
): PermissionManager {
    const customPermissions: Partial<PermissionRecord> = {};

    if (eventPermissions) {
        if (eventPermissions.allowUpload !== undefined) {
            customPermissions[PermissionAction.UPLOAD_MEDIA] = eventPermissions.allowUpload;
            customPermissions[PermissionAction.UPLOAD_TO_QUEUE] = eventPermissions.allowUpload;
        }
        if (eventPermissions.allowDownload !== undefined) {
            customPermissions[PermissionAction.DOWNLOAD_MEDIA] = eventPermissions.allowDownload;
        }
        if (eventPermissions.allowAlbumCreation !== undefined) {
            customPermissions[PermissionAction.CREATE_ALBUM] = eventPermissions.allowAlbumCreation;
        }
    }

    return new PermissionManager(UserRole.GUEST, customPermissions);
}
