// services/apis/media.api.ts

import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';
import { MediaFetchOptions, MediaResponse } from '@/types/events';
import { Photo } from '@/types/PhotoGallery.types';

// Enhanced media response type with progressive loading support
export interface MediaItem {
    _id: string;
    id: string;
    album_id: string;
    event_id: string;
    url: string;
    thumbnail_url?: string;
    image_variants?: {
        small: { webp: { url: string }, jpeg: { url: string } };
        medium: { webp: { url: string }, jpeg: { url: string } };
        large: { webp: { url: string }, jpeg: { url: string } };
        original: { url: string };
    };
    approval?: {
        status: 'pending' | 'approved' | 'rejected' | 'hidden' | 'auto_approved';
        approved_at?: string;
        approved_by?: string;
        rejection_reason?: string;
    };
    processing?: {
        status: 'pending' | 'processing' | 'completed' | 'failed';
        thumbnails_generated: boolean;
        variants_generated?: boolean;
    };
    metadata?: {
        width?: number;
        height?: number;
        file_name?: string;
        file_type?: string;
        file_size?: number;
    };
    created_at: string;
    created_by: number;
    updated_at: string;
}

export interface MediaApiResponse {
    status: boolean;
    code: number;
    message: string;
    data: MediaItem[];
    pagination?: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
    other?: any;
}

export interface MediaApiResponse {
    status: boolean;
    code: number;
    message: string;
    data: MediaItem[];
    pagination?: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
    other?: any;
}

/**
 * FIXED: Main API function that returns the full response
 */
