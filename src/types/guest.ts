// types/guest.ts - Guest Session Types
/**
 * Guest session status
 */
export enum GuestSessionStatus {
    /** Session is active and valid */
    ACTIVE = 'active',
    /** Session has expired */
    EXPIRED = 'expired',
    /** Session is invalid */
    INVALID = 'invalid',
    /** Session creation pending */
    PENDING = 'pending',
}

/**
 * Guest session data
 */
export interface GuestSession {
    /** Unique session ID */
    id: string;
    /** Event ID this session is for */
    eventId: string;
    /** Guest display name (optional) */
    guestName?: string;
    /** Session creation timestamp */
    createdAt: Date;
    /** Session expiration timestamp */
    expiresAt: Date;
    /** Last activity timestamp */
    lastActivityAt: Date;
    /** Session status */
    status: GuestSessionStatus;
    /** Device fingerprint for tracking */
    fingerprint?: string;
    /** Session metadata */
    metadata?: Record<string, any>;
}

/**
 * Guest identity for API calls
 */
export interface GuestIdentity {
    /** Session ID */
    sessionId: string;
    /** Guest name */
    guestName?: string;
    /** Fingerprint */
    fingerprint?: string;
}

/**
 * Guest permissions configuration
 */
export interface GuestPermissions {
    /** Can upload media */
    canUpload: boolean;
    /** Can download media */
    canDownload: boolean;
    /** Can create albums */
    canCreateAlbums: boolean;
    /** Can comment */
    canComment: boolean;
    /** Requires approval for uploads */
    requiresApproval: boolean;
}

/**
 * Guest session storage key prefix
 */
export const GUEST_SESSION_STORAGE_KEY = 'rc_guest_session';

/**
 * Guest session cookie name
 */
export const GUEST_SESSION_COOKIE_NAME = 'rc_guest_sid';

/**
 * Default session duration (7 days in milliseconds)
 */
export const DEFAULT_SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

/**
 * Session renewal threshold (renew if expires in less than 24 hours)
 */
export const SESSION_RENEWAL_THRESHOLD = 24 * 60 * 60 * 1000;

/**
 * Guest session creation options
 */
export interface CreateGuestSessionOptions {
    /** Event ID */
    eventId: string;
    /** Guest name */
    guestName?: string;
    /** Session duration in MS (default: 7 days) */
    duration?: number;
    /** Additional metadata */
    metadata?: Record<string, any>;
}

/**
 * Guest session validation result
 */
export interface GuestSessionValidation {
    /** Is session valid */
    valid: boolean;
    /** Reason if invalid */
    reason?: string;
    /** Session data if valid */
    session?: GuestSession;
}
