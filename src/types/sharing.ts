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
  password?: string; // Hashed password if needed
  createdById: string;
  usageCount: number;
}

export enum EventAccessLevel {
  PUBLIC = 'public',        // Anyone can view
  LINK_ONLY = 'link_only',  // Anyone with link can view
  RESTRICTED = 'restricted' // Requires authentication + permission
}

export interface EventAccess {
  level: EventAccessLevel;
  allowGuestUploads: boolean;
  requireApproval: boolean;
}
