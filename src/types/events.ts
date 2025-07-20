// types/event.ts
import { EventAccessLevel } from './sharing';

// Event template options
export type EventTemplate = 'wedding' | 'birthday' | 'concert' | 'corporate' | 'vacation' | 'custom';

export interface EventAccess {
  level: EventAccessLevel;
  allowGuestUploads: boolean;
  requireApproval: boolean;
}

export interface Event {
  _id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  timezone: string;
  location: {
    name: string;
    address: string;
    coordinates: any[]; // You can replace 'any' with a more specific type if needed
  };
  cover_image: {
    url: string;
    public_id: string;
  };
  is_private: boolean;
  template: string;
  tags: string[];
  privacy: {
    visibility: string;
    discoverable: boolean;
    guest_management: {
      anyone_can_invite: boolean;
      require_approval: boolean;
      auto_approve_domains: string[];
      max_guests: number;
      allow_anonymous: boolean;
    };
    content_controls: {
      allow_downloads: boolean;
      allow_sharing: boolean;
      require_watermark: boolean;
      content_moderation: string;
    };
  };
  default_guest_permissions: {
    view: boolean;
    upload: boolean;
    download: boolean;
    comment: boolean;
    share: boolean;
    create_albums: boolean;
  };
  share_settings: {
    active_share_tokens: number;
    guest_count: number;
    has_password_protection: boolean;
    last_shared_at: string | null;
    restricted_to_guests: boolean;
  }
  co_hosts: string[];
}

export interface ApiEvent {
  _id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string | null;
  location?: string;
  cover_image: string;
  created_at: string;
  created_by: string;
  // Legacy fields
  is_private: boolean;
  access_code?: string;
  // New invited guests feature
  invited_guests?: string[];
  // New access control
  access?: {
    level: string;
    allowGuestUploads: boolean;
    requireApproval: boolean;
  };
  template?: EventTemplate;
  privacy?: {
    visibility: string;
    discoverable: boolean;
    guest_management?: {
      anyone_can_invite: boolean;
      require_approval: boolean;
      auto_approve_domains: string[];
      max_guests: number;
      allow_anonymous: boolean;
    };
    content_controls?: {
      allow_downloads: boolean;
      allow_sharing: boolean;
      require_watermark: boolean;
      content_moderation: string;
    };
  };
}