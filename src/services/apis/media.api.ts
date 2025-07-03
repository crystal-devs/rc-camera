// services/apis/media.api.ts

import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';

/**
 * Upload a cover image and get URL back
 * 
 * @param file File to upload
 * @param folder Optional folder name to organize uploads (e.g., 'event_covers', 'album_covers')
 * @param authToken Authentication token
 * @returns URL of the uploaded image
 */
export const uploadCoverImage = async (
    file: File,
    folder: string = 'covers',
    authToken: string
): Promise<string> => {
    try {
        // Validate file
        if (!file || !(file instanceof File)) {
            console.error('Invalid file object provided:', file);
            throw new Error('Invalid file object provided');
        }

        // Create form data for upload - DO NOT modify the file in any way
        const formData = new FormData();
        
        // Add the actual file object, not its URL
        formData.append('image', file);
        formData.append('folder', folder);
        
        // Debug logging
        console.log('File being uploaded:', {
            name: file.name,
            type: file.type,
            size: file.size + ' bytes',
            isFile: file instanceof File // Should be true
        });
        
        // Log FormData entries
        for (const pair of formData.entries()) {
            console.log(`FormData entry - ${pair[0]}:`, 
                pair[1] instanceof File ? 
                `File object: ${(pair[1] as File).name}` : 
                pair[1]);
        }
        
        // Send with the correct content type
        const response = await axios.post(`${API_BASE_URL}/media/upload-cover`, formData, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                // IMPORTANT: Let axios set the content type - do not specify it manually
                // for multipart/form-data with files
            }
        });

        console.log('Cover image upload response:', response.data);

        if (response.data && response.data.status === true && response.data.data?.url) {
            return response.data.data.url;
        }

        throw new Error('Invalid response from media upload API');
    } catch (error) {
        console.error('Error uploading cover image:', error);
        if (axios.isAxiosError(error) && error.response) {
            console.error('API error status:', error.response.status);
            console.error('API error details:', error.response.data);
        }
        throw error;
    }
};

/**
 * Upload media to an album with enhanced error handling and diagnostics
 * 
 * @param file File to upload
 * @param albumId ID of the album (can be null if eventId is provided)
 * @param authToken Authentication token
 * @param eventId Optional ID of the event (for default album)
 * @returns Response from the API
 */
