// components/PhotoGallery.tsx
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CameraIcon, DownloadIcon, ClockIcon } from 'lucide-react';
import { useFullscreen } from '@/lib/FullscreenContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { db } from '@/lib/db';
import { toast } from 'sonner';
import PhotoInfoDialog from '@/components/photo/PhotoInfoDialog';
import {
  uploadAlbumMedia,
  getAlbumMedia,
  getEventMedia,
  transformMediaToPhoto,
  deleteMedia,
  getEventMediaWithGuestToken,
  getAlbumMediaWithGuestToken,
  getEventMediaCounts,
  updateMediaStatus
} from '@/services/apis/media.api';
import { useAuthToken } from '@/hooks/use-auth';
import { getOrCreateDefaultAlbum } from '@/services/apis/albums.api';
import PhotoGrid from './PhotoGrid';
import PhotoUploadDialog from './PhotoUploadDialog';
import useSwipe from './useSwipe';
import { Photo, PhotoGalleryProps } from './PhotoGallery.types';
import { FullscreenPhotoViewer } from './FullscreenPhotoViewer';

export default function PhotoGallery({
  eventId,
  albumId,
  canUpload = true,
  guestToken,
  userPermissions = {
    upload: true,
    download: false,
    moderate: true,
    delete: true
  },
  approvalMode = 'auto'
}: PhotoGalleryProps) {
  // Core state
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [isRealtime, setIsRealtime] = useState(true);
  const [photoInfoOpen, setPhotoInfoOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [defaultAlbumId, setDefaultAlbumId] = useState<string | null>(albumId || null);

  // NEW: Status management state
  const [activeTab, setActiveTab] = useState<'approved' | 'pending' | 'rejected' | 'hidden'>('approved');
  const [mediaCounts, setMediaCounts] = useState({
    approved: 0,
    pending: 0,
    rejected: 0,
    hidden: 0,
    total: 0
  });
  const [tabLoading, setTabLoading] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const realtimeInterval = useRef<NodeJS.Timeout | null>(null);

  const token = useAuthToken();
  const userId = 1; // This should come from auth context

  // Cache for loaded images to prevent re-fetching
  const imageCache = useRef<Map<string, Photo[]>>(new Map());
  const lastFetchTime = useRef<Map<string, number>>(new Map());

  // Check if user can upload based on permissions
  const canUserUpload = useMemo(() => {
    return canUpload && userPermissions.upload;
  }, [canUpload, userPermissions.upload]);

  // Navigation functions
  const navigateToPhoto = useCallback((direction: 'next' | 'prev') => {
    if (selectedPhotoIndex === null || photos.length <= 1) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = (selectedPhotoIndex + 1) % photos.length;
    } else {
      newIndex = (selectedPhotoIndex - 1 + photos.length) % photos.length;
    }

    setSelectedPhotoIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  }, [selectedPhotoIndex, photos]);

  // Setup swipe handlers
  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipe(
    () => navigateToPhoto('next'),
    () => navigateToPhoto('prev')
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!photoViewerOpen) return;

      if (e.key === 'ArrowRight') {
        navigateToPhoto('next');
      } else if (e.key === 'ArrowLeft') {
        navigateToPhoto('prev');
      } else if (e.key === 'Escape') {
        setPhotoViewerOpen(false);
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photoViewerOpen, navigateToPhoto]);

  // Smart cache key generation
  const getCacheKey = useCallback((eventId: string, albumId: string | null, status?: string) => {
    const baseKey = albumId === null ? `event_${eventId}` : `album_${albumId}`;
    return status ? `${baseKey}_${status}` : baseKey;
  }, []);

  // Fetch media counts
  const fetchMediaCounts = useCallback(async () => {
    const authToken = token || localStorage.getItem('authToken');
    if (!authToken || guestToken) return; // Skip for guest access

    try {
      const counts = 0
      // const counts = await getEventMediaCounts(eventId, authToken);
      if (counts) {
        setMediaCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching media counts:', error);
    }
  }, [token, eventId, guestToken]);

  // Fetch photos with status filtering
  const fetchPhotosFromAPI = useCallback(async (
    status?: 'approved' | 'pending' | 'rejected' | 'hidden',
    cursor?: string,
    forceRefresh = false
  ) => {
    const authToken = token || localStorage.getItem('authToken');
    const isGuestAccess = Boolean(guestToken);

    if (!authToken && !isGuestAccess) {
      console.error('No auth token or guest token available');
      return false;
    }

    try {
      const targetStatus = status || activeTab;
      const cacheKey = getCacheKey(eventId, null, targetStatus);
      const lastFetch = lastFetchTime.current.get(cacheKey) || 0;
      const now = Date.now();
      const cacheAge = now - lastFetch;
      const CACHE_DURATION = 30000; // 30 seconds

      // Use cache if not forcing refresh and cache is fresh
      if (!forceRefresh && !cursor && cacheAge < CACHE_DURATION && imageCache.current.has(cacheKey)) {
        const cachedPhotos = imageCache.current.get(cacheKey)!;
        console.log(`Using cached photos (${cachedPhotos.length} items, ${cacheAge}ms old)`);
        setPhotos(cachedPhotos);
        return true;
      }

      console.log('Fetching photos from API with status:', targetStatus);

      let mediaItems;
      if (isGuestAccess && guestToken) {
        // For guest access, only show approved media
        mediaItems = await getEventMediaWithGuestToken(eventId, guestToken, true);
      } else if (authToken) {
        mediaItems = await getEventMedia(eventId, authToken, true, {
          status: targetStatus,
          scrollType: 'infinite',
          cursor: cursor,
          limit: 20
        });
      }

      if (mediaItems && Array.isArray(mediaItems)) {
        const transformedPhotos = mediaItems.map(transformMediaToPhoto);

        console.log(`Fetched ${transformedPhotos.length} photos for status: ${targetStatus}`);

        // Update cache only if not cursor-based (initial load)
        if (!cursor) {
          imageCache.current.set(cacheKey, transformedPhotos);
          lastFetchTime.current.set(cacheKey, now);
          setPhotos(transformedPhotos);
        } else {
          // For infinite scroll, append to existing photos
          setPhotos(prev => [...prev, ...transformedPhotos]);
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error fetching photos from API:', error);
      return false;
    }
  }, [token, eventId, guestToken, getCacheKey, activeTab]);

  // Tab change handler
  const handleTabChange = useCallback(async (newTab: 'approved' | 'pending' | 'rejected' | 'hidden') => {
    if (newTab === activeTab) return;

    setActiveTab(newTab);
    setTabLoading(true);
    setPhotos([]); // Clear current photos

    try {
      await fetchPhotosFromAPI(newTab, undefined, true);
    } finally {
      setTabLoading(false);
    }
  }, [activeTab, fetchPhotosFromAPI]);

  // Photo status management functions
  const approvePhoto = async (photoId: string) => {
    if (!userPermissions.moderate) {
      toast.error("You don't have permission to moderate photos.");
      return;
    }

    try {
      await updateMediaStatus(photoId, 'approved', token!);

      // Update local state
      const approvedPhoto = photos.find(p => p.id === photoId);
      if (approvedPhoto) {
        // Remove from current tab
        setPhotos(prev => prev.filter(p => p.id !== photoId));

        // Update counts
        setMediaCounts(prev => ({
          ...prev,
          [activeTab]: Math.max(0, prev[activeTab] - 1),
          approved: prev.approved + 1
        }));

        // Clear approved cache to refresh
        const approvedCacheKey = getCacheKey(eventId, null, 'approved');
        imageCache.current.delete(approvedCacheKey);
      }

      toast.success("Photo approved successfully.");
    } catch (error) {
      console.error('Error approving photo:', error);
      toast.error("Failed to approve photo.");
    }
  };

  const rejectPhoto = async (photoId: string, reason?: string) => {
    if (!userPermissions.moderate) {
      toast.error("You don't have permission to moderate photos.");
      return;
    }

    try {
      await updateMediaStatus(photoId, 'rejected', token!, { reason });

      // Update local state
      setPhotos(prev => prev.filter(p => p.id !== photoId));

      // Update counts
      setMediaCounts(prev => ({
        ...prev,
        [activeTab]: Math.max(0, prev[activeTab] - 1),
        rejected: prev.rejected + 1
      }));

      toast.success("Photo rejected successfully.");
    } catch (error) {
      console.error('Error rejecting photo:', error);
      toast.error("Failed to reject photo.");
    }
  };

  const hidePhoto = async (photoId: string, reason?: string) => {
    if (!userPermissions.moderate) {
      toast.error("You don't have permission to moderate photos.");
      return;
    }

    try {
      await updateMediaStatus(photoId, 'hidden', token!, { hideReason: reason });

      // Update local state
      setPhotos(prev => prev.filter(p => p.id !== photoId));

      // Update counts
      setMediaCounts(prev => ({
        ...prev,
        [activeTab]: Math.max(0, prev[activeTab] - 1),
        hidden: prev.hidden + 1
      }));

      toast.success("Photo hidden successfully.");
    } catch (error) {
      console.error('Error hiding photo:', error);
      toast.error("Failed to hide photo.");
    }
  };

  // Get default album effect
  useEffect(() => {
    const isEventPhotosMode = albumId === null;

    if (isEventPhotosMode || !eventId) {
      return;
    }

    const authToken = token || localStorage.getItem('authToken');
    if (!authToken) {
      return;
    }

    let isMounted = true;

    const fetchDefaultAlbum = async () => {
      if (albumId) {
        if (isMounted) {
          setDefaultAlbumId(albumId);
        }
        return;
      }

      if (defaultAlbumId) {
        return;
      }

      try {
        const defaultAlbum = await getOrCreateDefaultAlbum(eventId, authToken);
        if (isMounted && defaultAlbum) {
          setDefaultAlbumId(defaultAlbum.id);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching default album:', error);
          toast.error("Error loading album. Please try again.");
        }
      }
    };

    fetchDefaultAlbum();

    return () => {
      isMounted = false;
    };
  }, [eventId, albumId, token, defaultAlbumId]);

  // Load photos effect
  useEffect(() => {
    let isMounted = true;

    const loadPhotos = async () => {
      if (!isMounted) return;

      setIsLoading(true);

      try {
        // Fetch counts first (for moderators)
        if (userPermissions.moderate && !guestToken) {
          await fetchMediaCounts();
        }

        // Fetch photos for current tab
        const apiSuccess = await fetchPhotosFromAPI();

        if (!isMounted) return;
      } catch (error) {
        if (isMounted) {
          console.error('Error in photo loading process:', error);
          toast.error("Failed to load photos");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPhotos();

    // Setup realtime polling
    let intervalId: NodeJS.Timeout | null = null;
    if (isRealtime) {
      intervalId = setInterval(() => {
        if (isMounted && !isLoading) {
          fetchPhotosFromAPI(activeTab, undefined, false).catch(err => {
            if (isMounted) console.error('Error in interval photo fetch:', err);
          });
          if (userPermissions.moderate) {
            fetchMediaCounts().catch(err => {
              if (isMounted) console.error('Error fetching counts:', err);
            });
          }
        }
      }, 30000);
      realtimeInterval.current = intervalId;
    }

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (realtimeInterval.current) {
        clearInterval(realtimeInterval.current);
      }
    };
  }, [eventId, activeTab, fetchPhotosFromAPI, fetchMediaCounts, isRealtime, userPermissions.moderate, guestToken]);

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check upload permissions
    if (!canUserUpload) {
      toast.error("You don't have permission to upload photos to this event.");
      return;
    }

    const isEventPhotosMode = albumId === null && eventId;
    const targetAlbumId = isEventPhotosMode ? null : (albumId || defaultAlbumId);

    if (!isEventPhotosMode && !targetAlbumId) {
      toast.error("No album available for uploading. Please try again later.");
      return;
    }

    if (!token) {
      toast.error("You need to be logged in to upload photos.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadDialogOpen(false);

      const validFiles = Array.from(files).filter(file => {
        if (!file.type.startsWith('image/')) {
          toast.error(`"${file.name}" is not a valid image file.`);
          return false;
        }

        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
          const sizeMB = (file.size / 1024 / 1024).toFixed(2);
          toast.error(`"${file.name}" is too large (${sizeMB}MB). Maximum size is 50MB.`);
          return false;
        }

        return true;
      });

      if (validFiles.length === 0) {
        toast.error("No valid image files to upload.");
        setIsUploading(false);
        return;
      }

      const progressToast = toast.loading(`Uploading ${validFiles.length} photo${validFiles.length > 1 ? 's' : ''}...`, {
        duration: 60000
      });

      let completedUploads = 0;

      const results = await Promise.allSettled(
        validFiles.map(async (file) => {
          try {
            const uploadedData = await uploadAlbumMedia(file, targetAlbumId, token, eventId);

            completedUploads++;
            toast.dismiss(progressToast);
            toast.loading(`Uploaded ${completedUploads}/${validFiles.length} photos...`, {
              id: progressToast,
              duration: 60000
            });

            const photoId = uploadedData._id || uploadedData.id || uuidv4();
            const responseAlbumId = uploadedData.album_id || targetAlbumId;

            const newPhoto: Photo = {
              id: photoId,
              albumId: responseAlbumId,
              eventId,
              takenBy: userId,
              imageUrl: uploadedData.url,
              thumbnail: uploadedData.thumbnail_url || uploadedData.url,
              createdAt: new Date(),
              approval: {
                status: approvalMode === 'auto' ? 'auto_approved' : 'pending',
                approved_at: approvalMode === 'auto' ? new Date() : undefined
              },
              processing: {
                status: 'completed',
                thumbnails_generated: !!uploadedData.thumbnail_url
              },
              metadata: {
                device: navigator.userAgent,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size
              }
            };

            try {
              if (newPhoto.albumId) {
                await db.photos.add({
                  ...newPhoto,
                  albumId: newPhoto.albumId
                });
              }
            } catch (dbError) {
              console.warn('Failed to add to local DB, continuing:', dbError);
            }

            return newPhoto;
          } catch (error) {
            console.error(`Error uploading file ${file.name}:`, error);
            throw error;
          }
        })
      );

      const successfulUploads = results.filter(r => r.status === 'fulfilled');
      const failedUploads = results.filter(r => r.status === 'rejected');

      const newPhotos = successfulUploads.map(r => (r as PromiseFulfilledResult<any>).value);

      if (newPhotos.length > 0) {
        // Add new photos to current view if they match active tab
        const photosForCurrentTab = newPhotos.filter(photo => {
          const status = photo.approval?.status;
          switch (activeTab) {
            case 'approved':
              return status === 'approved' || status === 'auto_approved';
            case 'pending':
              return status === 'pending';
            case 'rejected':
              return status === 'rejected';
            case 'hidden':
              return status === 'hidden';
            default:
              return false;
          }
        });

        if (photosForCurrentTab.length > 0) {
          setPhotos(prev => [...photosForCurrentTab, ...prev]);
        }

        // Update counts
        if (userPermissions.moderate) {
          fetchMediaCounts();
        }

        // Invalidate relevant caches
        const cacheKeysToInvalidate = ['approved', 'pending', 'rejected', 'hidden'];
        cacheKeysToInvalidate.forEach(status => {
          const cacheKey = getCacheKey(eventId, albumId ?? null, status);
          imageCache.current.delete(cacheKey);
        });
      }

      toast.dismiss(progressToast);

      if (successfulUploads.length > 0) {
        toast.success(`${successfulUploads.length} photo${successfulUploads.length > 1 ? 's' : ''} uploaded successfully.`);
      }

      if (failedUploads.length > 0) {
        toast.error(`Failed to upload ${failedUploads.length} photo${failedUploads.length > 1 ? 's' : ''}.`);
      }

      // Reset file inputs
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';

    } catch (error) {
      console.error('Error uploading photos:', error);
      const errorMessage = error instanceof Error ? error.message : "There was an error uploading your photos.";
      toast.error(errorMessage, { duration: 8000 });
    } finally {
      setIsUploading(false);
    }
  };

  // Delete photo
  const deletePhoto = async (photoId: string) => {
    if (!userPermissions.delete) {
      toast.error("You don't have permission to delete photos.");
      return;
    }

    try {
      const loadingToast = toast.loading("Deleting photo...");

      if (token) {
        try {
          await deleteMedia(photoId, token);
        } catch (apiError) {
          console.error('Error deleting photo from backend:', apiError);
        }
      }

      await db.photos.where('id').equals(photoId).delete();

      setPhotos(prev => prev.filter(p => p.id !== photoId));

      // Update counts
      if (userPermissions.moderate) {
        setMediaCounts(prev => ({
          ...prev,
          [activeTab]: Math.max(0, prev[activeTab] - 1),
          total: Math.max(0, prev.total - 1)
        }));
      }

      // Invalidate cache
      const cacheKey = getCacheKey(eventId, albumId ?? null, activeTab);
      imageCache.current.delete(cacheKey);

      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null);
        setPhotoViewerOpen(false);
      }

      toast.dismiss(loadingToast);
      toast.success("Photo deleted successfully.");
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error("Failed to delete photo.");
    }
  };

  // Camera capture
  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  // Download photo
  const downloadPhoto = (photo: Photo) => {
    if (!userPermissions.download) {
      toast.error("You don't have permission to download photos.");
      return;
    }

    const link = document.createElement('a');
    link.href = photo.imageUrl;
    link.download = `photo-${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open photo viewer
  const openPhotoViewer = (photo: Photo, index: number) => {
    setSelectedPhoto(photo);
    setSelectedPhotoIndex(index);
    setPhotoViewerOpen(true);
    setIsFullscreen(true);
  };

  return (
    <div>
      {/* Header with status tabs and controls */}
      <div className="flex items-center justify-between mb-6 px-4">
        <div className="flex items-center gap-3">
          {isRealtime && (
            <div className="flex items-center bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs px-2 py-1 rounded-full">
              <span className="h-2 w-2 bg-green-500 rounded-full mr-1.5"></span>
              Live
            </div>
          )}

          {/* Status tabs for moderators */}
          {/* {userPermissions.moderate && !guestToken && ( */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-accent p-1 rounded-lg">
            <button
              onClick={() => handleTabChange('approved')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === 'approved'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              Published
              {mediaCounts.approved > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-full">
                  {mediaCounts.approved}
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange('pending')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === 'pending'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              <ClockIcon className="h-3 w-3 mr-1 inline" />
              Pending
              {mediaCounts.pending > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400 rounded-full">
                  {mediaCounts.pending}
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange('rejected')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === 'rejected'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              Rejected
              {mediaCounts.rejected > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded-full">
                  {mediaCounts.rejected}
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange('hidden')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${activeTab === 'hidden'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              Hidden
              {mediaCounts.hidden > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                  {mediaCounts.hidden}
                </span>
              )}
            </button>
          </div>
          {/* )} */}
        </div>

        {canUserUpload && (defaultAlbumId || albumId !== undefined || albumId === null) && (
          <PhotoUploadDialog
            open={uploadDialogOpen}
            setOpen={setUploadDialogOpen}
            isUploading={isUploading}
            approvalMode={approvalMode}
            onFileUpload={handleFileUpload}
            fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
            cameraInputRef={cameraInputRef as React.RefObject<HTMLInputElement>}
            handleCameraCapture={handleCameraCapture}
          />
        )}
      </div>

      {/* Main photo grid */}
      {(isLoading || tabLoading) ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-8 gap-2 sm:gap-3 md:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : !defaultAlbumId && !albumId && albumId !== null && !eventId ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed rounded-lg">
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full mb-4">
            <CameraIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">Loading Album...</h3>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
            Please wait while we prepare your album.
          </p>
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed rounded-lg">
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full mb-4">
            <CameraIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
            {activeTab === 'approved' ? 'No Published Photos' :
              activeTab === 'pending' ? 'No Pending Photos' :
                activeTab === 'rejected' ? 'No Rejected Photos' :
                  'No Hidden Photos'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
            {activeTab === 'approved' ?
              (canUserUpload ? "Be the first to add photos to this album." : "No photos have been approved yet.") :
              activeTab === 'pending' ? "No photos are waiting for approval." :
                activeTab === 'rejected' ? "No photos have been rejected." :
                  "No photos have been hidden."}
          </p>
          {canUserUpload && activeTab === 'approved' && (
            <Button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
              disabled={isUploading}
            >
              <CameraIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Photos</span>
            </Button>
          )}
        </div>
      ) : (
        <>
          <PhotoGrid
            photos={photos}
            onPhotoClick={openPhotoViewer}
            userPermissions={userPermissions}
            downloadPhoto={downloadPhoto}
            deletePhoto={deletePhoto}
            // These are the new props for status management
            approvePhoto={userPermissions.moderate ? approvePhoto : undefined}
            rejectPhoto={userPermissions.moderate ? rejectPhoto : undefined}
            hidePhoto={userPermissions.moderate ? hidePhoto : undefined}
            currentTab={activeTab}
          />

          {photoViewerOpen && selectedPhoto && (
            <FullscreenPhotoViewer
              selectedPhoto={selectedPhoto}
              selectedPhotoIndex={selectedPhotoIndex}
              photos={photos}
              userPermissions={userPermissions}
              onClose={() => {
                setIsFullscreen(false);
                setPhotoViewerOpen(false);
              }}
              onPrev={() => navigateToPhoto('prev')}
              onNext={() => navigateToPhoto('next')}
              setPhotoInfoOpen={setPhotoInfoOpen}
              deletePhoto={deletePhoto}
              downloadPhoto={downloadPhoto}
              // Add moderation actions to photo viewer
              // approvePhoto={userPermissions.moderate ? approvePhoto : undefined}
              // rejectPhoto={userPermissions.moderate ? rejectPhoto : undefined}
              // hidePhoto={userPermissions.moderate ? hidePhoto : undefined}
            />
          )}

          {selectedPhoto && (
            <PhotoInfoDialog
              photo={selectedPhoto}
              open={photoInfoOpen}
              onClose={() => setPhotoInfoOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}