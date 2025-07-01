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