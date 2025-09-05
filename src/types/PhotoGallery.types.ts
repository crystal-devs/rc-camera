// types/PhotoGallery.types.ts - UPDATED for optimized backend integration

export interface Photo {
  id: string;
  albumId?: string;
  eventId: string;
  
  // 🚀 CORE URLs: Backend provides these optimized URLs
  imageUrl: string;      // Current best URL (preview during upload, high-quality when ready)
  thumbnailUrl?: string; // Legacy support - remove eventually
  
  // 🚀 NEW: Image variants from backend (matches Media model)
  image_variants?: {
    original: {
      url: string;
      width: number;
      height: number;
      size_mb: number;
      format: string;
    };
    small: {
      webp?: ImageVariant;
      jpeg?: ImageVariant;
    };
    medium: {
      webp?: ImageVariant;
      jpeg?: ImageVariant;
    };
    large: {
      webp?: ImageVariant;
      jpeg?: ImageVariant;
    };
  };

  // 🔧 UPLOAD STATE: For instant feedback
  isTemporary?: boolean;        // Flag for client-side preview photos
  status?: 'uploading' | 'processing' | 'completed' | 'failed'; // Current status
  uploadProgress?: number;      // 0-100 for upload progress
  
  // 🔧 BACKEND PROCESSING: Maps to backend processing schema
  processing?: boolean | {      // Simplified for frontend + backend compatibility
    status: 'pending' | 'processing' | 'completed' | 'failed';
    started_at?: string;
    completed_at?: string;
    processing_time_ms?: number;
    variants_generated?: boolean;
    variants_count?: number;
    error_message?: string;
  };

  // 🔧 APPROVAL: Maps to backend approval schema
  approval?: {
    status: 'pending' | 'approved' | 'rejected' | 'auto_approved' | 'hidden';
    approved_at?: string;
    approved_by?: string;
    rejection_reason?: string;
    auto_approval_reason?: string;
  };
  
  // Legacy approval fields (for backward compatibility)
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'hidden';

  // 🔧 METADATA: Enhanced to match backend
  metadata?: {
    width?: number;
    height?: number;
    aspect_ratio?: number;
    color_profile?: string;
    has_transparency?: boolean;
    device_info?: {
      brand?: string;
      model?: string;
      os?: string;
    };
    location?: {
      latitude?: number;
      longitude?: number;
      address?: string;
    };
    timestamp?: string;
    camera_settings?: {
      iso?: number;
      aperture?: string;
      shutter_speed?: string;
      focal_length?: string;
    };
  };

  // 🔧 FILE INFO: From backend
  originalFilename?: string;
  filename?: string;        // Alias for originalFilename
  size?: string;           // Human readable size (e.g., "2.3MB")
  size_mb?: number;        // Numeric size in MB
  format?: string;         // File format
  dimensions?: string;     // Human readable dimensions (e.g., "1920x1080")

  // 🔧 UPLOADER INFO: From backend
  uploadedBy?: string;     // Display name
  uploaded_by?: string;    // User ID
  uploader_type?: 'registered_user' | 'guest';
  uploader_display_name?: string;
  
  // 🔧 GUEST UPLOADER: From backend
  guest_uploader?: {
    guest_id: string;
    name?: string;
    email?: string;
    phone?: string;
    upload_method?: string;
  };

  // 🔧 TIMESTAMPS
  createdAt?: Date | string;
  created_at?: string;     // Backend format
  uploadedAt?: string;     // ISO string
  updated_at?: string;

  // 🔧 CONTENT FLAGS: From backend
  content_flags?: {
    inappropriate?: boolean;
    duplicate?: boolean;
    low_quality?: boolean;
    ai_flagged?: boolean;
  };

  // 🔧 ENGAGEMENT: From backend
  stats?: {
    views: number;
    downloads: number;
    shares: number;
    likes: number;
    comments_count?: number;
  };

  // 🔧 UPLOAD CONTEXT: From backend
  upload_context?: {
    method?: 'web' | 'mobile' | 'api' | 'guest_upload';
    ip_address?: string;
    platform?: string;
  };

  // 🚀 DEPRECATED: Remove these in future versions
  thumbnail?: string;           // Use image_variants.small instead
  progressiveUrls?: any;        // Replaced by image_variants
  processingStatus?: string;    // Use processing.status instead
  processingProgress?: number;  // Use processing data instead
  takenBy?: string;            // Use uploadedBy instead
}

// 🚀 NEW: Image variant interface (matches backend)
export interface ImageVariant {
  url: string;
  width: number;
  height: number;
  size_mb: number;
  format: 'webp' | 'jpeg';
}

// 🔧 UPLOAD RESULT: What backend returns on upload
export interface UploadResult {
  id: string;
  filename: string;
  url: string;              // Preview URL for immediate display
  status: 'processing' | 'pending' | 'completed' | 'failed';
  jobId?: string;
  size: string;
  dimensions?: string;
  aspectRatio?: number;
  estimatedProcessingTime: string;
  message: string;
}

// 🔧 UPLOAD RESPONSE: Complete backend response
export interface UploadResponse {
  status: boolean;
  message: string;
  data: {
    uploads: UploadResult[];
    errors?: Array<{
      filename: string;
      error: string;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
      processingTime: string;
    };
    note: string;
  };
}

// 🔧 STATUS RESPONSE: For status monitoring
export interface StatusResponse {
  status: boolean;
  data: {
    id: string;
    filename: string;
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
    isComplete: boolean;
    isFailed: boolean;
    isProcessing: boolean;
    url: string;
    hasVariants: boolean;
    dimensions?: string;
    message: string;
  };
}

