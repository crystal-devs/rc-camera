// types/album.ts

export interface Album {
    id: string;
    name: string;
    description?: string;
    eventId: string;
    cover_image?: string;
    createdAt: Date;
    createdById: string;
    accessType: 'public' | 'restricted';
    accessCode?: string;
    isDefault?: boolean;
    photoCount?: number;
  }
  
  export interface ApiAlbum {
    _id: string;
    title: string;
    description: string;
    event_id: string;
    cover_image: string;
    created_at: string;
    created_by: string;
    is_private: boolean;
    access_code?: string;
    is_default?: boolean;
  }