export const getEventMediaWithPagination = async (
    eventId: string,
    authToken: string,
    options: {
        albumId?: string;
        includeProcessing?: boolean;
        includePending?: boolean;
        page?: number;
        limit?: number;
        quality?: 'thumbnail' | 'display' | 'full';
        since?: string;
        status?: 'approved' | 'pending' | 'rejected' | 'hidden' | 'auto_approved';
        scrollType?: 'pagination' | 'infinite';
        cursor?: string;
    } = {}
): Promise<MediaApiResponse> => {
    try {
        console.log(`Fetching event media for eventId: ${eventId}, status: ${options.status}, options:`, options);

        const endpoint = options.albumId
            ? `${API_BASE_URL}/media/album/${options.albumId}`
            : `${API_BASE_URL}/media/event/${eventId}`;

        const params = new URLSearchParams();

        // Add all parameters
        if (options.includeProcessing) params.append('include_processing', 'true');
        if (options.includePending) params.append('include_pending', 'true');
        if (options.page) params.append('page', options.page.toString());
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.quality) params.append('quality', options.quality);
        if (options.since) params.append('since', options.since);
        if (options.status) params.append('status', options.status);
        if (options.scrollType) params.append('scroll_type', options.scrollType);
        if (options.cursor) params.append('cursor', options.cursor);

        console.log(`Calling API: ${endpoint}?${params}`);

        const response = await axios.get(`${endpoint}?${params}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
            timeout: 15000,
        });

        console.log('API Response:', response.status, response.data);

        if (response.data && response.data.status === true) {
            // Return the full response structure
            return response.data as MediaApiResponse;
        }

        throw new Error(response.data?.message || 'Failed to fetch event media');
    } catch (error) {
        console.error('Error fetching event media:', error);

        if (axios.isAxiosError(error)) {
            if (error.code === 'ERR_NETWORK') {
                throw new Error('Network error - API server may be down');
            }
            if (error.response?.status === 401 || error.response?.status === 403) {
                throw new Error('Authentication error. Please log in again.');
            }
            if (error.response?.status === 404) {
                console.log('No media found for event, returning empty response');
                return {
                    status: true,
                    code: 200,
                    message: 'No media found',
                    data: [],
                    pagination: {
                        page: 1,
                        limit: options.limit || 20,
                        totalCount: 0,
                        totalPages: 0,
                        hasNext: false,
                        hasPrev: false
                    }
                };
            }
            if (error.response?.status >= 500) {
                throw new Error('Server error. Please try again later.');
            }
        }

        throw error;
    }
};

/**
 * Fetch event media with smart caching and progressive loading
 */
export const getEventMedia = async (
    eventId: string,
    authToken: string,
    options: {
        albumId?: string;
        includeProcessing?: boolean;
        includePending?: boolean;
        page?: number;
        limit?: number;
        quality?: 'thumbnail' | 'display' | 'full';
        since?: string;
        status?: 'approved' | 'pending' | 'rejected' | 'hidden' | 'auto_approved';
        scrollType?: 'pagination' | 'infinite';
        cursor?: string;
    } = {}
): Promise<MediaItem[]> => {
    const response = await getEventMediaWithPagination(eventId, authToken, options);
    return response.data || [];
};

export const updateMediaStatus = async (
    mediaId: string,
    status: 'approved' | 'pending' | 'rejected' | 'hidden' | 'auto_approved',
    authToken: string,
    options: {
        reason?: string;
        hideReason?: string;
    } = {}
): Promise<any> => {
    try {
        const endpoint = `${API_BASE_URL}/media/${mediaId}/status`;

        const response = await axios.patch(endpoint, {
            status,
            reason: options.reason,
            hide_reason: options.hideReason
        }, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000,
        });

        if (response.data && response.data.status === true) {
            return response.data.data;
        }

        throw new Error(response.data?.message || 'Failed to update media status');
    } catch (error) {
        console.error('Error updating media status:', error);
        throw error;
    }
};

// NEW: Bulk update media status
export const bulkUpdateMediaStatus = async (
    eventId: string,
    mediaIds: string[],
    status: 'approved' | 'pending' | 'rejected' | 'hidden' | 'auto_approved',
    authToken: string,
    options: {
        reason?: string;
        hideReason?: string;
    } = {}
): Promise<any> => {
    try {
        const endpoint = `${API_BASE_URL}/media/event/${eventId}/bulk-status`;

        const response = await axios.patch(endpoint, {
            media_ids: mediaIds,
            status,
            reason: options.reason,
            hide_reason: options.hideReason
        }, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000,
        });

        if (response.data && response.data.status === true) {
            return response.data.data;
        }

        throw new Error(response.data?.message || 'Failed to bulk update media status');
    } catch (error) {
        console.error('Error bulk updating media status:', error);
        throw error;
    }
};


export const getEventMediaCounts = async (
    eventId: string,
    authToken: string
): Promise<{
    approved: number;
    pending: number;
    rejected: number;
    hidden: number;
    total: number;
} | null> => {
    try {
        const endpoint = `${API_BASE_URL}/media/event/${eventId}/counts`;

        console.log(`Fetching media counts for eventId: ${eventId}`);

        const response = await axios.get(endpoint, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
            timeout: 10000,
        });

        if (response.data && response.data.status === true) {
            return response.data.data;
        }

        throw new Error(response.data?.message || 'Failed to fetch media counts');
    } catch (error) {
        console.error('Error fetching media counts:', error);
        return null;
    }
};

/**
 * Guest access functions with progressive loading
 */
export const getEventMediaWithGuestToken = async (
    eventId: string,
    authToken?: string | null,
    options: Partial<MediaFetchOptions> = {}
): Promise<MediaResponse> => {
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Add auth token if available
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        // Build query parameters
        const params = new URLSearchParams();
        if (options.page) params.append('page', options.page.toString());
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.quality) params.append('quality', options.quality);
        if (options.scroll_type) params.append('scroll_type', options.scroll_type);

        console.log(`Fetching guest event media: ${eventId} with params:`, Object.fromEntries(params));

        const url = `${API_BASE_URL}/media/guest/${eventId}${params.toString() ? `?${params.toString()}` : ''}`;

        const response = await axios.get(url, {
            timeout: 15000,
            headers
        });

        console.log('API Response:', {
            status: response.status,
            dataKeys: Object.keys(response.data || {}),
            itemCount: response.data?.data?.length || 0,
            pagination: response.data?.pagination
        });

        if (response.data && (response.data.status === true || response.data.success)) {
            const mediaItems = response.data.data || [];

            return {
                data: mediaItems,
                total: response.data.pagination?.total || response.data.total,
                hasMore: response.data.pagination?.hasMore || response.data.hasMore,
                nextCursor: response.data.nextCursor
            };
        }

        throw new Error(response.data?.message || 'Failed to fetch event media');
    } catch (error) {
        console.error('Error fetching event media with guest token:', error);

        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                throw new Error('Share link has expired or is no longer valid');
            }
        }

        throw error;
    }
};


export const getAlbumMediaWithGuestToken = async (
    albumId: string,
    guestToken: string,
    options: {
        page?: number;
        limit?: number;
        quality?: 'thumbnail' | 'display' | 'full';
    } = {}
): Promise<MediaItem[]> => {
    try {
        const cacheKey = `guest_album_${albumId}_${guestToken}`;

        const cached = imageCache.get(cacheKey);
        if (cached && !options.page) {
            console.log(`Using cached guest album media (${cached.length} items)`);
            return cached;
        }

        console.log(`Fetching guest album media: ${albumId}`);

        const params = new URLSearchParams({ token: guestToken });
        if (options.page) params.append('page', options.page.toString());
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.quality) params.append('quality', options.quality);

        const response = await axios.get(`${API_BASE_URL}/media/album/${albumId}/guest?${params}`, {
            timeout: 15000
        });

        if (response.data && (response.data.status === true || response.data.success)) {
            const mediaItems = response.data.data || [];

            if (!options.page) {
                imageCache.set(cacheKey, mediaItems);
            }

            console.log(`Fetched ${mediaItems.length} media items from album as guest`);
            return mediaItems;
        }

        throw new Error(response.data?.message || 'Failed to fetch album media');
    } catch (error) {
        console.error('Error fetching album media with guest token:', error);

        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                throw new Error('Share link has expired or is no longer valid');
            }
        }

        throw error;
    }
};

/**
 * Moderate media items (approve/reject)
 */
export const moderateMedia = async (
    mediaId: string,
    action: 'approve' | 'reject',
    authToken: string,
    reason?: string
): Promise<boolean> => {
    try {
        console.log(`${action === 'approve' ? 'Approving' : 'Rejecting'} media: ${mediaId}`);

        const response = await axios.post(`${API_BASE_URL}/media/${mediaId}/moderate`, {
            action,
            reason
        }, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.data && response.data.status === true) {
            // Clear relevant caches to force refresh
            imageCache.clear();
            return true;
        }

        throw new Error(response.data?.message || `Failed to ${action} media`);
    } catch (error) {
        console.error(`Error ${action === 'approve' ? 'approving' : 'rejecting'} media:`, error);

        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                throw new Error('You do not have permission to moderate content.');
            }
        }

        throw error;
    }
};

/**
 * Get pending media for moderation
 */
export const getPendingMedia = async (
    eventId: string,
    authToken: string,
    options: {
        page?: number;
        limit?: number;
    } = {}
): Promise<MediaItem[]> => {
    try {
        console.log(`Fetching pending media for event: ${eventId}`);

        const params = new URLSearchParams();
        if (options.page) params.append('page', options.page.toString());
        if (options.limit) params.append('limit', options.limit.toString());

        const response = await axios.get(`${API_BASE_URL}/media/event/${eventId}/pending?${params}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.data && response.data.status === true) {
            return response.data.data || [];
        }

        throw new Error(response.data?.message || 'Failed to fetch pending media');
    } catch (error) {
        console.error('Error fetching pending media:', error);

        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                throw new Error('You do not have permission to view pending content.');
            }
        }

        throw error;
    }
};

