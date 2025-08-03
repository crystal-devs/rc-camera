// lib/queryKeys.ts - Centralized query key management
export const queryKeys = {
  // Base keys
  all: ['media'] as const,
  
  // Events
  events: () => [...queryKeys.all, 'events'] as const,
  event: (eventId: string) => [...queryKeys.events(), eventId] as const,
  eventPhotos: (eventId: string, status?: string) => 
    status 
      ? [...queryKeys.event(eventId), 'photos', status] as const
      : [...queryKeys.event(eventId), 'photos'] as const,
  eventCounts: (eventId: string) => [...queryKeys.event(eventId), 'counts'] as const,
  
  // Albums
  albums: () => [...queryKeys.all, 'albums'] as const,
  album: (albumId: string) => [...queryKeys.albums(), albumId] as const,
  albumPhotos: (albumId: string, status?: string) =>
    status
      ? [...queryKeys.album(albumId), 'photos', status] as const
      : [...queryKeys.album(albumId), 'photos'] as const,
  
  // Users
  users: () => [...queryKeys.all, 'users'] as const,
  user: (userId: string) => [...queryKeys.users(), userId] as const,
};