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
    console.log(`Fetching albums for event ${eventId} with token: ${authToken ? 'Valid token' : 'No token'}`);

    if (!eventId) {
      console.error('No eventId provided to fetchEventAlbums');
      return [];
    }

    if (!authToken) {
      console.error('No auth token provided to fetchEventAlbums');
      return [];
    }

    const url = `${API_BASE_URL}/album/event/${eventId}`;
    console.log(`Making API request to: ${url}`);

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    console.log('API response for fetchEventAlbums:', response.data);

    // Handle the case where data is an object (single album) rather than an array
    if (response.data && response.data.status === true) {
      // Case 1: data is a single album object
      if (response.data.data && !Array.isArray(response.data.data) && typeof response.data.data === 'object') {
        console.log('Received single album object instead of array, converting to array');
        try {
          const mappedAlbum = mapApiAlbumToAlbum(response.data.data);
          console.log(`Mapped single album: ${mappedAlbum.id} - ${mappedAlbum.name}`);
          return [mappedAlbum];
        } catch (err) {
          console.error('Error mapping single album:', err);
          console.error('Problem album data:', response.data.data);
          return [];
        }
      }
      
      // Case 2: data is an array of albums
      else if (Array.isArray(response.data.data)) {
        const mappedAlbums = response.data.data.map((album: any) => {
          try {
            const mappedAlbum = mapApiAlbumToAlbum(album);
            console.log(`Mapped album: ${mappedAlbum.id} - ${mappedAlbum.name}`);
            return mappedAlbum;
          } catch (err) {
            console.error(`Error mapping album ${album._id || 'unknown'}:`, err);
            console.error('Problem album data:', album);
            return null;
          }
        }).filter(Boolean); // Remove any null mappings
        
        console.log(`Successfully mapped ${mappedAlbums.length} albums`);
        return mappedAlbums;
      }
    }

    console.warn('No albums returned from API or invalid response format');
    return [];
  } catch (error) {
    console.error(`Error fetching albums for event ${eventId}:`, error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('API error status:', error.response.status);
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
    console.log('Auth token present:', !!authToken);

    if (!authToken) {
      throw new Error('No authentication token provided');
    }

    if (!apiAlbumData.event_id) {
      throw new Error('No event ID provided for album creation');
    }

    const response = await axios.post(`${API_BASE_URL}/album`, apiAlbumData, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
    });

    console.log('Album created API response status:', response.status);
    console.log('Album created response:', response.data);

    if (response.data && response.data.status === true && response.data.data) {
      const createdAlbum = mapApiAlbumToAlbum(response.data.data);
      console.log('Successfully mapped created album:', createdAlbum);
      return createdAlbum;
    }

    throw new Error('Failed to create album: Invalid response from API');
  } catch (error) {
    console.error('Error creating album:', error);
    if (axios.isAxiosError(error)) {
      console.error('API error status:', error.response?.status);
      console.error('API error details:', error.response?.data);
      
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      
      if (error.response?.data?.message) {
        throw new Error(`Failed to create album: ${error.response.data.message}`);
      }
    }
    throw new Error('Failed to create album. Please try again later.');
  }
};

// Update an existing album
export const updateAlbum = async (
  albumId: string,
  albumData: Partial<Album>,
  authToken: string
): Promise<Album> => {
  try {
    // Transform frontend album format to API format with type safety
    interface ApiUpdateData {
      title?: string;
      description?: string;
      cover_image?: string;
      is_private?: boolean;
      access_code?: string;
    }
    
    const apiAlbumData: ApiUpdateData = {};
    
    if (albumData.name !== undefined) apiAlbumData.title = albumData.name;
    if (albumData.description !== undefined) apiAlbumData.description = albumData.description;
    if (albumData.cover_image !== undefined) apiAlbumData.cover_image = albumData.cover_image;
    if (albumData.accessType !== undefined) apiAlbumData.is_private = albumData.accessType === 'restricted';
    if (albumData.accessCode !== undefined) apiAlbumData.access_code = albumData.accessCode;

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

// Get or create a default album for an event
export const getOrCreateDefaultAlbum = async (eventId: string, authToken: string): Promise<Album | null> => {
  try {
    console.log(`Fetching/creating default album for event ${eventId}`);

    // First try to find existing default albums
    const albums = await fetchEventAlbums(eventId, authToken);
    const defaultAlbum = albums.find(album => album.isDefault === true);

    if (defaultAlbum) {
      console.log('Found existing default album:', defaultAlbum.id);
      return defaultAlbum;
    }

    // If no default album exists, make an API call to create one
    const response = await axios.get(`${API_BASE_URL}/album/default/${eventId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    console.log('Default album API response:', response.data);

    if (response.data && response.data.status === true && response.data.data) {
      return mapApiAlbumToAlbum(response.data.data);
    }

    return null;
  } catch (error) {
    console.error(`Error getting/creating default album for event ${eventId}:`, error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('API error details:', error.response.data);
    }
    throw error;
  }
};