/**
 * Upload cover image with compression options
 */
export const uploadCoverImage = async (
    file: File,
    folder: string = 'covers',
    authToken: string,
    options: {
        compressionQuality?: 'auto' | 'high' | 'medium' | 'low';
        maxWidth?: number;
        maxHeight?: number;
    } = {}
): Promise<string> => {
    try {
        if (!file || !(file instanceof File)) {
            throw new Error('Invalid file object provided');
        }

        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', folder);

        if (options.compressionQuality) {
            formData.append('compression_quality', options.compressionQuality);
        }
        if (options.maxWidth) {
            formData.append('max_width', options.maxWidth.toString());
        }
        if (options.maxHeight) {
            formData.append('max_height', options.maxHeight.toString());
        }

        console.log('Uploading cover image with options:', options);

        const response = await axios.post(`${API_BASE_URL}/media/upload-cover`, formData, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
            timeout: 60000
        });

        if (response.data && response.data.status === true && response.data.data?.url) {
            return response.data.data.url;
        }

        throw new Error('Invalid response from cover image upload API');
    } catch (error) {
        console.error('Error uploading cover image:', error);

        if (axios.isAxiosError(error)) {
            if (error.response?.status === 413) {
                throw new Error('Image file is too large. Please use a smaller file.');
            }
            if (error.response?.status === 415) {
                throw new Error('Unsupported file type. Please use JPEG, PNG, or WebP format.');
            }
            if (error.response?.status === 401) {
                throw new Error('Authentication error. Please log in again.');
            }
        }

        throw error;
    }
};

