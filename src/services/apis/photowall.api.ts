// services/apis/photowall.api.ts - SIMPLIFIED VERSION

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';

export interface PhotoWallItem {
  id: string;
  imageUrl: string;
  uploaderName?: string;
  timestamp: Date;
  position: number;
  isNew?: boolean;
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
    eventTitle: string;
    settings: PhotoWallSettings;
    items: PhotoWallItem[];
    totalItems: number;
    serverTime: string;
  } | null;
  error?: any;
}

// 🚀 SIMPLIFIED: Only for display (settings now handled via Event API)
export const getPhotoWallData = async (
  shareToken: string,
  options: {
    quality?: 'medium' | 'large' | 'original';
    maxItems?: number;
  } = {}
): Promise<PhotoWallResponse> => {
  try {
    console.log(`🔍 Fetching photo wall data for token: ${shareToken.substring(0, 8)}...`);

    const params = new URLSearchParams();
    if (options.quality) params.append('quality', options.quality);
    if (options.maxItems) params.append('maxItems', options.maxItems.toString());

    const endpoint = `${API_BASE_URL}/photo-wall/${shareToken}`;
    const url = params.toString() ? `${endpoint}?${params}` : endpoint;

    const response = await axios.get(url, { timeout: 15000 });

    if (response.data && response.data.status === true) {
      return response.data as PhotoWallResponse;
    }

    throw new Error(response.data?.message || 'Failed to fetch photo wall data');
  } catch (error) {
    console.error('❌ Error fetching photo wall data:', error);

    if (axios.isAxiosError(error)) {
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

// 🚀 REMOVED: updatePhotoWallSettings function - now handled via Event API