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
  getAlbumMediaWithGuestToken
} from '@/services/apis/media.api';
import { useAuthToken } from '@/hooks/use-auth';
import { getOrCreateDefaultAlbum } from '@/services/apis/albums.api';
import PhotoGrid from './PhotoGrid';
import PhotoUploadDialog from './PhotoUploadDialog';
import PendingApprovalSection from './PendingApprovalSection';
import FullscreenPhotoViewer from './FullscreenPhotoViewer';
import useSwipe from './useSwipe';
import { Photo, PhotoGalleryProps } from './PhotoGallery.types';

export default function PhotoGallery({
  eventId,
  albumId,
  canUpload = true,
  guestToken,
  userPermissions = {
    upload: true,
    download: true,
    moderate: false,
    delete: false
  },
  approvalMode = 'auto'
}: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<Photo[]>([]);
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
  const [showPendingApproval, setShowPendingApproval] = useState(false);

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
  const getCacheKey = useCallback((eventId: string, albumId: string | null) => {
    return albumId === null ? `event_${eventId}` : `album_${albumId}`;
  }, []);

  // Fetch photos using only eventId (no albumId)
  const fetchPhotosFromAPI = useCallback(async (forceRefresh = false) => {
    const authToken = token || localStorage.getItem('authToken');
    const isGuestAccess = Boolean(guestToken);

    if (!authToken && !isGuestAccess) {
      console.error('No auth token or guest token available');
      return false;
    }

    try {
      const cacheKey = getCacheKey(eventId, null);
      const lastFetch = lastFetchTime.current.get(cacheKey) || 0;
      const now = Date.now();
      const cacheAge = now - lastFetch;
      const CACHE_DURATION = 30000; // 30 seconds

      // Use cache if not forcing refresh and cache is fresh
      if (!forceRefresh && cacheAge < CACHE_DURATION && imageCache.current.has(cacheKey)) {
        const cachedPhotos = imageCache.current.get(cacheKey)!;
        console.log(`Using cached photos (${cachedPhotos.length} items, ${cacheAge}ms old)`);
        setPhotos(cachedPhotos);
        return true;
      }

      console.log('Fetching photos from API (event only)...');

      let mediaItems;
      if (isGuestAccess && guestToken) {
        mediaItems = await getEventMediaWithGuestToken(eventId, guestToken, true);
      } else if (authToken) {
        mediaItems = await getEventMedia(eventId, authToken, true);
      }

      if (mediaItems && Array.isArray(mediaItems)) {
        const transformedPhotos = mediaItems.map(transformMediaToPhoto);

        // Separate approved and pending photos
        const approvedPhotos = transformedPhotos.filter(photo =>
          !photo.approval || photo.approval.status === 'approved' || photo.approval.status === 'auto_approved'
        );
        const pendingPhotos = transformedPhotos.filter(photo =>
          photo.approval && photo.approval.status === 'pending'
        );

        console.log(`Fetched ${approvedPhotos.length} approved photos, ${pendingPhotos.length} pending`);

        // Update cache
        imageCache.current.set(cacheKey, approvedPhotos);
        lastFetchTime.current.set(cacheKey, now);

        setPhotos(approvedPhotos);
        setPendingPhotos(pendingPhotos);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error fetching photos from API:', error);
      return false;
    }
  }, [token, eventId, guestToken, getCacheKey]);

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
        const currentAlbumId = albumId;
        const currentDefaultAlbumId = defaultAlbumId;
        const currentEventId = eventId;

        const isEventPhotosMode = currentAlbumId === null && currentEventId;

        if (!isEventPhotosMode && !currentAlbumId && !currentDefaultAlbumId && !currentEventId) {
          setIsLoading(false);
          return;
        }

        const apiSuccess = await fetchPhotosFromAPI();

        if (!isMounted ||
          currentAlbumId !== albumId ||
          currentDefaultAlbumId !== defaultAlbumId ||
          currentEventId !== eventId) {
          return;
        }

        if (!apiSuccess) {
          // Fallback to local database
          try {
            if (isEventPhotosMode || (currentEventId && !currentAlbumId && !currentDefaultAlbumId)) {
              const eventPhotos = await db.photos
                .where('eventId')
                .equals(currentEventId)
                .reverse()
                .sortBy('createdAt');

              if (isMounted && currentEventId === eventId) {
                setPhotos(eventPhotos);
              }
            } else {
              const targetAlbumId = currentAlbumId || currentDefaultAlbumId;
              if (targetAlbumId) {
                const albumPhotos = await db.photos
                  .where('albumId')
                  .equals(targetAlbumId)
                  .reverse()
                  .sortBy('createdAt');

                if (isMounted && currentAlbumId === albumId && currentDefaultAlbumId === defaultAlbumId) {
                  setPhotos(albumPhotos);
                }
              }
            }
          } catch (dbError) {
            if (isMounted) {
              console.error('Error loading photos from local DB:', dbError);
              toast.error("Failed to load photos from local storage");
            }
          }
        }
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

    const isEventPhotosMode = albumId === null && eventId;

    // if ((isEventPhotosMode || albumId || (defaultAlbumId && defaultAlbumId !== null) || eventId) && !isLoading) {
    loadPhotos();
    // }

    // Setup realtime polling with smart caching
    let intervalId: NodeJS.Timeout | null = null;
    if (isRealtime) {
      intervalId = setInterval(() => {
        if (isMounted && !isLoading) {
          fetchPhotosFromAPI(false).catch(err => {
            if (isMounted) console.error('Error in interval photo fetch:', err);
          });
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
  }, [albumId, defaultAlbumId, eventId, fetchPhotosFromAPI, isRealtime, guestToken]);

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

        const maxSize = 50 * 1024 * 1024; // 50MB based on our new schema
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
        validFiles.map(async (file, index) => {
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
        // Separate photos by approval status
        const approvedPhotos = newPhotos.filter(photo =>
          photo.approval?.status === 'approved' || photo.approval?.status === 'auto_approved'
        );
        const pendingPhotos = newPhotos.filter(photo =>
          photo.approval?.status === 'pending'
        );

        if (approvedPhotos.length > 0) {
          setPhotos(prev => [...approvedPhotos, ...prev]);
          // Invalidate cache
          const cacheKey = getCacheKey(eventId, albumId ?? null);
          imageCache.current.delete(cacheKey);
        }

        if (pendingPhotos.length > 0) {
          setPendingPhotos(prev => [...pendingPhotos, ...prev]);
          if (userPermissions.moderate) {
            toast.info(`${pendingPhotos.length} photo${pendingPhotos.length > 1 ? 's' : ''} pending approval`);
          }
        }
      }

      toast.dismiss(progressToast);

      if (successfulUploads.length > 0) {
        const approvedCount = newPhotos.filter(p => p.approval?.status !== 'pending').length;
        const pendingCount = newPhotos.length - approvedCount;

        if (pendingCount > 0) {
          toast.success(`${approvedCount} photo${approvedCount !== 1 ? 's' : ''} uploaded. ${pendingCount} pending approval.`);
        } else {
          toast.success(`${successfulUploads.length} photo${successfulUploads.length > 1 ? 's' : ''} uploaded successfully.`);
        }
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

  // Photo approval functions (for moderators)
  const approvePhoto = async (photoId: string) => {
    if (!userPermissions.moderate) {
      toast.error("You don't have permission to moderate photos.");
      return;
    }

    try {
      // TODO: Add API call to approve photo
      // await approveMediaItem(photoId, token);

      // Update local state
      setPendingPhotos(prev => prev.filter(p => p.id !== photoId));
      const approvedPhoto = pendingPhotos.find(p => p.id === photoId);
      if (approvedPhoto) {
        approvedPhoto.approval = {
          ...approvedPhoto.approval,
          status: 'approved',
          approved_by: userId.toString(),
          approved_at: new Date()
        };
        setPhotos(prev => [approvedPhoto, ...prev]);
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
      // TODO: Add API call to reject photo
      // await rejectMediaItem(photoId, reason, token);

      // Update local state
      setPendingPhotos(prev => prev.filter(p => p.id !== photoId));
      toast.success("Photo rejected successfully.");
    } catch (error) {
      console.error('Error rejecting photo:', error);
      toast.error("Failed to reject photo.");
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

      setPhotos(photos.filter(p => p.id !== photoId));
      setPendingPhotos(prev => prev.filter(p => p.id !== photoId));

      // Invalidate cache
      const cacheKey = getCacheKey(eventId, albumId ?? null);
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

  console.log(photos, 'photosphotos')
  return (
    <div>
      {/* Header with live indicator and pending photos toggle */}
      <div className="flex items-center justify-between mb-6 px-4">
        <div className="flex items-center gap-3">
          {isRealtime && (
            <div className="flex items-center bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs px-2 py-1 rounded-full">
              <span className="h-2 w-2 bg-green-500 rounded-full mr-1.5"></span>
              Live
            </div>
          )}
          {userPermissions.moderate && pendingPhotos.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setShowPendingApproval(!showPendingApproval)}
            >
              <ClockIcon className="h-3 w-3 mr-1" />
              {pendingPhotos.length} Pending
            </Button>
          )}
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
      {/* Pending approval section for moderators */}
      {userPermissions.moderate && showPendingApproval && pendingPhotos.length > 0 && (
        <PendingApprovalSection
          pendingPhotos={pendingPhotos}
          approvePhoto={approvePhoto}
          rejectPhoto={rejectPhoto}
        />
      )}
      {/* Main photo grid */}
      {isLoading || isUploading ? (
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
          <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">No Photos Yet</h3>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
            {canUserUpload ?
              "Be the first to add photos to this album. Upload images or take new ones with your camera." :
              "No photos have been added to this album yet."
            }
          </p>
          {canUserUpload && (
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