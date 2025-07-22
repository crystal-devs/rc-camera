// Using Dexie.js for local storage
import Dexie from 'dexie';

class PhotoAlbumDatabase extends Dexie {
  users: Dexie.Table<User, number>;
  events: Dexie.Table<Event, string>;
  albums: Dexie.Table<Album, string>;
  photos: Dexie.Table<Photo, string>;
  albumAccess: Dexie.Table<AlbumAccess, string>;
  eventAccess: Dexie.Table<EventAccess, string>;

  constructor() {
    super('PhotoAlbumApp');
    
    this.version(2).stores({
      users: '++id, email, name',
      events: 'id, name, createdAt, createdById, accessType, accessCode',
      albums: 'id, eventId, name, createdAt, createdById, accessType, accessCode',
      photos: 'id, albumId, eventId, takenBy, imageUrl, createdAt',
      albumAccess: 'id, albumId, userId, accessType',
      eventAccess: 'id, eventId, userId, accessType'
    });
  }
}

// Type definitions
interface User {
  id?: number;
  email: string;
  name: string;
  avatar?: string;
}

interface Event {
  id: string;
  name: string;
  description?: string;
  date: Date;
  endDate?: Date;
  location?: string;
  cover_image?: string;
  createdAt: Date;
  createdById: number;
  accessType: 'public' | 'restricted';
  accessCode?: string;
  template?: 'wedding' | 'birthday' | 'concert' | 'corporate' | 'vacation' | 'custom';
  isActive: boolean;
}

export interface Album {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  createdAt: Date;
  createdById: number;
  cover_image?: string;
  accessType: 'public' | 'restricted';
  accessCode?: string;
  isDefault?: boolean;
}

export interface Photo {
  id: string;
  albumId: string;
  eventId: string;
  takenBy: number;
  imageUrl: string;
  thumbnail?: string;
  createdAt: Date;
  metadata?: {
    location?: { lat: number; lng: number };
    device?: string;
  };
}

interface AlbumAccess {
  id: string;
  albumId: string;
  userId: number;
  accessType: 'owner' | 'contributor' | 'viewer';
  invitedBy?: number;
  invitedAt?: Date;
  joinedAt?: Date;
}

interface EventAccess {
  id: string;
  eventId: string;
  userId: number;
  accessType: 'owner' | 'contributor' | 'viewer';
  invitedBy?: number;
  invitedAt?: Date;
  joinedAt?: Date;
}

export const db = new PhotoAlbumDatabase();