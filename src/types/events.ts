// types/event.ts
import { EventAccessLevel } from './sharing';

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

export interface EventFormData {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: {
    name: string;
    address: string;
  };
  template: string;
  cover_image: {
    url: string;
    public_id: string;
  };
  visibility: string;
  permissions: {
    can_view: boolean;
    can_upload: boolean;
    can_download: boolean;
    allowed_media_types: {
      images: boolean;
      videos: boolean;
    };
    require_approval: boolean;
  };
  share_settings: {
    is_active: boolean;
    password: string | null;
    expires_at: string | null;
  };
  share_token: string;
  co_host_invite_token: {
    token: string;
    expires_at: string;
    is_active: boolean;
  };
}

export interface EventTemplate {
  value: string;
  label: string;
  desc: string;
}

// types/event.types.ts
export interface ApiPhoto {
  _id: string;
  albumId: string;
  eventId: string;
  imageUrl: string;
  thumbnail: string;
  createdAt: string;
  approval: {
    status: 'auto_approved' | 'approved' | 'pending' | 'rejected';
    approved_by?: string | null;
    approved_at?: string;
    rejection_reason?: string;
    auto_approval_reason?: string;
  };
  metadata: {
    width: number;
    height: number;
    device_info: {
      brand: string;
      model: string;
      os: string;
    };
    timestamp: string | null;
  };
  url: string;
}

export interface TransformedPhoto {
  id: string;
  src: string;
  width: number;
  height: number;
  uploaded_by: string;
  approval: ApiPhoto['approval'];
  createdAt: string;
  albumId: string;
  eventId: string;
}

export interface EventDetails {
  title: string;
  start_date: string;
  location?: {
    name: string;
  };
  permissions?: {
    can_upload: boolean;
    can_download: boolean;
    require_approval: boolean;
  };
}

export interface Pagination {
  page: number;
  hasMore: boolean;
  total: number;
  loading: boolean;
}

export interface MediaFetchOptions {
  page: number;
  limit: number;
  scroll_type: 'pagination' | 'infinite';
  quality: 'thumbnail' | 'display' | 'full';
}

export interface MediaResponse {
  data: ApiPhoto[];
  total?: number;
  hasMore?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Transform function
export const transformApiPhoto = (apiPhoto: ApiPhoto): TransformedPhoto => ({
  id: apiPhoto._id,
  src: apiPhoto.url,
  width: apiPhoto.metadata?.width || 400,
  height: apiPhoto.metadata?.height || 600,
  uploaded_by: "Guest",
  approval: apiPhoto.approval,
  createdAt: apiPhoto.createdAt,
  albumId: apiPhoto.albumId,
  eventId: apiPhoto.eventId
});