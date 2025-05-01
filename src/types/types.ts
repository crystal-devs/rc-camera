// types.ts

// Event interface for frontend usage
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
  accessType: 'public' | 'restricted';
  accessCode?: string;
  template?: 'wedding' | 'birthday' | 'concert' | 'corporate' | 'vacation' | 'custom';
  isActive: boolean;
  photoCount?: number;
  albumCount?: number;
}

// Event interface for API response
export interface ApiEvent {
  _id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string | null;
  location?: string;
  thumbnail_pic: string;
  created_at: string;
  created_by: string;
  is_private: boolean;
  access_code?: string;
  template?: 'wedding' | 'birthday' | 'concert' | 'corporate' | 'vacation' | 'custom';
}

// Filter and sort options for events
export type FilterType = 'all' | 'active' | 'past';
export type SortOrder = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';
export type ViewType = 'grid' | 'list';