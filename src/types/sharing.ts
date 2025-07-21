// types/sharing.ts

export type SharePermissions = {
  canView: boolean;
  canUpload: boolean;
  canDownload: boolean;
};

export type ShareTokenType = 'event' | 'album';

export interface ShareToken {
  id: string;
  token: string;
  eventId: string;
  albumId?: string; // Optional - for sharing specific albums
  permissions: SharePermissions;
  createdAt: Date;
  expiresAt?: Date;
  // Removed password field as we're moving away from access codes
  createdById: string;
  usageCount: number;
  // New field for invited guests (email addresses or usernames)
  invitedGuests?: string[];
  // Access mode to determine if this is open to anyone or only invited users
  accessMode: 'public' | 'invited_only';
}

export enum EventAccessLevel {
  PUBLIC = 'public',           // Anyone can view
  LINK_ONLY = 'link_only',     // Anyone with link can view
  INVITED_ONLY = 'invited_only' // Only invited users can view (replacing RESTRICTED)
}

export interface EventAccess {
  level: EventAccessLevel;
  allowGuestUploads: boolean;
  requireApproval: boolean;
}
