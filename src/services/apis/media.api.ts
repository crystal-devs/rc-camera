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
 * Upload media to an album
 * 
 * @param file File to upload
 * @param albumId ID of the album
 * @param authToken Authentication token
 * @returns Response from the API
 */
export const uploadAlbumMedia = async (
    file: File,
    albumId: string,
    authToken: string
) => {
    try {
        // Create form data for upload
        const formData = new FormData();

        // IMPORTANT: Use 'image' as the field name to match Multer config
        formData.append('image', file);
        formData.append('album_id', albumId);

        const response = await axios.post(`${API_BASE_URL}/media/upload`, formData, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'multipart/form-data'
            }
        });

        console.log('Album media upload response:', response.data);

        if (response.data && response.data.status === true) {
            return response.data.data;
        }

        throw new Error('Invalid response from media upload API');
    } catch (error) {
        console.error('Error uploading album media:', error);
        if (axios.isAxiosError(error) && error.response) {
            console.error('API error details:', error.response.data);
        }
        throw error;
    }
};