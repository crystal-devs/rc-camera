import { API_BASE_URL } from "@/lib/api-config";

// services/apis/bulk-download.api.ts
interface BulkDownloadRequest {
  shareToken: string;
  quality?: 'thumbnail' | 'medium' | 'large' | 'original';
  includeVideos?: boolean;
  includeImages?: boolean;
  guestId?: string;
  guestName?: string;
  guestEmail?: string;
}

interface BulkDownloadResponse {
  status: boolean;
  data: {
    jobId: string;
    downloadUrl?: string;
    totalFiles?: number;
    estimatedSizeMB?: number;
    estimatedTimeMinutes?: number;
    mediaBreakdown?: {
      images: { count: number; size_mb: number };
      videos: { count: number; size_mb: number };
    };
  };
  message?: string;
}

interface DownloadStatus {
  success: boolean;
  data: {
    jobId: string;
    status: 'queued' | 'processing' | 'completed' | 'failed' | 'expired' | 'cancelled';
    currentStage: string;
    progress: number;
    totalFiles: number;
    processedFiles: number;
    failedFiles: number;
    downloadUrl?: string;
    downloadUrlExpiresAt?: string;
    estimatedSizeMB: number;
    actualSizeMB?: number;
    mediaBreakdown: {
      images: { count: number; size_mb: number };
      videos: { count: number; size_mb: number };
    };
    errorMessage?: string;
    processingDuration?: number;
    createdAt: string;
    queueStatus?: string;
  };
}

/**
 * Create a bulk download request
 */
export const createBulkDownload = async (
  request: BulkDownloadRequest,
  authToken?: string
): Promise<BulkDownloadResponse> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/download/bulk`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Create a bulk download request for authenticated users (event-based)
 */
export const createEventBulkDownload = async (
  eventId: string,
  requestedById: string,
  requestedByType: 'user' | 'guest' = 'user',
  quality: 'thumbnail' | 'medium' | 'large' | 'original' = 'original',
  authToken?: string
): Promise<BulkDownloadResponse> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/download/bulk`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      eventId,
      requestedById,
      requestedByType,
      quality,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Create a bulk download request for guest users (share token-based)
 */
export const createGuestBulkDownload = async (
  shareToken: string,
  eventId: string,
  quality: 'thumbnail' | 'medium' | 'large' | 'original' = 'original'
): Promise<BulkDownloadResponse> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${API_BASE_URL}/download/guest/${shareToken}/bulk`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      eventId,
      quality,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Get download status and URL
 */
export const getDownloadStatus = async (
  jobId: string,
  authToken?: string
): Promise<DownloadStatus> => {
  const headers: HeadersInit = {};

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/download/status/${jobId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Get download status for event-based downloads
 */
export const getEventDownloadStatus = async (
  jobId: string,
  authToken?: string
): Promise<DownloadStatus> => {
  const headers: HeadersInit = {};

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/download/status/${jobId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Cancel a download job
 */
export const cancelDownload = async (
  jobId: string,
  guestId?: string,
  authToken?: string
): Promise<{ success: boolean; message: string }> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/download/bulk-download/${jobId}`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ guestId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Download the ZIP file directly to user's device
 */