export const uploadAlbumMedia = async (
    file: File,
    albumId: string | null,
    authToken: string,
    eventId?: string
) => {
    try {
        // Validate inputs
        if (!file || !(file instanceof File)) {
            console.error('Invalid file object provided:', file);
            throw new Error('Invalid file object provided');
        }

        if (!authToken) {
            console.error('No auth token provided for media upload');
            throw new Error('Authentication required');
        }

        // Matching backend controller requirements: event_id is required
        if (!eventId) {
            console.error('eventId is required by the backend but not provided');
            throw new Error('Event ID is required for uploading photos');
        }

        // Additional validation for albumId format if provided
        if (albumId && (typeof albumId !== 'string' || albumId.trim() === '')) {
            console.error('Invalid album ID format:', albumId);
            throw new Error('Invalid album ID format');
        }

        // Validate file type and size client-side to avoid server errors
        if (!file.type.startsWith('image/')) {
            throw new Error(`File type not supported: ${file.type}. Only images are allowed.`);
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds max size of 10MB.`);
        }

        // Create form data for upload
        const formData = new FormData();

        // IMPORTANT: Use 'image' as the field name to match Multer config
        formData.append('image', file);
        
        // Only add album_id if it exists
        if (albumId) {
            formData.append('album_id', albumId);
        }
        
        // Add event_id - required by backend controller
        formData.append('event_id', eventId);
        
        // Add extra metadata to help debug on server
        formData.append('file_size', file.size.toString());
        formData.append('file_type', file.type);
        formData.append('file_name', file.name);

        console.log('Uploading media with data:', {
            albumId: albumId || 'Not provided - will use default album',
            eventId: eventId || 'Not provided',
            token: authToken ? 'Valid token provided' : 'No token',
            fileInfo: {
                name: file.name,
                size: `${(file.size / 1024).toFixed(2)} KB`,
                type: file.type,
                lastModified: new Date(file.lastModified).toISOString()
            }
        });

        // Diagnostics: Log FormData entries
        console.log('FormData entries being sent:');
        for (const pair of formData.entries()) {
            console.log(`- ${pair[0]}:`, 
                pair[1] instanceof File ? 
                `File object: ${(pair[1] as File).name} (${(pair[1] as File).size} bytes, ${(pair[1] as File).type})` : 
                pair[1]);
        }

        // Set a longer timeout for large uploads
        const uploadUrl = `${API_BASE_URL}/media/upload`;
        console.log(`Making upload request to: ${uploadUrl}`);
        
        // Retry mechanism for transient issues
        let retries = 0;
        const maxRetries = 2;
        
        while (retries <= maxRetries) {
            try {
                // Delay between retries (except first attempt)
                if (retries > 0) {
                    console.log(`Retry attempt ${retries}/${maxRetries} after delay...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * retries));
                }
                
                const uploadResponse = await axios.post(uploadUrl, formData, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        // Don't manually set Content-Type for FormData with files
                    },
                    timeout: 60000, // 60 seconds
                    responseType: 'json',
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                        console.log(`Upload progress: ${percentCompleted}%`);
                    }
                });
                
                console.log('Album media upload response:', uploadResponse.data);
                
                if (uploadResponse.data && uploadResponse.data.status === true) {
                    return uploadResponse.data.data;
                }
                
                // If we got here but status is false, there might be a server-side validation issue
                if (uploadResponse.data && uploadResponse.data.status === false) {
                    const message = uploadResponse.data?.message || 'Unknown server validation error';
                    console.error(`Server validation error: ${message}`);
                    throw new Error(message);
                }
                
                throw new Error(uploadResponse.data?.message || 'Invalid response from media upload API');
            } catch (err) {
                console.error(`Upload error (attempt ${retries + 1}/${maxRetries + 1}):`, err);
                
                // Only retry on network errors or 500 errors
                if (axios.isAxiosError(err) && 
                    (err.code === 'ECONNABORTED' || 
                     err.code === 'ECONNRESET' || 
                     err.response?.status === 500)) {
                    retries++;
                    if (retries <= maxRetries) {
                        continue; // Try again
                    }
                }
                
                // Either not a retryable error or we're out of retries
                throw err; // Re-throw to be handled by the outer catch block
            }
        }
    } catch (error) {
        console.error('Error uploading album media:', error);
        
        // Enhanced error handling with detailed diagnostics
        if (axios.isAxiosError(error)) {
            // Print detailed information about the error
            console.error('API error status:', error.response?.status);
            console.error('API error details:', error.response?.data);
            console.error('Request config:', {
                url: error.config?.url,
                method: error.config?.method,
                headers: error.config?.headers,
                // Don't log auth tokens
                hasAuthHeader: !!error.config?.headers?.Authorization,
            });
            
            if (error.response?.status === 413) {
                throw new Error('The image file is too large for the server to accept. Please use a smaller file.');
            }
            
            if (error.response?.status === 415) {
                throw new Error('Unsupported file type. Please use JPEG, PNG, or other supported image formats.');
            }
            
            if (error.response?.status === 401 || error.response?.status === 403) {
                throw new Error('Authentication error. Please log in again.');
            }
            
            if (error.response?.status === 400) {
                // Handle validation errors from your controller
                const errorMessage = error.response?.data?.message || 'Missing required fields';
                console.error('Validation error:', error.response?.data);
                throw new Error(`Upload failed: ${errorMessage}`);
            }
            
            if (error.response?.status === 500) {
                console.error('Server error details:', error.response?.data);
                if (error.response?.data?.stack) {
                    console.error('Server stack trace:', error.response.data.stack);
                }
                
                // Check for specific errors we found in the backend controller
                if (error.response?.data?.error?.message?.includes('default album')) {
                    throw new Error('Failed to create default album. Please try again or create an album first.');
                }
                
                // Generic 500 error
                throw new Error('Server error occurred. The file may be corrupted, too large, or in an unsupported format.');
            }
            
            if (error.response?.data?.message) {
                throw new Error(`Upload failed: ${error.response.data.message}`);
            }
        }
        
        // If it's another type of error or if we couldn't handle the axios error
        throw new Error(error instanceof Error ? error.message : 'Failed to upload image');
    }
};

