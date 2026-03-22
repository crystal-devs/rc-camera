// src/lib/api-routes.ts - Centralized API Routes Configuration
export const API_ROUTES = {
  // Base configuration
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
  VERSION: 'v1',

  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    VERIFY: '/auth/verify-clicky',
    LOGOUT: '/auth/logout'
  },

  // Events
  EVENTS: {
    LIST: '/event',
    CREATE: '/event',
    GET: (id: string) => `/event/${id}`,
    UPDATE: (id: string) => `/event/${id}`,
    DELETE: (id: string) => `/event/${id}`,
    GUESTS: (id: string) => `/event/${id}/participants`,
    PARTICIPANTS_INVITE: (id: string) => `/event/${id}/participants/invite`,
    PARTICIPANTS: (id: string) => `/event/${id}/participants`
  },

  // Media
  MEDIA: {
    UPLOAD: '/media/upload',
    GET_EVENT: (eventId: string) => `/media/event/${eventId}`,
    GET_COUNTS: (eventId: string) => `/media/event/${eventId}/counts`,
    GET_ALBUM: (albumId: string) => `/media/album/${albumId}`,
    GET_BY_ID: (mediaId: string) => `/media/${mediaId}`,
    UPDATE_STATUS: (mediaId: string) => `/media/${mediaId}/status`,
    DELETE: (mediaId: string) => `/media/${mediaId}`,
    BULK_DELETE: (eventId: string) => `/media/event/${eventId}/bulk-delete`,
    PROCESSING_STATUS: (mediaId: string) => `/media/${mediaId}/processing`,
    BATCH_APPROVE: '/media/batch/approve',
    BATCH_REJECT: '/media/batch/reject',
    UPLOAD_COVER: '/media/upload-cover',
    BULK_UPDATE: (eventId: string) => `/bulk/media/event/${eventId}/status`,
    BULK_APPROVE: (eventId: string) => `/bulk/media/event/${eventId}/approve`,
    BULK_REJECT: (eventId: string) => `/bulk/media/event/${eventId}/reject`,
    BULK_HIDE: (eventId: string) => `/bulk/media/event/${eventId}/hide`,
    UPLOAD_URLS: '/media/upload-url',
    GUEST_ACCESS: (token: string) => `/media/guest/${token}`,
    GUEST_ALBUM: (albumId: string) => `/media/album/${albumId}/guest`,
    SEARCH_FACES: '/media/search/faces',
  },

  // Sharing & Tokens
  SHARING: {
    TOKEN_INFO: (token: string) => `/token/${token}`,
    EVENT_SHARE: (eventId: string) => `/share/event/${eventId}`,
    TOKEN_UPDATE: (tokenId: string) => `/share/token/${tokenId}`,
    EVENT_INVITE: (eventId: string) => `/share/event/${eventId}/invite`
  },

  // Albums
  ALBUMS: {
    LIST: '/album',
    CREATE: '/album',
    GET: (id: string) => `/album/${id}`,
    UPDATE: (id: string) => `/album/${id}`,
    DELETE: (id: string) => `/album/${id}`
  },

  // Users
  USERS: {
    PROFILE: '/user/profile',
    UPDATE_PROFILE: '/user/profile',
    SUBSCRIPTION: '/user/subscription'
  },

  // Guest Claims
  GUEST_CLAIM: {
    CLAIM: '/guest-claim/claim',
    SUMMARY: (eventId: string) => `/guest-claim/summary/${eventId}`,
    BULK_CLAIM: '/guest-claim/bulk-claim'
  },

  // Bulk Download
  BULK_DOWNLOAD: {
    CREATE: '/bulk-download/create',
    STATUS: (jobId: string) => `/bulk-download/status/${jobId}`,
    DOWNLOAD: (jobId: string) => `/bulk-download/download/${jobId}`
  },

  // Cohosts
  COHOSTS: {
    LIST: (eventId: string) => `/event/${eventId}/cohosts`,
    ADD: (eventId: string) => `/event/${eventId}/cohosts`,
    REMOVE: (eventId: string, cohostId: string) => `/event/${eventId}/cohosts/${cohostId}`,
    UPDATE_PERMISSIONS: (eventId: string, cohostId: string) => `/event/${eventId}/cohosts/${cohostId}/permissions`
  },

  // Photowall
  PHOTOWALL: {
    SETTINGS: (eventId: string) => `/photowall/${eventId}/settings`,
    ITEMS: (eventId: string) => `/photowall/${eventId}/items`,
    UPDATE_ITEM: (eventId: string, itemId: string) => `/photowall/${eventId}/items/${itemId}`,
    BULK_UPDATE: (eventId: string) => `/photowall/${eventId}/bulk-update`
  }
} as const;

// Helper function to build full URLs
export const buildApiUrl = (path: string): string => {
  return `${API_ROUTES.BASE_URL}/api/${API_ROUTES.VERSION}${path}`;
};

// Helper for dynamic routes
export const getApiUrl = (route: string | ((...args: any[]) => string), ...args: any[]): string => {
  const path = typeof route === 'function' ? route(...args) : route;
  return buildApiUrl(path);
};