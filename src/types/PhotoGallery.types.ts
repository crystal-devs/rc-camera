// types/PhotoGallery.types.ts

export interface Photo {
  id: string;
  albumId?: string;
  eventId: string;
  takenBy?: string;
  imageUrl: string; // Original URL - ONLY for downloads
  thumbnail?: string; // Legacy support
  createdAt: Date;
  
  approval?: {
    status: string;
    approved_at?: Date;
    approved_by?: string;
    rejection_reason?: string;
  };
  
  processing?: {
    status: string;
    thumbnails_generated?: boolean;
    variants_generated?: boolean;
  };
  
  // Progressive loading URLs - CORE optimization
  progressiveUrls?: {
    placeholder: string; // Tiny placeholder (~5KB)
    thumbnail: string;   // For grid view (~40KB)
    display: string;     // For modal view (~170KB)
    full: string;        // For full-screen (~540KB)
    original: string;    // For download only (~1.8MB)
  };
  
  metadata?: {
    width: number;
    height: number;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  };
  
  stats: {
    views: number;
    downloads: number;
    shares: number;
    likes: number;
  };
}

export interface PhotoGalleryProps {
  eventId: string;
  albumId: string | null;
  canUpload?: boolean;
  userPermissions?: {
    upload: boolean;
    download: boolean;
    moderate: boolean;
    delete: boolean;
  };
  approvalMode?: 'auto' | 'manual';
}

export interface MediaFetchOptions {
  status?: 'approved' | 'pending' | 'rejected' | 'hidden' | 'auto_approved';
  limit?: number;
  quality?: 'thumbnail' | 'display' | 'full';
  includeProcessing?: boolean;
  includePending?: boolean;
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
}

export interface MediaCounts {
  approved: number;
  pending: number;
  rejected: number;
  hidden: number;
  total: number;
}

export interface UploadProgress {
  total: number;
  completed: number;
  failed: number;
  currentFile?: string;
  percentage: number;
}

export interface UserPermissions {
  upload: boolean;
  download: boolean;
  moderate: boolean;
  delete: boolean;
}

export type PhotoStatus = 'approved' | 'pending' | 'rejected' | 'hidden' | 'auto_approved';

export type PhotoQuality = 'thumbnail' | 'display' | 'full';

export type ApprovalMode = 'auto' | 'manual';