/**
 * Delete a media item
 */
export const deleteMedia = async (mediaId: string, authToken: string): Promise<boolean> => {
    try {
        console.log(`Deleting media: ${mediaId}`);

        const response = await axios.delete(`${API_BASE_URL}/media/${mediaId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.data && response.data.status === true) {
            // Clear caches to force refresh
            imageCache.clear();
            return true;
        }

        throw new Error(response.data?.message || 'Failed to delete media');
    } catch (error) {
        console.error('Error deleting media:', error);

        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                throw new Error('You do not have permission to delete this photo.');
            }
            if (error.response?.status === 404) {
                console.warn('Media not found on server, may have been already deleted');
                return true;
            }
        }

        throw error;
    }
};

/**
 * Get media processing status
 */
export const getMediaProcessingStatus = async (
    mediaId: string,
    authToken: string
): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    thumbnails_generated?: boolean;
    compressed_versions?: Array<{
        quality: string;
        url: string;
        size_mb: number;
    }>;
}> => {
    try {
        const response = await axios.get(`${API_BASE_URL}/media/${mediaId}/processing`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.data && response.data.status === true) {
            return response.data.data;
        }

        throw new Error('Failed to get processing status');
    } catch (error) {
        console.error('Error getting processing status:', error);
        throw error;
    }
};

/**
 * Batch operations for better performance
 */
export const batchApproveMedia = async (
    mediaIds: string[],
    authToken: string
): Promise<{ successful: string[]; failed: string[] }> => {
    try {
        const response = await axios.post(`${API_BASE_URL}/media/batch/approve`, {
            media_ids: mediaIds
        }, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.data && response.data.status === true) {
            imageCache.clear(); // Clear cache after batch operation
            return response.data.data;
        }

        throw new Error('Failed to batch approve media');
    } catch (error) {
        console.error('Error in batch approve:', error);
        throw error;
    }
};

export const batchRejectMedia = async (
    mediaIds: string[],
    reason: string,
    authToken: string
): Promise<{ successful: string[]; failed: string[] }> => {
    try {
        const response = await axios.post(`${API_BASE_URL}/media/batch/reject`, {
            media_ids: mediaIds,
            reason
        }, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.data && response.data.status === true) {
            imageCache.clear();
            return response.data.data;
        }

        throw new Error('Failed to batch reject media');
    } catch (error) {
        console.error('Error in batch reject:', error);
        throw error;
    }
};

/**
 * Clear all caches (useful for logout or manual refresh)
 */
export const clearMediaCache = () => {
    imageCache.clear();
    console.log('Media cache cleared');
};

/**
 * Get cache statistics for debugging
 */
export const getCacheStats = () => {
    return {
        size: imageCache['cache'].size,
        keys: Array.from(imageCache['cache'].keys())
    };
};


// Progressive loading cache
class ImageCache {
    private cache = new Map<string, {
        data: MediaItem[];
        timestamp: number;
        lastModified?: string;
    }>();

    private readonly CACHE_DURATION = 30000; // 30 seconds

    set(key: string, data: MediaItem[], lastModified?: string) {
        this.cache.set(key, {
            data: [...data],
            timestamp: Date.now(),
            lastModified
        });
    }

    get(key: string): MediaItem[] | null {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const age = Date.now() - cached.timestamp;
        if (age > this.CACHE_DURATION) {
            this.cache.delete(key);
            return null;
        }

        return [...cached.data];
    }

    getLastModified(key: string): string | undefined {
        return this.cache.get(key)?.lastModified;
    }

    invalidate(key: string) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }
}

const imageCache = new ImageCache();

/**
 * Upload media with progressive processing and approval workflow
 */
export const uploadAlbumMedia = async (
    file: File,
    albumId: string | null,
    authToken: string,
    eventId?: string,
    options: {
        compressionQuality?: 'auto' | 'high' | 'medium' | 'low';
        generateThumbnails?: boolean;
        autoApprove?: boolean;
    } = {}
) => {
    try {
        // Enhanced validation
        if (!file || !(file instanceof File)) {
            throw new Error('Invalid file object provided');
        }

        if (!authToken) {
            throw new Error('Authentication required');
        }

        if (!eventId) {
            throw new Error('Event ID is required for uploading photos');
        }

        // Validate file type more strictly
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
        if (!allowedTypes.includes(file.type.toLowerCase())) {
            throw new Error(`File type ${file.type} not supported. Allowed types: JPEG, PNG, WebP, HEIC`);
        }

        // Check file size based on new schema limits
        const maxSize = 100 * 1024 * 1024; // 100MB from schema
        if (file.size > maxSize) {
            throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds max size of 100MB.`);
        }

        // Create enhanced form data
        const formData = new FormData();
        formData.append('image', file);

        if (albumId) {
            formData.append('album_id', albumId);
        }
        formData.append('event_id', eventId);

        // Add processing options
        if (options.compressionQuality) {
            formData.append('compression_quality', options.compressionQuality);
        }
        if (options.generateThumbnails !== undefined) {
            formData.append('generate_thumbnails', options.generateThumbnails.toString());
        }
        if (options.autoApprove !== undefined) {
            formData.append('auto_approve', options.autoApprove.toString());
        }

        // Add metadata for better server-side processing
        formData.append('file_size', file.size.toString());
        formData.append('file_type', file.type);
        formData.append('file_name', file.name);
        formData.append('client_timestamp', new Date().toISOString());

        console.log('Uploading media with enhanced options:', {
            albumId: albumId || 'Will use default album',
            eventId,
            fileInfo: {
                name: file.name,
                size: `${(file.size / 1024).toFixed(2)} KB`,
                type: file.type
            },
            options
        });

        // Upload with progress tracking and retry logic
        const uploadResponse = await uploadWithRetry(formData, authToken);

        console.log('Enhanced media upload response:', uploadResponse.data);

        if (uploadResponse.data && uploadResponse.data.status === true) {
            // Invalidate relevant caches
            const eventCacheKey = `event_${eventId}`;
            const albumCacheKey = albumId ? `album_${albumId}` : null;

            imageCache.invalidate(eventCacheKey);
            if (albumCacheKey) {
                imageCache.invalidate(albumCacheKey);
            }

            return uploadResponse.data.data;
        }

        throw new Error(uploadResponse.data?.message || 'Invalid response from media upload API');
    } catch (error) {
        console.error('Error uploading album media:', error);

        if (axios.isAxiosError(error)) {
            return handleUploadError(error);
        }

        throw new Error(error instanceof Error ? error.message : 'Failed to upload image');
    }
};

