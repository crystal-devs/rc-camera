// services/apis/guest-upload.api.ts

import { API_BASE_URL } from "@/lib/api-config";
import axios from "axios";

export const uploadGuestPhotos = async (
    shareToken: string,
    files: File[],
    guestInfo: {
        name?: string;
        email?: string;
        phone?: string;
    } = {},
    authToken?: string
) => {
    try {
        const formData = new FormData();
        
        // Add files
        files.forEach(file => {
            formData.append('files', file);
        });
        
        // Add guest info
        if (guestInfo.name) formData.append('guest_name', guestInfo.name);
        if (guestInfo.email) formData.append('guest_email', guestInfo.email);
        if (guestInfo.phone) formData.append('guest_phone', guestInfo.phone);
        
        // Add platform info
        formData.append('platform', 'web');
        
        const headers: Record<string, string> = {};
        
        // Add auth token if available
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        console.log('🔍 Uploading guest photos:', {
            shareToken: shareToken.substring(0, 8) + '...',
            fileCount: files.length,
            hasAuth: !!authToken,
            guestName: guestInfo.name || 'Anonymous'
        });
        
        const response = await axios.post(
            `${API_BASE_URL}/media/guest/${shareToken}/upload`,
            formData,
            {
                headers,
                timeout: 60000, // 60 seconds for uploads
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round(
                        (progressEvent.loaded * 100) / (progressEvent.total || 1)
                    );
                    console.log(`Upload progress: ${progress}%`);
                }
            }
        );
        
        console.log('✅ Upload response:', {
            status: response.data.status,
            message: response.data.message,
            successCount: response.data.data?.summary?.success,
            failedCount: response.data.data?.summary?.failed
        });
        
        return response.data;
        
    } catch (error) {
        console.error('❌ Guest upload error:', error);
        
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 403) {
                throw new Error('Uploads are not allowed for this event');
            } else if (error.response?.status === 404) {
                throw new Error('Event not found or invalid link');
            } else if (error.response?.status === 413) {
                throw new Error('Files are too large. Please choose smaller files.');
            }
        }
        
        throw new Error('Upload failed. Please try again.');
    }
};
