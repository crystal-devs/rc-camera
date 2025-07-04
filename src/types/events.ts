// types/event.ts
import { EventAccessLevel } from './sharing';

export interface EventAccess {
  level: EventAccessLevel;
  allowGuestUploads: boolean;
  requireApproval: boolean;
}

export interface Event {
    id: string;
    name: string;
    description?: string;
    date: Date;
    endDate?: Date;
    location?: string;
    cover_image?: string;
    createdAt: Date;
    createdById: string;
    // Legacy fields (for backward compatibility)
    accessType: 'public' | 'restricted';
    accessCode?: string;
    // New access control
    access?: EventAccess;
    template?: 'wedding' | 'birthday' | 'concert' | 'corporate' | 'vacation' | 'custom';
    isActive: boolean;
    photoCount?: number;
    albumCount?: number;
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
    // New access control
    access?: {
      level: string;
      allowGuestUploads: boolean;
      requireApproval: boolean;
    };
    template?: 'wedding' | 'birthday' | 'concert' | 'corporate' | 'vacation' | 'custom';
  }