/**
 * Upload with retry logic for better reliability
 */
async function uploadWithRetry(formData: FormData, authToken: string, maxRetries = 2) {
    let retries = 0;

    while (retries <= maxRetries) {
        try {
            if (retries > 0) {
                console.log(`Retry attempt ${retries}/${maxRetries}...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            }

            return await axios.post(`${API_BASE_URL}/media/upload`, formData, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
                timeout: 120000, // 2 minutes for large files
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                    console.log(`Upload progress: ${percentCompleted}%`);
                }
            });
        } catch (error) {
            console.error(`Upload error (attempt ${retries + 1}/${maxRetries + 1}):`, error);

            // Only retry on network errors or 500 errors
            if (axios.isAxiosError(error) &&
                (error.code === 'ECONNABORTED' ||
                    error.code === 'ECONNRESET' ||
                    error.response?.status === 500)) {
                retries++;
                if (retries <= maxRetries) {
                    continue;
                }
            }

            throw error;
        }
    }

    throw new Error('Upload failed after all retry attempts');
}


export const uploadMultipleMedia = async (
    files: File[],
    eventId: string,
    albumId: string | null,
    authToken: string
) => {
    try {
        const formData = new FormData();

        // Add all files with 'images' field name (matches backend upload.array('images', 10))
        files.forEach((file, index) => {
            formData.append('images', file);
            console.log(`📎 Added file ${index + 1}: ${file.name} (${file.size} bytes)`);
        });

        // Add required fields
        formData.append('event_id', eventId);
        if (albumId) {
            formData.append('album_id', albumId);
        }

        // Debug FormData contents
        console.log('📋 FormData contents:');
        for (let [key, value] of formData.entries()) {
            if (value instanceof File) {
                console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
            } else {
                console.log(`  ${key}: ${value}`);
            }
        }

        const headers: Record<string, string> = {
            'Authorization': `Bearer ${authToken}`,
            // Don't set Content-Type - let browser set it with boundary
        };

        console.log('🔍 Multiple upload request:', {
            url: `${API_BASE_URL}/media/upload/multiple`,
            fileCount: files.length,
            eventId,
            albumId,
            formDataKeys: Array.from(formData.keys())
        });

        const response = await axios.post(
            `${API_BASE_URL}/media/upload/multiple`,
            formData,
            {
                headers,
                timeout: 120000, // 2 minutes for multiple files
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        );
                        console.log(`📊 Upload progress: ${percentCompleted}%`);
                    }
                }
            }
        );

        console.log('✅ Multiple upload response:', {
            status: response.data.status,
            message: response.data.message,
            summary: response.data.data?.summary
        });

        return response.data;

    } catch (error: any) {
        console.error('❌ Multiple upload error:', error);

        if (axios.isAxiosError(error)) {
            if (error.response?.status === 400) {
                const errorMsg = error.response.data?.message || 'Bad request';
                throw new Error(`Upload failed: ${errorMsg}`);
            } else if (error.response?.status === 403) {
                throw new Error('You do not have permission to upload to this event');
            } else if (error.response?.status === 413) {
                throw new Error('Files are too large. Please choose smaller files.');
            } else if (error.response?.status) {
                throw new Error(`Server error (${error.response.status}): ${error.response.data?.message || error.response.statusText}`);
            }
        }

        throw new Error('Upload failed. Please try again.');
    }
};

/**
 * Enhanced error handling for uploads
 */
function handleUploadError(error: any) {
    console.error('API error details:', {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
    });

    if (error.response?.status === 413) {
        throw new Error('File too large. Please use a smaller image or enable compression.');
    }

    if (error.response?.status === 415) {
        throw new Error('Unsupported file type. Please use JPEG, PNG, WebP, or HEIC format.');
    }

    if (error.response?.status === 401) {
        throw new Error('Authentication expired. Please log in again.');
    }

    if (error.response?.status === 403) {
        throw new Error('You do not have permission to upload to this album.');
    }

    if (error.response?.status === 400) {
        const message = error.response?.data?.message || 'Invalid upload request';
        throw new Error(`Upload failed: ${message}`);
    }

    if (error.response?.status === 500) {
        if (error.response?.data?.error?.message?.includes('processing')) {
            throw new Error('Server is busy processing images. Please try again in a moment.');
        }
        throw new Error('Server error. Please try again later.');
    }

    throw new Error(error.response?.data?.message || 'Upload failed. Please try again.');
}

/**
 * Fetch album media with smart caching and progressive loading
 */
export const getAlbumMedia = async (
    albumId: string,
    authToken: string,
    options: {
        includeProcessing?: boolean;
        includePending?: boolean;
        page?: number;
        limit?: number;
        quality?: 'thumbnail' | 'display' | 'full';
    } = {}
): Promise<MediaItem[]> => {
    try {
        const cacheKey = `album_${albumId}`;

        // Check cache first
        const cached = imageCache.get(cacheKey);
        if (cached && !options.includeProcessing && !options.includePending) {
            console.log(`Using cached album media (${cached.length} items)`);
            return cached;
        }

        console.log(`Fetching album media: ${albumId}`);

        const params = new URLSearchParams();
        if (options.includeProcessing) params.append('include_processing', 'true');
        if (options.includePending) params.append('include_pending', 'true');
        if (options.page) params.append('page', options.page.toString());
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.quality) params.append('quality', options.quality);

        const response = await axios.get(`${API_BASE_URL}/media/album/${albumId}?${params}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'If-Modified-Since': imageCache.getLastModified(cacheKey) || ''
            },
            timeout: 15000
        });

        if (response.status === 304) {
            // Not modified, use cache
            const cached = imageCache.get(cacheKey);
            return cached || [];
        }

        if (response.data && response.data.status === true) {
            const mediaItems = response.data.data || [];

            // Cache the results
            const lastModified = response.headers['last-modified'];
            imageCache.set(cacheKey, mediaItems, lastModified);

            console.log(`Fetched ${mediaItems.length} media items for album`);
            return mediaItems;
        }

        throw new Error(response.data?.message || 'Failed to fetch album media');
    } catch (error) {
        console.error('Error fetching album media:', error);

        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                throw new Error('Authentication error. Please log in again.');
            }
            if (error.response?.status === 404) {
                return []; // Album has no photos yet
            }
        }

        throw error;
    }
};

