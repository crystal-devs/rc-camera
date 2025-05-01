// lib/album-mappers.ts

import { Album, ApiAlbum } from '@/types/album';

// Convert API album to frontend album format
export const mapApiAlbumToAlbum = (apiAlbum: ApiAlbum): Album => {
  return {
    id: apiAlbum._id,
    name: apiAlbum.title,
    description: apiAlbum.description,
    eventId: apiAlbum.event_id,
    cover_image: apiAlbum.cover_image || undefined,
    createdAt: new Date(apiAlbum.created_at),
    createdById: apiAlbum.created_by,
    accessType: apiAlbum.is_private ? 'restricted' : 'public',
    accessCode: apiAlbum.access_code,
    isDefault: apiAlbum.is_default,
    photoCount: 0  // Will be populated later if available
  };
};