/**
 * Fetch all media for a specific album
 * 
 * @param albumId ID of the album to fetch media from
 * @param authToken Authentication token
 * @returns Array of media items
 */
export const getAlbumMedia = async (albumId: string, authToken: string) => {
    try {
        console.log(`Fetching media for album ID: ${albumId}`);
        
        const response = await axios.get(`${API_BASE_URL}/media/album/${albumId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.data && response.data.status === true) {
            console.log(`Successfully fetched ${response.data.data?.length || 0} media items for album`);
            return response.data.data || [];
        }
        
        console.error('Invalid response format from album media API:', response.data);
        throw new Error(response.data?.message || 'Failed to fetch album media');
    } catch (error) {
        console.error('Error fetching album media:', error);
        
        if (axios.isAxiosError(error)) {
            console.error('API error status:', error.response?.status);
            console.error('API error details:', error.response?.data);
            
            if (error.response?.status === 401 || error.response?.status === 403) {
                throw new Error('Authentication error. Please log in again.');
            }
        }
        
        throw error;
    }
};

/**
 * Fetch all media for a specific event
 * This could be across multiple albums or just from the default album
 * 
 * @param eventId ID of the event to fetch media from
 * @param authToken Authentication token
 * @param includeAllAlbums Whether to include media from all albums in this event (true) or just default album (false)
 * @returns Array of media items
 */
export const getEventMedia = async (
    eventId: string, 
    authToken: string,
    includeAllAlbums: boolean = true
) => {
    try {
        console.log(`Fetching media for event ID: ${eventId} (includeAllAlbums: ${includeAllAlbums})`);
        
        // Use the appropriate endpoint based on whether we want all albums or just default
        const endpoint = includeAllAlbums 
            ? `${API_BASE_URL}/media/event/${eventId}` 
            : `${API_BASE_URL}/media/event/${eventId}/default`;
            
        console.log(`Making API request to: ${endpoint}`);
        
        // Make the API request with timeout for better user experience
        const response = await axios.get(endpoint, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            timeout: 15000 // 15 seconds timeout
        });
        
        if (response.data && response.data.status === true) {
            console.log(`Successfully fetched ${response.data.data?.length || 0} media items for event`);
            return response.data.data || [];
        }
        
        console.error('Invalid response format from event media API:', response.data);
        throw new Error(response.data?.message || 'Failed to fetch event media');
    } catch (error) {
        console.error('Error fetching event media:', error);
        
        if (axios.isAxiosError(error)) {
            if (error.code === 'ERR_NETWORK') {
                console.error('Network error - API server may be down or not accessible');
                console.error('API_BASE_URL:', API_BASE_URL);
                throw new Error('Cannot connect to server. Please check if your API server is running at ' + API_BASE_URL);
            }
            
            console.error('API error status:', error.response?.status);
            console.error('API error details:', error.response?.data);
            console.error('Request URL:', error.config?.url);
            console.error('Request method:', error.config?.method);
            
            // Log headers but remove authorization token
            const sanitizedHeaders = { ...error.config?.headers };
            if (sanitizedHeaders && sanitizedHeaders.Authorization) {
                sanitizedHeaders.Authorization = '[REDACTED]';
            }
            console.error('Request headers:', sanitizedHeaders);
            
            if (error.response) {
                if (error.response.status === 401 || error.response.status === 403) {
                    throw new Error('Authentication error. Please log in again.');
                } else if (error.response.status === 404) {
                    throw new Error('The requested media was not found. The event may not have any photos yet.');
                } else if (error.response.status >= 500) {
                    throw new Error('Server error. Please try again later.');
                }
            } else if (error.code === 'ECONNABORTED') {
                throw new Error('Request timed out. The server may be overloaded or unresponsive.');
            } else if (error.message && error.message.includes('CORS')) {
                throw new Error('CORS error. The API server may not allow requests from this origin.');
            }
        }
        
        // Rethrow with more descriptive message that helps with troubleshooting
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Media API Error Details: ${errorMessage}`);
        throw new Error(`Failed to load photos: ${errorMessage}. Check that your API server is running at ${API_BASE_URL}`);
    }
};

