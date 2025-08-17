// ===== FIXED: services/apis/photowall.api.ts =====

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';

export interface PhotoWallItem {
  id: string;
  imageUrl: string;
  uploaderName?: string;
  timestamp: Date;
  position: number;
  isNew?: boolean;
  uploadedAt?: Date;
}

export interface PhotoWallSettings {
  isEnabled: boolean;
  displayMode: 'slideshow' | 'grid' | 'mosaic';
  transitionDuration: number;
  showUploaderNames: boolean;
  autoAdvance: boolean;
  newImageInsertion: 'immediate' | 'after_current' | 'end_of_queue' | 'smart_priority';
}

export interface PhotoWallResponse {
  status: boolean;
  code: number;
  message: string;
  data: {
    wallId: string;
    eventTitle: string;
    settings: PhotoWallSettings;
    items: PhotoWallItem[];
    currentIndex: number;
    totalItems: number;
    newItemsCount: number;
    serverTime: string;
    sessionId: string;
    insertionStrategy: string;
  } | null;
  error?: any;
}

export interface PhotoWallStatusResponse {
  status: boolean;
  code: number;
  message: string;
  data: {
    eventTitle: string;
    isActive: boolean;
    isEnabled: boolean;
    displayMode: string;
    activeViewers: number;
    totalViews: number;
    isSharing: boolean;
  } | null;
}

/**
 * 🔧 FIXED: Removed all problematic headers
 */
export const getPhotoWallData = async (
  shareToken: string,
  options: {
    quality?: 'medium' | 'large' | 'original';
    maxItems?: number;
    currentIndex?: number;
    sessionId?: string;
    lastFetchTime?: string;
  } = {}
): Promise<PhotoWallResponse> => {
  try {
    console.log(`🔍 Fetching photo wall data for token: ${shareToken.substring(0, 8)}...`, options);

    const params = new URLSearchParams();
    
    if (options.quality) params.append('quality', options.quality);
    if (options.maxItems) params.append('maxItems', options.maxItems.toString());
    if (options.currentIndex !== undefined) params.append('currentIndex', options.currentIndex.toString());
    if (options.sessionId) params.append('sessionId', options.sessionId);
    if (options.lastFetchTime) params.append('lastFetchTime', options.lastFetchTime);

    const endpoint = `${API_BASE_URL}/photo-wall/${shareToken}`;
    const url = params.toString() ? `${endpoint}?${params}` : endpoint;

    console.log(`📡 Calling API: ${url}`);

    // 🔧 COMPLETELY REMOVED ALL HEADERS - Let browser handle defaults
    const response = await axios.get(url, {
      timeout: 15000
      // NO HEADERS AT ALL - This was causing the CORS issue
    });

    console.log('📊 API Response:', response.status, response.data);

    if (response.data && response.data.status === true) {
      return response.data as PhotoWallResponse;
    }

    throw new Error(response.data?.message || 'Failed to fetch photo wall data');
  } catch (error) {
    console.error('❌ Error fetching photo wall data:', error);

    if (axios.isAxiosError(error)) {
      // More specific error handling
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        console.error('Network details:', {
          config: error.config,
          request: error.request,
          response: error.response
        });
        throw new Error('Network error - check if API server is running on port 3001');
      }
      if (error.response?.status === 404) {
        throw new Error('Photo wall not found - check if share token is valid');
      }
      if (error.response?.status === 403) {
        throw new Error('Photo wall access denied - wall may be disabled');
      }
      if (error.response?.status >= 500) {
        throw new Error('Server error. Please try again later.');
      }
    }

    throw error;
  }
};

/**
 * 🔧 FIXED: Get photo wall status (lightweight)
 */
export const getPhotoWallStatus = async (shareToken: string): Promise<PhotoWallStatusResponse> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/photo-wall/${shareToken}/status`, {
      timeout: 10000
      // NO HEADERS
    });

    return response.data as PhotoWallStatusResponse;
  } catch (error) {
    console.error('Error fetching photo wall status:', error);
    throw error;
  }
};

/**
 * 🔧 FIXED: Update photo wall settings (requires auth)
 */
export const updatePhotoWallSettings = async (
  shareToken: string,
  settings: Partial<PhotoWallSettings>,
  authToken: string
): Promise<PhotoWallResponse> => {
  try {
    const response = await axios.patch(
      `${API_BASE_URL}/photo-wall/${shareToken}/settings`,
      settings,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
          // REMOVED: Accept header and other unnecessary headers
        },
        timeout: 10000,
      }
    );

    return response.data as PhotoWallResponse;
  } catch (error) {
    console.error('Error updating photo wall settings:', error);
    throw error;
  }
};

// ===== ALTERNATIVE: Create a simple fetch version if axios still has issues =====

/**
 * 🔧 BACKUP: Using native fetch instead of axios (if axios still causes issues)
 */
export const getPhotoWallDataWithFetch = async (
  shareToken: string,
  options: {
    quality?: 'medium' | 'large' | 'original';
    maxItems?: number;
    currentIndex?: number;
    sessionId?: string;
    lastFetchTime?: string;
  } = {}
): Promise<PhotoWallResponse> => {
  try {
    console.log(`🔍 Fetching photo wall data for token: ${shareToken.substring(0, 8)}...`, options);

    const params = new URLSearchParams();
    
    if (options.quality) params.append('quality', options.quality);
    if (options.maxItems) params.append('maxItems', options.maxItems.toString());
    if (options.currentIndex !== undefined) params.append('currentIndex', options.currentIndex.toString());
    if (options.sessionId) params.append('sessionId', options.sessionId);
    if (options.lastFetchTime) params.append('lastFetchTime', options.lastFetchTime);

    const endpoint = `${API_BASE_URL}/photo-wall/${shareToken}`;
    const url = params.toString() ? `${endpoint}?${params}` : endpoint;

    console.log(`📡 Calling API with fetch: ${url}`);

    // Using native fetch - no headers at all
    const response = await fetch(url, {
      method: 'GET',
      // NO HEADERS AT ALL
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📊 Fetch Response:', data);

    if (data && data.status === true) {
      return data as PhotoWallResponse;
    }

    throw new Error(data?.message || 'Failed to fetch photo wall data');
  } catch (error) {
    console.error('❌ Error fetching photo wall data with fetch:', error);
    throw error;
  }
};
