// DATABASE SCHEMA

// Using Dexie.js for local storage
import Dexie from 'dexie';

class PhotoAlbumDatabase extends Dexie {
  users: Dexie.Table<User, number>;
  albums: Dexie.Table<Album, string>;
  photos: Dexie.Table<Photo, string>;
  albumAccess: Dexie.Table<AlbumAccess, string>;

  constructor() {
    super('PhotoAlbumApp');
    
    this.version(1).stores({
      users: '++id, email, name',
      albums: 'id, name, createdAt, createdById, accessType, accessCode',
      photos: 'id, albumId, takenBy, imageUrl, createdAt',
      albumAccess: 'id, albumId, userId, accessType'
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

interface Album {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  createdById: number;
  coverImage?: string;
  accessType: 'public' | 'restricted';
  accessCode?: string;
}

interface Photo {
  id: string;
  albumId: string;
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

export const db = new PhotoAlbumDatabase();