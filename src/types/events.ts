// types/event.ts

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
    is_private: boolean;
    access_code?: string;
    template?: 'wedding' | 'birthday' | 'concert' | 'corporate' | 'vacation' | 'custom';
  }