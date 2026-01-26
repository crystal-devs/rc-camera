// src/lib/db.ts - IndexedDB setup for client-side storage
import Dexie from 'dexie';

export interface Album {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  createdById: number;
  accessType: 'public' | 'restricted';
  accessCode: string;
}

export interface AlbumAccess {
  id: string;
  albumId: string;
  userId: number;
  accessType: 'owner' | 'contributor' | 'viewer';
  joinedAt: Date;
}

export interface Photo {
  id: string;
  albumId: string;
  filename: string;
  url: string;
  uploadedAt: Date;
  uploadedById: number;
}

class PhotoAlbumDB extends Dexie {
  albums!: Dexie.Table<Album, string>;
  albumAccess!: Dexie.Table<AlbumAccess, string>;
  photos!: Dexie.Table<Photo, string>;

  constructor() {
    super('PhotoAlbumDB');

    this.version(1).stores({
      albums: 'id, name, createdAt, createdById, accessType, accessCode',
      albumAccess: 'id, albumId, userId, accessType, joinedAt',
      photos: 'id, albumId, filename, uploadedAt, uploadedById'
    });
  }
}

export const db = new PhotoAlbumDB();