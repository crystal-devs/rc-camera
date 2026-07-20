// lib/permissions/PermissionManager.ts - Permission holder for one event
//
// Thin, immutable wrapper around the permission set the SERVER computed for
// the current user (GET /event/:id/my-access). It deliberately contains no
// role→permission matrix and no client-side calculation — the server is the
// single source of truth, this class only answers can()/enforce() questions
// against what the server said. See docs/RBAC_DESIGN.md.

import { UserRole, parseRole, hasRolePrivilege } from '@/types/roles';
import { ACTIONS, PermissionAction, isPermissionAction } from '@/constants/permissions';
import { PermissionError } from '@/lib/errors/PermissionError';
import { logger } from '@/lib/logger/Logger';

export interface PermissionCheckResult {
    allowed: boolean;
    reason?: string;
}

export class PermissionManager {
    private readonly role: UserRole;
    private readonly allowed: ReadonlySet<PermissionAction>;

    constructor(role: UserRole, allowedActions?: Iterable<PermissionAction>) {
        this.role = role;
        // No list means "not loaded" — deny everything rather than guess.
        this.allowed = new Set(allowedActions ?? []);
    }

    /** Check if the server granted a specific action. */
    can(action: PermissionAction): boolean {
        return this.allowed.has(action);
    }

    check(action: PermissionAction): PermissionCheckResult {
        if (!this.can(action)) {
            return {
                allowed: false,
                reason: `Role "${this.role}" does not have permission for action "${action}"`,
            };
        }
        return { allowed: true };
    }

    /** Throws PermissionError if the action is not allowed. */
    enforce(action: PermissionAction): void {
        if (!this.can(action)) {
            logger.warn('Permission enforcement failed', { action, role: this.role });
            throw PermissionError.denied(action, { userRole: this.role, action });
        }
    }

    canAll(...actions: PermissionAction[]): boolean {
        return actions.every((action) => this.can(action));
    }

    canAny(...actions: PermissionAction[]): boolean {
        return actions.some((action) => this.can(action));
    }

    hasMinimumRole(minimumRole: UserRole): boolean {
        return hasRolePrivilege(this.role, minimumRole);
    }

    getAllowedActions(): PermissionAction[] {
        return Array.from(this.allowed);
    }

    getDeniedActions(): PermissionAction[] {
        return ACTIONS.filter((action) => !this.allowed.has(action));
    }

    getRole(): UserRole {
        return this.role;
    }

    /**
     * Build from the my-access API payload:
     * `{ role: 'co_host', permissions: ['event.view', 'event.update', ...] }`
     * Unknown action strings (from a newer server) are ignored.
     */
    static fromAPI(data: { role: string; permissions?: string[] }): PermissionManager {
        const role = parseRole(data.role);
        const actions = (data.permissions ?? []).filter(isPermissionAction);
        return new PermissionManager(role, actions);
    }
}

/** Factory kept for existing call sites. */
export function createPermissionManager(
    role: UserRole,
    allowedActions?: Iterable<PermissionAction>
): PermissionManager {
    return new PermissionManager(role, allowedActions);
}
