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
  success: boolean;
  data: {
    downloadId: string;
    totalFiles: number;
    estimatedSizeMB: number;
    estimatedTimeMinutes: number;
    mediaBreakdown: {
      images: { count: number; size_mb: number };
      videos: { count: number; size_mb: number };
    };
    message: string;
  };
  message?: string;
  code?: string;
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

  const response = await fetch(`${API_BASE_URL}/download/bulk-download`, {
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
    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || `event-photos-${Date.now()}.zip`;
    link.target = '_blank'; // Open in new tab as backup
    
    // Append to body, click, then remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    // If direct download fails, open in new tab
    window.open(downloadUrl, '_blank');
    throw new Error('Direct download failed, opened in new tab instead');
  }
};