// PhotoGallery.types.ts

export interface Photo {
  id: string;
  albumId: string | null;
  eventId: string;
  takenBy: number;
  imageUrl: string;
  thumbnail?: string;
  compressedVersions?: Array<{
    quality: string;
    url: string;
    size_mb: number;
    width: number;
    height: number;
  }>;
  createdAt: Date;
  approval?: {
    status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
    approved_by?: string;
    approved_at?: Date;
    rejection_reason?: string;
  };
  processing?: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    thumbnails_generated?: boolean;
    compression_progress?: number; // 0-100
  };
  progressiveUrls?: {
    thumbnail: string;
    display: string;
    full: string;
    original: string;
  };
  metadata?: {
    location?: { lat: number; lng: number };
    device?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    originalWidth?: number;
    originalHeight?: number;
    originalSizeMB?: number;
  };
}

export interface PhotoGalleryProps {
  eventId: string;
  albumId?: string | null;
  canUpload?: boolean;
  guestToken?: string;
  userPermissions?: {
    upload: boolean;
    download: boolean;
    moderate: boolean;
    delete: boolean;
  };
  approvalMode?: 'auto' | 'manual' | 'ai_assisted';
}