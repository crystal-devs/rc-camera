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

  const response = await fetch(`${API_BASE_URL}/download/bulk-download/${jobId}/status`, {
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
  try {
    // For S3 presigned URLs, we need to handle CORS and authentication
    const response = await fetch(downloadUrl, {
      method: 'GET',
      // Don't set credentials for S3 presigned URLs as they include auth in the URL
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    // Get the blob from the response
    const blob = await response.blob();

    // Create a temporary URL for the blob
    const blobUrl = window.URL.createObjectURL(blob);

    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || `event-photos-${Date.now()}.zip`;

    // Append to body, click, then remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the blob URL
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Direct download failed:', error);
    // If direct download fails, try opening in new tab as fallback
    try {
      window.open(downloadUrl, '_blank');
      console.log('Opened download URL in new tab as fallback');
    } catch (fallbackError) {
      console.error('Fallback download also failed:', fallbackError);
      throw new Error('Download failed. Please try again or contact support.');
    }
  }
};