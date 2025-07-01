// lib/album-mappers.ts

import { Album, ApiAlbum } from '@/types/album';

// Convert API album to frontend album format
export const mapApiAlbumToAlbum = (apiAlbum: any): Album => {
  console.log('Mapping API album to frontend format:', apiAlbum);
  
  // Handle both formats - direct API response or transformed object
  const album: Album = {
    id: apiAlbum._id || '',
    name: apiAlbum.title || 'Untitled Album',
    description: apiAlbum.description || '',
    eventId: apiAlbum.event_id || '',
    cover_image: apiAlbum.cover_image || undefined,
    createdAt: apiAlbum.created_at ? new Date(apiAlbum.created_at) : new Date(),
    createdById: apiAlbum.created_by || '',
    accessType: apiAlbum.is_private ? 'restricted' : 'public',
    accessCode: apiAlbum.access_code || undefined,
    isDefault: !!apiAlbum.is_default,
    photoCount: apiAlbum.photoCount || 0
  };
  
  console.log('Mapped album result:', album);
  return album;
};