/**
 * Transform API media item to frontend Photo format
 * Use this to standardize the media items returned from the API
 * 
 * @param mediaItem The media item from the API
 * @returns Transformed Photo object
 */
export const transformMediaToPhoto = (mediaItem: any) => {
    return {
        id: mediaItem._id || mediaItem.id,
        albumId: mediaItem.album_id,
        eventId: mediaItem.event_id,
        takenBy: mediaItem.created_by || mediaItem.user_id,
        imageUrl: mediaItem.url,
        thumbnail: mediaItem.thumbnail_url || mediaItem.url,
        createdAt: mediaItem.created_at ? new Date(mediaItem.created_at) : new Date(),
        metadata: {
            location: mediaItem.location,
            device: mediaItem.device,
            fileName: mediaItem.file_name,
            fileType: mediaItem.file_type,
            fileSize: mediaItem.file_size
        }
    };
};

/**
 * Delete a media item from the backend
 * 
 * @param mediaId ID of the media item to delete
 * @param authToken Authentication token
 * @returns Response from the API
 */
export const deleteMedia = async (mediaId: string, authToken: string) => {
    try {
        console.log(`Deleting media with ID: ${mediaId}`);
        
        const response = await axios.delete(`${API_BASE_URL}/media/${mediaId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.data && response.data.status === true) {
            console.log('Media deleted successfully');
            return true;
        }
        
        console.error('Invalid response format from delete media API:', response.data);
        throw new Error(response.data?.message || 'Failed to delete media');
    } catch (error) {
        console.error('Error deleting media:', error);
        
        if (axios.isAxiosError(error)) {
            console.error('API error status:', error.response?.status);
            console.error('API error details:', error.response?.data);
            
            if (error.response?.status === 401 || error.response?.status === 403) {
                throw new Error('Authentication error. Please log in again.');
            }
            
            if (error.response?.status === 404) {
                console.warn('Media not found on server, may have been already deleted');
                return true; // Consider it deleted if not found
            }
        }
        
        throw error;
    }
};

/**
 * Handle API errors and improve error messages
 * @param error The axios error
 * @returns Formatted error message
 */
const handleApiError = (error: any): string => {
  if (axios.isAxiosError(error)) {
    // Network errors (like ECONNREFUSED)
    if (error.code === 'ERR_NETWORK') {
      console.error('Network error - API server may be down or not accessible');
      return 'Cannot connect to API server. Make sure it is running and accessible.';
    } 
    // CORS errors
    else if (error.code === 'ERR_NETWORK_ACCESS_DENIED' || 
             (error.message && error.message.includes('CORS'))) {
      return 'CORS error: The API server is not allowing requests from this origin.';
    }
    // Timeout errors
    else if (error.code === 'ECONNABORTED') {
      return 'Request timed out. The server may be overloaded or unresponsive.';
    }
    // HTTP errors
    else if (error.response) {
      if (error.response.status === 401 || error.response.status === 403) {
        return 'Authentication error. Please log in again.';
      } else if (error.response.status === 404) {
        return 'The requested resource was not found on the server.';
      } else if (error.response.status >= 500) {
        return `Server error (${error.response.status}). Please try again later.`;
      }
      return `API error: ${error.response.status} - ${error.response.statusText || 'Unknown error'}`;
    }
  }
  
  // Generic error handling
  return error instanceof Error ? error.message : 'Unknown API error';
}