// lib/AppContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from './db';
import { v4 as uuidv4 } from 'uuid';

interface AppContextType {
  currentUser: any;
  albums: any[];
  photos: any[];
  loadAlbums: () => Promise<void>;
  loadPhotos: (albumId: string) => Promise<void>;
  createAlbum: (albumData: any) => Promise<string>;
  addPhoto: (photoData: any) => Promise<string>;
  deletePhoto: (photoId: string) => Promise<void>;
  initialized: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [albums, setAlbums] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check for existing user
        const existingUser = await db.users.get(1);
        
        if (!existingUser) {
          // Create a demo user for the MVP
          const userId = 1;
          await db.users.add({
            id: userId,
            name: 'Demo User',
            email: 'demo@example.com',
          });
          setCurrentUser({ id: userId, name: 'Demo User', email: 'demo@example.com' });
        } else {
          setCurrentUser(existingUser);
        }
        
        setInitialized(true);
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initializeApp();
  }, []);

  const loadAlbums = async () => {
    if (!currentUser) return;
    
    try {
      // Get all albums created by the user
      const userAlbums = await db.albums
        .where('createdById')
        .equals(currentUser.id)
        .toArray();
      
      // Get album IDs the user has access to
      const accessEntries = await db.albumAccess
        .where('userId')
        .equals(currentUser.id)
        .toArray();
      
      const sharedAlbumIds = accessEntries
        .filter(entry => entry.accessType !== 'owner')
        .map(entry => entry.albumId);
      
      // Get shared albums
      const sharedAlbums = sharedAlbumIds.length > 0
        ? await db.albums
            .where('id')
            .anyOf(sharedAlbumIds)
            .toArray()
        : [];
      
      setAlbums([...userAlbums, ...sharedAlbums]);
    } catch (error) {
      console.error('Error loading albums:', error);
    }
  };

  const loadPhotos = async (albumId: string) => {
    try {
      const albumPhotos = await db.photos
        .where('albumId')
        .equals(albumId)
        .toArray();
      
      // Sort by createdAt desc
      albumPhotos.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      setPhotos(albumPhotos);
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  };

  const createAlbum = async (albumData: any) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const albumId = uuidv4();
    const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const newAlbum = {
      id: albumId,
      name: albumData.name,
      description: albumData.description || '',
      createdAt: new Date(),
      createdById: currentUser.id,
      accessType: albumData.accessType || 'restricted',
      accessCode
    };
    
    await db.albums.add(newAlbum);
    
    // Add owner access record
    await db.albumAccess.add({
      id: uuidv4(),
      albumId,
      userId: currentUser.id,
      accessType: 'owner',
      joinedAt: new Date()
    });
    
    // Update albums list
    await loadAlbums();
    
    return albumId;
  };

  const addPhoto = async (photoData: any) => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const photoId = uuidv4();
    const newPhoto = {
      id: photoId,
      albumId: photoData.albumId,
      takenBy: currentUser.id,
      imageUrl: photoData.imageUrl,
      thumbnail: photoData.thumbnail,
      createdAt: new Date(),
      metadata: photoData.metadata || {}
    };
    
    await db.photos.add(newPhoto);
    
    // Reload photos for the album
    await loadPhotos(photoData.albumId);
    
    return photoId;
  };

  const deletePhoto = async (photoId: string) => {
    await db.photos.delete(photoId);
    setPhotos(photos.filter(photo => photo.id !== photoId));
  };

  const value = {
    currentUser,
    albums,
    photos,
    loadAlbums,
    loadPhotos,
    createAlbum,
    addPhoto,
    deletePhoto,
    initialized
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}