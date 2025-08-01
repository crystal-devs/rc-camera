// event.types.ts
export interface Location {
    name: string;
    address: string;
    coordinates: number[]; // [latitude, longitude]
  }
  
  export interface CoverImage {
    url: string;
    public_id: string;
    uploaded_by: string | null; // ObjectId serialized as string
    thumbnail_url: string;
  }
  
  export interface CoHostInviteToken {
    token?: string; // Optional, may not always be present
    created_by: string | null; // ObjectId serialized as string
    created_at: string; // ISO date string
    expires_at: string; // ISO date string
    is_active: boolean;
    max_uses: number;
    used_count: number;
  }
  
  export interface CoHost {
    user_id: string; // ObjectId serialized as string
    invited_by: string; // ObjectId serialized as string
    status: 'pending' | 'approved' | 'rejected' | 'removed';
    permissions: {
      manage_content: boolean;
      manage_guests: boolean;
      manage_settings: boolean;
      approve_content: boolean;
    };
    invited_at: string; // ISO date string
    approved_at: string | null; // ISO date string or null
  }
  
  export interface ShareSettings {
    is_active: boolean;
    password: string | null;
    expires_at: string | null; // ISO date string or null
  }
  
  export interface Permissions {
    can_view: boolean;
    can_upload: boolean;
    can_download: boolean;
    allowed_media_types: {
      images: boolean;
      videos: boolean;
    };
    require_approval: boolean;
  }
  
  export interface EventStats {
    participants: number;
    photos: number;
    videos: number;
    total_size_mb: number;
    pending_approval: number;
  }
  
  export interface Event {
    _id: string; // ObjectId serialized as string
    title: string;
    description: string;
    created_by: string; // ObjectId serialized as string
    share_token?: string; // Optional, sparse index
    share_settings: ShareSettings;
    permissions: Permissions;
    co_host_invite_token: CoHostInviteToken;
    co_hosts: CoHost[];
    visibility: 'anyone_with_link' | 'invited_only' | 'private';
    start_date: string | Date; // ISO date string
    end_date: string | Date | null; // ISO date string or null
    timezone: string;
    location: Location;
    cover_image: CoverImage;
    template: 'wedding' | 'birthday' | 'concert' | 'corporate' | 'vacation' | 'custom';
    stats: EventStats;
    created_at: string; // ISO date string
    updated_at: string; // ISO date string
    archived_at: string | null; // ISO date string or null
    user_role?: string; // From EventType
    user_permissions?: Record<string, boolean> | null; // From EventType
  }