export const downloadZipFile = async (downloadUrl: string, filename?: string): Promise<void> => {
  console.log('🚀 [DOWNLOAD] Starting download process...');
  console.log('🔗 [DOWNLOAD] URL:', downloadUrl.substring(0, 100) + '...');
  console.log('📁 [DOWNLOAD] Filename:', filename);

  // Check if URL is expired by parsing the X-Amz-Date parameter
  try {
    const url = new URL(downloadUrl);
    const amzDate = url.searchParams.get('X-Amz-Date');
    const expires = url.searchParams.get('X-Amz-Expires');

    if (amzDate && expires) {
      // Parse AWS date format (YYYYMMDDTHHMMSSZ)
      const dateMatch = amzDate.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
      if (dateMatch) {
        const [, year, month, day, hour, minute, second] = dateMatch;
        const signedAt = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
        const expiresAt = new Date(signedAt.getTime() + (parseInt(expires) * 1000));
        const now = new Date();

        console.log('⏰ [DOWNLOAD] URL signed at:', signedAt.toISOString());
        console.log('⏰ [DOWNLOAD] URL expires at:', expiresAt.toISOString());
        console.log('⏰ [DOWNLOAD] Current time:', now.toISOString());
        console.log('⏰ [DOWNLOAD] Time remaining:', Math.floor((expiresAt.getTime() - now.getTime()) / 1000), 'seconds');

        if (now > expiresAt) {
          console.error('❌ [DOWNLOAD] Presigned URL has expired!');
          console.error('❌ [DOWNLOAD] This is a BACKEND ISSUE - URL expired before download');
          throw new Error('Download URL has expired. This is a server-side issue that needs to be fixed.');
        }
      }
    }
  } catch (parseError) {
    console.warn('⚠️ [DOWNLOAD] Could not parse URL expiration:', parseError);
  }

  try {
    console.log('📡 [DOWNLOAD] Fetching from S3 presigned URL...');

    // For S3 presigned URLs, we need to handle CORS and authentication
    const response = await fetch(downloadUrl, {
      method: 'GET',
      // Don't set credentials for S3 presigned URLs as they include auth in the URL
      mode: 'cors', // Explicitly set CORS mode
    });

    console.log('📡 [DOWNLOAD] Response status:', response.status, response.statusText);
    console.log('📡 [DOWNLOAD] Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('📡 [DOWNLOAD] Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [DOWNLOAD] HTTP error response:', errorText);

      // Check if it's an S3 expiration error
      if (errorText.includes('AccessDenied') && errorText.includes('Request has expired')) {
        console.error('❌ [DOWNLOAD] S3 URL EXPIRED - BACKEND BUG!');
        throw new Error('Download URL expired. Backend needs to generate fresh URLs when download is ready.');
      }

      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    console.log('📋 [DOWNLOAD] Content type:', contentType);
    console.log('📏 [DOWNLOAD] Content length:', contentLength);

    // Get the blob from the response
    console.log('🗜️ [DOWNLOAD] Converting response to blob...');
    const blob = await response.blob();
    console.log('📦 [DOWNLOAD] Blob created successfully');
    console.log('📏 [DOWNLOAD] Blob size:', blob.size, 'bytes');
    console.log('🏷️ [DOWNLOAD] Blob type:', blob.type);

    if (blob.size === 0) {
      console.error('❌ [DOWNLOAD] Blob is empty!');
      throw new Error('Downloaded file is empty');
    }

    // Create a temporary URL for the blob
    const blobUrl = window.URL.createObjectURL(blob);
    console.log('🔗 [DOWNLOAD] Created blob URL:', blobUrl);

    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || `event-photos-${Date.now()}.zip`;
    link.style.display = 'none';
    link.target = '_blank'; // Open in new tab as backup

    // Append to body, click, then remove
    document.body.appendChild(link);
    console.log('🖱️ [DOWNLOAD] Link element added to DOM');

    console.log('🚀 [DOWNLOAD] Attempting programmatic download...');
    // Try programmatic download first
    link.click();
    console.log('✅ [DOWNLOAD] Programmatic download triggered');

    // No backup methods needed - programmatic download should work

    // Cleanup after a longer delay to ensure download starts
    setTimeout(() => {
      console.log('🧹 [DOWNLOAD] Starting cleanup...');
      document.body.removeChild(link);
      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
      console.log('✅ [DOWNLOAD] Cleanup completed');
    }, 3000);

    console.log('🎉 [DOWNLOAD] Download process completed successfully');

  } catch (error) {
    console.error('❌ [DOWNLOAD] Direct download failed:', error);

    // If it's an expiration error, provide clear backend instructions
    if (error instanceof Error && (error.message.includes('expired') || error.message.includes('AccessDenied'))) {
      console.error('🔧 [BACKEND FIX NEEDED]');
      console.error('🔧 The presigned URL expired before download completed');
      console.error('🔧 Backend should generate fresh URLs when status is "completed"');
      console.error('🔧 Or increase X-Amz-Expires from 3600 to 86400 (24 hours)');
    }

    throw error; // Re-throw the error for proper handling
  }
};