export const transformMediaToPhoto = (mediaItem: any): Photo => {
    const progressiveUrls = {
        placeholder: mediaItem.responsive_urls?.thumbnail || mediaItem.url,
        thumbnail: mediaItem.responsive_urls?.thumbnail || mediaItem.url,
        display: mediaItem.responsive_urls?.medium || mediaItem.url,
        full: mediaItem.responsive_urls?.large || mediaItem.url,
        original: mediaItem.responsive_urls?.original || mediaItem.url
    };

    return {
        id: mediaItem._id || mediaItem.id,
        albumId: mediaItem.album_id,
        eventId: mediaItem.event_id,
        takenBy: mediaItem.uploader_display_name || mediaItem.created_by,
        imageUrl: mediaItem.responsive_urls?.original || mediaItem.url,
        thumbnail: mediaItem.responsive_urls?.thumbnail || mediaItem.url,
        createdAt: new Date(mediaItem.created_at),

        approval: {
            status: mediaItem.approval_status || mediaItem.approval?.status,
            approved_at: mediaItem.approval?.approved_at ? new Date(mediaItem.approval.approved_at) : undefined,
            approved_by: mediaItem.approval?.approved_by,
            rejection_reason: mediaItem.approval?.rejection_reason
        },

        processing: {
            status: mediaItem.processing_status || mediaItem.processing?.status,
            thumbnails_generated: mediaItem.has_variants || mediaItem.processing?.thumbnails_generated,
            variants_generated: mediaItem.has_variants || mediaItem.processing?.variants_generated
        },

        progressiveUrls,

        metadata: {
            width: mediaItem.dimensions?.width || mediaItem.metadata?.width,
            height: mediaItem.dimensions?.height || mediaItem.metadata?.height,
            fileName: mediaItem.original_filename || mediaItem.metadata?.file_name,
            fileType: mediaItem.format || mediaItem.metadata?.file_type,
            fileSize: mediaItem.size_mb || mediaItem.metadata?.file_size
        },

        stats: mediaItem.stats || {
            views: 0,
            downloads: 0,
            shares: 0,
            likes: 0
        }
    };
};