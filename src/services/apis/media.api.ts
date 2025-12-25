// services/apis/media.api.ts

import { apiClient } from '@/lib/api-client';
import { API_ROUTES, buildApiUrl } from '@/lib/api-routes';
import { MediaFetchOptions } from '@/types/events';
import { Photo } from '@/types/PhotoGallery.types';
import axios from 'axios';

// Local MediaResponse for this file
export interface MediaResponse {
    data: MediaItem[];
    total?: number;
    hasMore?: boolean;
    nextCursor?: string;
    pagination?: any;
    other?: any;
}

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
        started_at?: string;
        completed_at?: string;
        processing_time_ms?: number;
        thumbnails_generated?: boolean;
        variants_generated?: boolean;
        variants_count?: number;
        error_message?: string;
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
        quality?: 'small' | 'medium' | 'large' | 'original';
        since?: string;
        status?: 'approved' | 'pending' | 'rejected' | 'hidden' | 'auto_approved';
        scrollType?: 'pagination' | 'infinite';
        cursor?: string;
    } = {}
): Promise<MediaApiResponse> => {
    try {
        console.log(`Fetching event media for eventId: ${eventId}, status: ${options.status}, options:`, options);

        const endpoint = options.albumId
            ? API_ROUTES.MEDIA.GET_ALBUM(options.albumId)
            : API_ROUTES.MEDIA.GET_EVENT(eventId);

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

        const response = await apiClient.get(endpoint, {
            params,
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
            timeout: 15000,
        });

        console.log('Media API Response Status:', response.status);
        console.log('Media API Response Headers:', response.headers);

        console.log('API Response:', response.status, response.data);
        console.log('Auth token being used:', authToken ? `${authToken.substring(0, 20)}...` : 'No token');

        if (response.data && response.data.status === true) {
            // Return the full response structure
            return response.data as MediaApiResponse;
        }

        throw new Error(response.data?.message || 'Failed to fetch event media');
    } catch (error: any) {
        console.error('Error fetching event media:', error);

        if (error?.code === 'ERR_NETWORK') {
            throw new Error('Network error - API server may be down');
        }
        if (error?.response?.status === 401 || error?.response?.status === 403) {
            throw new Error('Authentication error. Please log in again.');
        }
        if (error?.response?.status === 404) {
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
        if (error?.response?.status && error.response.status >= 500) {
            throw new Error('Server error. Please try again later.');
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
        quality?: 'small' | 'medium' | 'large' | 'original';
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
        const response = await apiClient.patch(API_ROUTES.MEDIA.UPDATE_STATUS(mediaId), {
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
export async function bulkUpdateMediaStatus(
    eventId: string,
    mediaIds: string[],
    status: 'approved' | 'pending' | 'rejected' | 'hidden',
    token: string,
    options: {
        reason?: string;
        hideReason?: string;
    } = {}
): Promise<any> {
    console.log('🔄 Bulk updating media status via dedicated endpoint:', {
        eventId,
        count: mediaIds.length,
        status,
        reason: options.reason,
        endpoint: 'bulk-operations'
    });

    try {
        const response = await apiClient.patch(API_ROUTES.MEDIA.BULK_UPDATE(eventId), {
            media_ids: mediaIds, // Match your backend field name
            status,
            reason: options.reason,
            hide_reason: options.hideReason
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000, // 30 seconds for bulk operations
        });

        console.log('✅ Bulk status update completed via dedicated endpoint:', {
            successful: response.data?.data?.modifiedCount || mediaIds.length,
            requested: response.data?.data?.requestedCount || mediaIds.length,
            endpoint: 'bulk-operations'
        });

        return response.data;
    } catch (error: any) {
        console.error('❌ Bulk status update failed:', error);
        if (error?.response?.status === 429) {
            const retryAfter = error.response.headers?.['retry-after'] || '120';
            throw new Error(`Too many bulk operations. Please wait ${retryAfter} seconds and try again.`);
        }
        throw error;
    }
}

export async function bulkApproveMedia(
    eventId: string,
    mediaIds: string[],
    token: string,
    reason?: string
): Promise<any> {
    try {
        const response = await apiClient.patch(API_ROUTES.MEDIA.BULK_APPROVE(eventId), {
            media_ids: mediaIds,
            reason
        });

        return response.data;
    } catch (error) {
        console.error('❌ Bulk approve failed:', error);
        throw error;
    }
}

export async function bulkRejectMedia(
    eventId: string,
    mediaIds: string[],
    token: string,
    reason?: string
): Promise<any> {
    try {
        const response = await apiClient.patch(API_ROUTES.MEDIA.BULK_REJECT(eventId), {
            media_ids: mediaIds,
            reason
        });

        return response.data;
    } catch (error) {
        console.error('❌ Bulk reject failed:', error);
        throw error;
    }
}

export async function bulkHideMedia(
    eventId: string,
    mediaIds: string[],
    token: string,
    reason?: string
): Promise<any> {
    try {
        const response = await apiClient.patch(API_ROUTES.MEDIA.BULK_HIDE(eventId), {
            media_ids: mediaIds,
            reason
        });

        return response.data;
    } catch (error) {
        console.error('❌ Bulk hide failed:', error);
        throw error;
    }
}


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
        // const endpoint = `${API_BASE_URL}/media/event/${eventId}/counts`;

        // console.log(`Fetching media counts for eventId: ${eventId}`);

        // const response = await axios.get(endpoint, {
        //     headers: {
        //         'Authorization': `Bearer ${authToken}`,
        //     },
        //     timeout: 10000,
        // });

        // if (response.data && response.data.status === true) {
        //     return response.data.data;
        // }

        // throw new Error(response.data?.message || 'Failed to fetch media counts');
        return null;
    } catch (error) {
        console.error('Error fetching media counts:', error);
        return null;
    }
};

/**
 * Guest access functions with progressive loading
 */
export const getEventMediaWithGuestToken = async (
    shareToken: string,
    authToken?: string | null,
    options: Partial<MediaFetchOptions> = {}
): Promise<MediaResponse> => {
    try {
        // Input validation
        if (!shareToken) {
            throw new Error('Share token is required');
        }

        // Build query parameters with defaults
        const params = new URLSearchParams();
        if (options.page) params.append('page', options.page.toString());
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.quality) params.append('quality', options.quality);
        if (options.scroll_type) params.append('scrollType', options.scroll_type); // Fixed param name

        console.log(`🔗 Fetching guest event media: ${shareToken.substring(0, 8)}... with params:`, Object.fromEntries(params));

        const response = await apiClient.get(API_ROUTES.MEDIA.GUEST_ACCESS(shareToken), {
            params,
            timeout: 15000,
            validateStatus: (status: number) => status < 500 // Accept 4xx errors to handle them properly
        });

        console.log('📦 API Response:', {
            status: response.status,
            dataKeys: response.data ? Object.keys(response.data) : [],
            hasData: !!response.data?.data,
            itemCount: response.data?.data?.length || 0,
            apiStatus: response.data?.status,
            apiSuccess: (response.data as any)?.success,
            pagination: (response.data as any)?.pagination,
            other: response.data?.other
        });

        // Handle different HTTP status codes
        if (response.status >= 400) {
            const errorMessage = response.data?.message || response.data?.error?.message || `HTTP ${response.status}`;

            if (response.status === 401 || response.status === 403) {
                throw new Error('Share link has expired or is no longer valid');
            } else if (response.status === 404) {
                throw new Error('Event not found or share link is invalid');
            } else {
                throw new Error(errorMessage);
            }
        }

        // Check API response structure
        if (!response.data) {
            throw new Error('No response data received');
        }

        // Handle different API response formats
        const isSuccessful = response.data.status === true ||
            (response.data as any).success === true ||
            response.status === 200;

        if (!isSuccessful) {
            const errorMessage = response.data.message ||
                (response.data as any).error?.message ||
                'API request was not successful';
            throw new Error(errorMessage);
        }

        const mediaItems = response.data.data || [];

        // Enhanced response structure to handle multiple pagination formats
        const result: MediaResponse = {
            data: mediaItems,
            // Try multiple sources for total count
            total: (response.data as any).pagination?.total ||
                (response.data as any).pagination?.totalCount ||
                (response.data as any).total ||
                (response.data as any).other?.pagination?.totalCount ||
                mediaItems.length,

            // Try multiple sources for hasMore
            hasMore: (response.data as any).pagination?.hasMore ||
                (response.data as any).hasMore ||
                (response.data as any).pagination?.hasNext ||
                (response.data as any).other?.pagination?.hasNext ||
                false,

            nextCursor: (response.data as any).nextCursor,

            // Preserve original pagination structure
            pagination: (response.data as any).pagination,
            other: (response.data as any).other
        };

        console.log('✅ Processed API response:', {
            dataCount: result.data.length,
            total: result.total,
            hasMore: result.hasMore,
            hasPagination: !!result.pagination,
            hasOther: !!result.other
        });

        return result;

    } catch (error) {
        console.error('❌ Error fetching event media with guest token:', {
            shareToken: shareToken.substring(0, 8) + '...',
            error: error instanceof Error ? error.message : String(error),
            options
        });

        // Enhanced error handling
        if ((error as any)?.code === 'ECONNABORTED') {
            throw new Error('Request timeout - please check your connection');
        }

        if ((error as any)?.response?.status === 401 || (error as any)?.response?.status === 403) {
            throw new Error('Share link has expired or is no longer valid');
        }

        if ((error as any)?.response?.status === 404) {
            throw new Error('Event not found or share link is invalid');
        }

        if ((error as any)?.response?.status && (error as any).response.status >= 500) {
            throw new Error('Server error - please try again later');
        }

        // Use response error message if available
        const responseMessage = (error as any)?.response?.data?.message ||
            (error as any)?.response?.data?.error?.message;
        if (responseMessage) {
            throw new Error(responseMessage);
        }

        // Re-throw the error if it's already a custom error
        if (error instanceof Error) {
            throw error;
        }

        // Generic fallback error
        throw new Error('Failed to fetch event media - please try again');
    }
};


export const getAlbumMediaWithGuestToken = async (
    albumId: string,
    guestToken: string,
    options: {
        page?: number;
        limit?: number;
        quality?: 'small' | 'medium' | 'large' | 'original';
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

        const response = await apiClient.get(API_ROUTES.MEDIA.GUEST_ALBUM(albumId), {
            params,
            timeout: 15000
        });

        if (response.data && (response.data.status === true || (response.data as any).success)) {
            const mediaItems = response.data.data || [];

            if (!options.page) {
                imageCache.set(cacheKey, mediaItems);
            }

            console.log(`Fetched ${mediaItems.length} media items from album as guest`);
            return mediaItems;
        }

        throw new Error(response.data?.message || 'Failed to fetch album media');
    } catch (error: any) {
        console.error('Error fetching album media with guest token:', error);

        if (error?.response?.status === 401 || error?.response?.status === 403) {
            throw new Error('Share link has expired or is no longer valid');
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

        const response = await apiClient.post(API_ROUTES.MEDIA.GET_BY_ID(mediaId) + '/moderate', {
            action,
            reason
        });

        if (response.data && response.data.status === true) {
            // Clear relevant caches to force refresh
            imageCache.clear();
            return true;
        }

        throw new Error(response.data?.message || `Failed to ${action} media`);
    } catch (error: any) {
        console.error(`Error ${action === 'approve' ? 'approving' : 'rejecting'} media:`, error);

        if (error?.response?.status === 401 || error?.response?.status === 403) {
            throw new Error('You do not have permission to moderate content.');
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

        const response = await apiClient.get(API_ROUTES.MEDIA.GET_EVENT(eventId) + '/pending', {
            params
        });

        if (response.data && response.data.status === true) {
            return response.data.data || [];
        }

        throw new Error(response.data?.message || 'Failed to fetch pending media');
    } catch (error: any) {
        console.error('Error fetching pending media:', error);

        if (error?.response?.status === 401 || error?.response?.status === 403) {
            throw new Error('You do not have permission to view pending content.');
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

        const response = await apiClient.post(API_ROUTES.MEDIA.UPLOAD_COVER, formData, {
            timeout: 60000
        });

        if (response.data && response.data.status === true && response.data.data?.url) {
            return response.data.data.url;
        }

        throw new Error('Invalid response from cover image upload API');
    } catch (error: any) {
        console.error('Error uploading cover image:', error);

        if (error?.response?.status === 413) {
            throw new Error('Image file is too large. Please use a smaller file.');
        }
        if (error?.response?.status === 415) {
            throw new Error('Unsupported file type. Please use JPEG, PNG, or WebP format.');
        }
        if (error?.response?.status === 401) {
            throw new Error('Authentication error. Please log in again.');
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

        const response = await apiClient.delete(API_ROUTES.MEDIA.GET_BY_ID(mediaId));

        if (response.data && response.data.status === true) {
            // Clear caches to force refresh
            imageCache.clear();
            return true;
        }

        throw new Error(response.data?.message || 'Failed to delete media');
    } catch (error: any) {
        console.error('Error deleting media:', error);

        if (error?.response?.status === 401 || error?.response?.status === 403) {
            throw new Error('You do not have permission to delete this photo.');
        }
        if (error?.response?.status === 404) {
            console.warn('Media not found on server, may have been already deleted');
            return true;
        }

        throw error;
    }
};

export const bulkDeleteMedia = async (
    eventId: string,
    mediaIds: string[],
    authToken: string
): Promise<{ deleted: number; failed: number; errors?: string[] }> => {
    try {
        console.log(`Bulk deleting ${mediaIds.length} media items for event: ${eventId}`);

        const response = await apiClient.delete(API_ROUTES.MEDIA.BULK_DELETE(eventId), {
            data: { media_ids: mediaIds },
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000, // 30 seconds for bulk operations
        });

        if (response.data && response.data.status === true) {
            // Clear caches to force refresh
            imageCache.clear();

            const result = response.data.data || {};
            console.log(`Bulk delete completed: ${result.deleted || mediaIds.length} deleted, ${result.failed || 0} failed`);

            return {
                deleted: result.deleted || mediaIds.length,
                failed: result.failed || 0,
                errors: result.errors
            };
        }

        throw new Error(response.data?.message || 'Failed to bulk delete media');
    } catch (error: any) {
        console.error('Error bulk deleting media:', error);

        if (error?.response?.status === 401 || error?.response?.status === 403) {
            throw new Error('You do not have permission to delete photos.');
        }
        if (error?.response?.status === 404) {
            throw new Error('Event not found or no photos to delete.');
        }
        if (error?.response?.status === 400) {
            throw new Error('Invalid request. Please check the media IDs.');
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
        const response = await apiClient.get(API_ROUTES.MEDIA.GET_BY_ID(mediaId) + '/processing');

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
        const response = await apiClient.post(API_ROUTES.MEDIA.BATCH_APPROVE, {
            media_ids: mediaIds
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
        const response = await apiClient.post(API_ROUTES.MEDIA.BATCH_REJECT, {
            media_ids: mediaIds,
            reason
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

            return await apiClient.post(API_ROUTES.MEDIA.UPLOAD, formData, {
                timeout: 120000, // 2 minutes for large files
                onUploadProgress: (progressEvent: any) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                    console.log(`Upload progress: ${percentCompleted}%`);
                }
            });
        } catch (error) {
            console.error(`Upload error (attempt ${retries + 1}/${maxRetries + 1}):`, error);

            // Only retry on network errors or 500 errors
            if ((error as any)?.code === 'ECONNABORTED' ||
                (error as any)?.code === 'ECONNRESET' ||
                (error as any)?.response?.status === 500) {
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


/**
 * Get bulk upload URLs for multiple files
 */
export const getBulkUploadUrls = async (
    eventId: string,
    files: Array<{ fileName: string; fileType: string }>,
    authToken: string
): Promise<{
    status: boolean;
    message: string;
    data: {
        uploadUrls: Array<{
            uploadUrl: string;
            key: string;
            fileName: string;
            uploadId: string;
            expiresIn: number;
        }>;
        batchSize: number;
        expiresIn: number;
        eventId: string;
    };
}> => {
    try {
        const response = await apiClient.post(API_ROUTES.MEDIA.UPLOAD_URLS, {
            eventId,
            files
        }, {
            timeout: 15000
        });

        if (response.data && response.data.status === true) {
            return response.data;
        }

        throw new Error(response.data?.message || 'Failed to get bulk upload URLs');
    } catch (error) {
        console.error('Error getting bulk upload URLs:', error);
        throw error;
    }
};

/**
 * 🚀 API FUNCTION: Updated upload function
 */
export const uploadMultipleMedia = async (
    files: File[],
    eventId: string,
    albumId: string | null,
    authToken: string
) => {
    try {
        const formData = new FormData();

        // Add all files
        files.forEach((file) => {
            formData.append('images', file);
        });

        // Add required fields
        formData.append('event_id', eventId);
        if (albumId) {
            formData.append('album_id', albumId);
        }

        console.log('🚀 Starting upload:', {
            fileCount: files.length,
            totalSize: `${(files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)}MB`
        });

        const response = await fetch(buildApiUrl(API_ROUTES.MEDIA.UPLOAD), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                // Don't set Content-Type for multipart/form-data
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Upload completed:', result);
        return result;

    } catch (error: any) {
        console.error('❌ Upload error:', error);
        throw new Error(error.message || 'Upload failed. Please try again.');
    }
};

/**
 * Enhanced error handling for uploads
 */
function handleUploadError(error: any) {
    console.error('API error details:', {
        status: error?.response?.status,
        data: error?.response?.data,
        url: error?.config?.url
    });

    if (error?.response?.status === 413) {
        throw new Error('File too large. Please use a smaller image or enable compression.');
    }

    if (error?.response?.status === 415) {
        throw new Error('Unsupported file type. Please use JPEG, PNG, WebP, or HEIC format.');
    }

    if (error?.response?.status === 401) {
        throw new Error('Authentication expired. Please log in again.');
    }

    if (error?.response?.status === 403) {
        throw new Error('You do not have permission to upload to this album.');
    }

    if (error?.response?.status === 400) {
        const message = error?.response?.data?.message || 'Invalid upload request';
        throw new Error(`Upload failed: ${message}`);
    }

    if (error?.response?.status === 500) {
        if (error?.response?.data?.error?.message?.includes('processing')) {
            throw new Error('Server is busy processing images. Please try again in a moment.');
        }
        throw new Error('Server error. Please try again later.');
    }

    throw new Error(error?.response?.data?.message || 'Upload failed. Please try again.');
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
        quality?: 'small' | 'medium' | 'large' | 'original';
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

        const response = await apiClient.get(API_ROUTES.MEDIA.GET_ALBUM(albumId), {
            params,
            headers: {
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
    } catch (error: any) {
        console.error('Error fetching album media:', error);

        if (error?.response?.status === 401 || error?.response?.status === 403) {
            throw new Error('Authentication error. Please log in again.');
        }
        if (error?.response?.status === 404) {
            return []; // Album has no photos yet
        }

        throw error;
    }
};

export const transformMediaToPhoto = (mediaItem: any): Photo => {
    // 🔧 FIX 1: Define hasValidUrl before using it
    const hasValidUrl = mediaItem.url &&
        mediaItem.url !== '' &&
        !mediaItem.url.startsWith('placeholder://');

    // 🔧 FIX 2: Build progressive URLs with fallbacks
    const progressiveUrls = {
        placeholder: mediaItem.image_variants?.small?.jpeg?.url ||
            mediaItem.responsive_urls?.thumbnail ||
            mediaItem.url || '',
        thumbnail: mediaItem.image_variants?.small?.jpeg?.url ||
            mediaItem.responsive_urls?.thumbnail ||
            mediaItem.url || '',
        display: mediaItem.image_variants?.medium?.jpeg?.url ||
            mediaItem.responsive_urls?.medium ||
            mediaItem.url || '',
        full: mediaItem.image_variants?.large?.jpeg?.url ||
            mediaItem.responsive_urls?.large ||
            mediaItem.url || '',
        original: mediaItem.image_variants?.original?.url ||
            mediaItem.responsive_urls?.original ||
            mediaItem.url || ''
    };

    // 🔧 FIX 3: Correct processing status logic
    const processingStatus = mediaItem.processing?.status ||
        (hasValidUrl ? 'completed' : 'pending');

    return {
        id: mediaItem._id || mediaItem.id,
        albumId: mediaItem.album_id,
        eventId: mediaItem.event_id,
        takenBy: mediaItem.uploader_display_name || mediaItem.created_by,

        // 🔧 FIX 4: Use display URL for main imageUrl, empty if processing
        imageUrl: hasValidUrl ? progressiveUrls.display : '',
        thumbnail: progressiveUrls.thumbnail,

        createdAt: new Date(mediaItem.created_at),
        originalFilename: mediaItem.original_filename || `Image-${mediaItem._id}`,

        // 🔧 FIX 5: Remove extra comma and fix variable name
        processingStatus: processingStatus as 'pending' | 'processing' | 'completed' | 'failed',
        processingProgress: mediaItem.processing?.progress || 0, // Fixed: was 'media', should be 'mediaItem'

        approval: {
            status: mediaItem.approval?.status || (mediaItem.approval_status ? 'approved' : 'pending'),
            approved_at: mediaItem.approval?.approved_at,
            approved_by: mediaItem.approval?.approved_by,
            rejection_reason: mediaItem.approval?.rejection_reason
        },

        processing: {
            status: mediaItem.processing_status || mediaItem.processing?.status,
            variants_generated: mediaItem.has_variants || mediaItem.processing?.variants_generated
        },

        progressiveUrls,

        metadata: {
            width: mediaItem.dimensions?.width || mediaItem.metadata?.width || mediaItem.image_variants?.original?.width || 0,
            height: mediaItem.dimensions?.height || mediaItem.metadata?.height || mediaItem.image_variants?.original?.height || 0
        },

        stats: mediaItem.stats || {
            views: 0,
            downloads: 0,
            shares: 0,
            likes: 0
        }
    };
};

/**
 * Get signed URL for an S3 key (for event covers)
 */
export const getSignedUrlForKey = async (
    s3Key: string,
    authToken?: string | null
): Promise<string> => {
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Add auth token if available
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await apiClient.post('/media/signed-url/key', {
            key: s3Key
        }, {
            headers,
        });

        if (response.data && response.data.status === true) {
            return response.data.data.signed_url;
        }

        throw new Error(response.data?.message || 'Failed to get signed URL for key');
    } catch (error) {
        console.error('Error getting signed URL for key:', error);
        throw error;
    }
};