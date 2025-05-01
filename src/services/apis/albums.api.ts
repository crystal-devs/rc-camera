// services/apis/albums.api.ts

import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';
import { Album, ApiAlbum } from '@/types/album';
import { mapApiAlbumToAlbum } from '@/lib/album-mappers';

// Fetch all albums for the authenticated user
export const fetchUserAlbums = async (authToken: string): Promise<Album[]> => {
  try {
    console.log('Fetching user albums with token:', authToken ? 'Token exists' : 'No token');
    
    const response = await axios.get(`${API_BASE_URL}/album/user`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    console.log('API response for fetchUserAlbums:', response.data);

    if (response.data && response.data.status === true && Array.isArray(response.data.data)) {
      return response.data.data.map(mapApiAlbumToAlbum);
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching user albums:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('API error details:', error.response.data);
    }
    throw error;
  }
};

// Fetch albums for a specific event
export const fetchEventAlbums = async (eventId: string, authToken: string): Promise<Album[]> => {
  try {
    console.log(`Fetching albums for event ${eventId}`);
    
    const response = await axios.get(`${API_BASE_URL}/album/event/${eventId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    console.log('API response for fetchEventAlbums:', response.data);

    if (response.data && response.data.status === true && Array.isArray(response.data.data)) {
      return response.data.data.map(mapApiAlbumToAlbum);
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching albums for event ${eventId}:`, error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('API error details:', error.response.data);
    }
    throw error;
  }
};

// Get album by ID
export const getAlbumById = async (albumId: string, authToken: string): Promise<Album | null> => {
  try {
    console.log(`Fetching album ${albumId}`);
    
    const response = await axios.get(`${API_BASE_URL}/album/${albumId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    console.log('API response for getAlbumById:', response.data);

    if (response.data && response.data.status === true && response.data.data) {
      return mapApiAlbumToAlbum(response.data.data);
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching album ${albumId}:`, error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('API error details:', error.response.data);
    }
    throw error;
  }
};

// Create a new album
export const createAlbum = async (albumData: Partial<Album>, authToken: string): Promise<Album> => {
  try {
    // Transform frontend album format to API format
    const apiAlbumData = {
      title: albumData.name,
      description: albumData.description || '',
      event_id: albumData.eventId,
      cover_image: albumData.cover_image || '',
      is_private: albumData.accessType === 'restricted',
      access_code: albumData.accessCode || '',
      is_default: albumData.isDefault || false
    };

    console.log('Creating album with data:', apiAlbumData);
    
    const response = await axios.post(`${API_BASE_URL}/album`, apiAlbumData, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    console.log('Album created response:', response.data);

    if (response.data && response.data.status === true && response.data.data) {
      return mapApiAlbumToAlbum(response.data.data);
    }
    
    throw new Error('Failed to create album: Invalid response from API');
  } catch (error) {
    console.error('Error creating album:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('API error details:', error.response.data);
    }
    throw error;
  }
};

// Update an existing album
export const updateAlbum = async (
  albumId: string, 
  albumData: Partial<Album>, 
  authToken: string
): Promise<Album> => {
  try {
    // Transform frontend album format to API format
    const apiAlbumData = {
      title: albumData.name,
      description: albumData.description,
      cover_image: albumData.cover_image,
      is_private: albumData.accessType === 'restricted',
      access_code: albumData.accessCode
    };

    // Remove undefined properties to prevent overwriting with null
    Object.keys(apiAlbumData).forEach(key => {
      if (apiAlbumData[key] === undefined) {
        delete apiAlbumData[key];
      }
    });

    console.log(`Updating album ${albumId} with data:`, apiAlbumData);
    
    const response = await axios.put(`${API_BASE_URL}/album/${albumId}`, apiAlbumData, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    console.log('Album updated response:', response.data);

    if (response.data && response.data.status === true && response.data.data) {
      return mapApiAlbumToAlbum(response.data.data);
    }
    
    throw new Error('Failed to update album: Invalid response from API');
  } catch (error) {
    console.error(`Error updating album ${albumId}:`, error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('API error details:', error.response.data);
    }
    throw error;
  }
};

// Delete an album
export const deleteAlbum = async (albumId: string, authToken: string): Promise<boolean> => {
  try {
    console.log(`Deleting album ${albumId}`);
    
    const response = await axios.delete(`${API_BASE_URL}/album/${albumId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    console.log('Album deletion response:', response.data);

    return response.data && response.data.status === true;
  } catch (error) {
    console.error(`Error deleting album ${albumId}:`, error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('API error details:', error.response.data);
    }
    throw error;
  }
};