// 🔧 ENHANCED: Photo Gallery Props
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
  
  // 🚀 NEW: Upload configuration
  uploadConfig?: {
    maxFileSize?: number;        // In bytes
    maxFiles?: number;           // Per upload batch
    allowedTypes?: string[];     // MIME types
    autoProcess?: boolean;       // Auto-process uploads
    showProgress?: boolean;      // Show upload progress
  };
  
  // 🚀 NEW: Display configuration
  displayConfig?: {
    gridColumns?: {
      mobile: number;
      tablet: number;
      desktop: number;
    };
    enableInfiniteScroll?: boolean;
    preloadImages?: boolean;
    lazyLoadThreshold?: number;
    showMetadata?: boolean;
    enableFullscreen?: boolean;
  };
}

// 🚀 NEW: Media query options
export interface MediaQueryOptions {
  status?: 'approved' | 'pending' | 'rejected' | 'hidden' | 'auto_approved';
  limit?: number;
  offset?: number;
  quality?: 'thumbnail' | 'display' | 'full' | 'original';
  sort?: 'newest' | 'oldest' | 'name' | 'size';
  filter?: {
    uploadedBy?: string;
    dateRange?: {
      start: string;
      end: string;
    };
    hasLocation?: boolean;
    fileType?: string[];
  };
  enabled?: boolean;
}

// 🚀 NEW: Photo context for URL selection
export type PhotoContext = 'grid' | 'lightbox' | 'preview' | 'thumbnail' | 'download';

// 🚀 NEW: Image quality levels
export type ImageQuality = 'low' | 'medium' | 'high' | 'original';

// 🔧 UTILITY: Transform backend photo to frontend photo
export const transformBackendPhoto = (backendPhoto: any): Photo => {
  return {
    id: backendPhoto._id || backendPhoto.id,
    eventId: backendPhoto.event_id,
    albumId: backendPhoto.album_id,
    imageUrl: backendPhoto.url,
    thumbnailUrl: backendPhoto.thumbnailUrl, // Legacy
    image_variants: backendPhoto.image_variants,
    
    // Status and processing
    processing: backendPhoto.processing,
    approval: backendPhoto.approval,
    approvalStatus: backendPhoto.approval?.status || backendPhoto.approval_status,
    
    // Metadata
    metadata: backendPhoto.metadata,
    originalFilename: backendPhoto.original_filename,
    filename: backendPhoto.original_filename,
    size_mb: backendPhoto.size_mb,
    format: backendPhoto.format,
    dimensions: backendPhoto.metadata ? 
      `${backendPhoto.metadata.width}x${backendPhoto.metadata.height}` : undefined,
    
    // Uploader info
    uploadedBy: backendPhoto.uploader_display_name || 
                backendPhoto.guest_uploader?.name || 
                'Unknown',
    uploaded_by: backendPhoto.uploaded_by,
    uploader_type: backendPhoto.uploader_type,
    guest_uploader: backendPhoto.guest_uploader,
    
    // Timestamps
    createdAt: backendPhoto.created_at,
    created_at: backendPhoto.created_at,
    updated_at: backendPhoto.updated_at,
    
    // Engagement
    stats: backendPhoto.stats || {
      views: 0,
      downloads: 0,
      shares: 0,
      likes: 0,
      comments_count: 0
    },
    
    // Flags
    content_flags: backendPhoto.content_flags,
    upload_context: backendPhoto.upload_context
  };
};

// 🔧 UTILITY: Get best image URL for context
export const getBestImageUrl = (
  photo: Photo, 
  context: PhotoContext = 'display',
  supportsWebP: boolean = true
): string => {
  // Handle temporary/uploading photos
  if (photo.isTemporary || photo.status === 'uploading') {
    return photo.imageUrl;
  }

  // Use optimized variants if available
  if (photo.image_variants) {
    const variants = photo.image_variants;
    let targetVariant;

    switch (context) {
      case 'grid':
      case 'thumbnail':
        targetVariant = variants.small;
        break;
      case 'preview':
        targetVariant = variants.medium;
        break;
      case 'lightbox':
        targetVariant = variants.large;
        break;
      case 'download':
        return variants.original?.url || photo.imageUrl;
      default:
        targetVariant = variants.medium;
    }

    // Choose WebP if supported, otherwise JPEG
    if (targetVariant) {
      if (supportsWebP && targetVariant.webp?.url) {
        return targetVariant.webp.url;
      } else if (targetVariant.jpeg?.url) {
        return targetVariant.jpeg.url;
      }
    }
  }

  // Fallback to original URL
  return photo.imageUrl;
};

// 🔧 UTILITY: Check if photo is still processing
export const isPhotoProcessing = (photo: Photo): boolean => {
  if (photo.isTemporary || photo.status === 'uploading') return true;
  
  if (typeof photo.processing === 'object' && photo.processing) {
    return photo.processing.status === 'processing' || photo.processing.status === 'pending';
  }
  
  return photo.processing === true;
};

// 🔧 UTILITY: Get processing status message
export const getProcessingStatusMessage = (photo: Photo): string => {
  if (photo.isTemporary || photo.status === 'uploading') {
    return 'Uploading...';
  }
  
  if (typeof photo.processing === 'object' && photo.processing) {
    switch (photo.processing.status) {
      case 'pending': return 'Queued for processing';
      case 'processing': return 'Creating high-quality versions...';
      case 'completed': return 'Processing complete';
      case 'failed': return photo.processing.error_message || 'Processing failed';
      default: return 'Unknown status';
    }
  }
  
  if (photo.processing === true) return 'Processing...';
  return 'Ready';
};
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