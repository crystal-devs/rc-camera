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
        // Create form data for upload
        const formData = new FormData();

        // IMPORTANT: Use 'image' as the field name to match Multer config
        formData.append('image', file);
        formData.append('folder', folder);

        const response = await axios.post(`${API_BASE_URL}/media/upload-cover`, formData, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'multipart/form-data'
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