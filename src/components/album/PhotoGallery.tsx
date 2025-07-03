// components/PhotoGallery.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import {
  CameraIcon,
  DownloadIcon,
  ShareIcon,
  TrashIcon,
  XIcon,
  InfoIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftIcon
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { db } from '@/lib/db';
import { toast } from "sonner";
import PhotoInfoDialog from '@/components/photo/PhotoInfoDialog';
import { uploadAlbumMedia, getAlbumMedia, getEventMedia, transformMediaToPhoto, deleteMedia } from '@/services/apis/media.api';
import { useAuthToken } from '@/hooks/use-auth';
import { getOrCreateDefaultAlbum } from '@/services/apis/albums.api';

// Add a swipe detection hook
const useSwipe = (onSwipeLeft: () => void, onSwipeRight: () => void) => {
  const touchStart = useRef(null);
  const touchEnd = useRef(null);

  // the required distance between touchStart and touchEnd to be detected as a swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e: any) => {
    touchEnd.current = null;
    touchStart.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: any) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;

    const distance = touchStart.current - touchEnd.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      onSwipeLeft();
    } else if (isRightSwipe) {
      onSwipeRight();
    }
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
};

type Photo = {
  id: string;
  albumId: string | null; // Allow null for photos in event photos mode
  eventId: string;
  takenBy: number;
  imageUrl: string;
  thumbnail?: string;
  createdAt: Date;
  metadata?: {
    location?: { lat: number; lng: number };
    device?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  };
};

interface PhotoGalleryProps {
  eventId: string;
  albumId?: string | null; // Now optional to handle default album scenarios
  canUpload?: boolean;
}

export default function PhotoGallery({ eventId, albumId, canUpload = true }: PhotoGalleryProps) {
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const token = useAuthToken(); // Get auth token from your auth hook

  // User ID would come from auth in a real app
  const userId = 1;

  // Interval for polling new photos if we want to simulate realtime
  const realtimeInterval = useRef<NodeJS.Timeout | null>(null);

  // Function to navigate to next/previous photos
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

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!photoViewerOpen) return;

      if (e.key === 'ArrowRight') {
        navigateToPhoto('next');
      } else if (e.key === 'ArrowLeft') {
        navigateToPhoto('prev');
      } else if (e.key === 'Escape') {
        setPhotoViewerOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photoViewerOpen, navigateToPhoto]);

  // Get default album if albumId is not provided and we're not in event photos mode
  useEffect(() => {
    // Check if we're in event photos mode (albumId is explicitly null)
    const isEventPhotosMode = albumId === null;

    // Skip default album fetch in event photos mode or if missing requirements
    if (isEventPhotosMode || !eventId) {
      console.log(`Skipping default album fetch - ${isEventPhotosMode ? 'in event photos mode' : 'missing eventId'}`);
      return;
    }

    // Get token from hook or localStorage
    const authToken = token || localStorage.getItem('authToken');
    if (!authToken) {
      console.log('Skipping default album fetch - missing auth token');
      return;
    }

    // Flag to track if component is mounted
    let isMounted = true;

    const fetchDefaultAlbum = async () => {
      // If albumId is explicitly provided, use it and don't fetch default
      if (albumId) {
        if (isMounted) {
          console.log(`Using provided albumId: ${albumId}`);
          setDefaultAlbumId(albumId);
        }
        return;
      }

      // Skip the API call if we already have a defaultAlbumId
      if (defaultAlbumId) {
        console.log(`Already have defaultAlbumId: ${defaultAlbumId}`);
        return;
      }

      try {
        console.log(`Fetching default album for event ${eventId}`);

        // Get or create default album in one call
        const defaultAlbum = await getOrCreateDefaultAlbum(eventId, authToken);

        // Only update state if component is still mounted
        if (isMounted) {
          if (defaultAlbum) {
            console.log('Found/created default album:', defaultAlbum.id);
            setDefaultAlbumId(defaultAlbum.id);
          } else {
            console.error('Failed to get or create default album');
            toast.error("Could not load album. Please try again later.");
          }
        }
      } catch (error) {
        // Only update state if component is still mounted
        if (isMounted) {
          console.error('Error fetching default album:', error);
          toast.error("Error loading album. Please try again.");
        }
      }
    };

    fetchDefaultAlbum();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [eventId, albumId, token, defaultAlbumId]);

  // Function to load photos from the backend API
  const fetchPhotosFromAPI = useCallback(async () => {
    console.log('asdfasdfasdfasdfasdfasdf');
    // Get token from localStorage if not available through hook
    const authToken = token || localStorage.getItem('authToken');
    if (!authToken) {
      console.error('No auth token available - please ensure you are logged in');
      return false;
    }

    try {
      let mediaItems;
      // Store these values to avoid issues with state changes during the fetch
      const currentAlbumId = albumId;
      const currentDefaultAlbumId = defaultAlbumId;
      const currentEventId = eventId;

      // Log the fetch attempt with exact values we're using
      console.log('Attempting to fetch photos with:', {
        albumId: currentAlbumId,
        defaultAlbumId: currentDefaultAlbumId,
        eventId: currentEventId
      });

      // Prioritize by eventId if albumId is explicitly set to null - for the Photos tab in event page
      if (currentAlbumId === null && currentEventId) {
        // Intentionally fetch ALL photos for this event (across all albums)
        console.log(`Intentionally fetching ALL photos for event: ${currentEventId} (Photos tab)`);
        // Make sure to set includeAllAlbums=true to get photos from all albums in this event
        mediaItems = await getEventMedia(currentEventId, authToken, true);
      } else if (currentAlbumId || currentDefaultAlbumId) {
        // Fetch photos for a specific album
        const targetAlbumId = currentAlbumId || currentDefaultAlbumId;
        if (targetAlbumId) {
          console.log(`Fetching photos for album: ${targetAlbumId}`);
          mediaItems = await getAlbumMedia(targetAlbumId, authToken);
        } else {
          console.error('Album ID is null, cannot fetch photos');
          return false;
        }
      } else if (currentEventId) {
        // Fetch all photos for an event (across all albums)
        console.log(`Fetching photos for event: ${currentEventId}`);
        mediaItems = await getEventMedia(currentEventId, authToken, true); // Explicitly set includeAllAlbums=true
      } else {
        console.error('No albumId, defaultAlbumId, or eventId provided');
        return false;
      }

      // Transform API media items to your app's photo format
      if (mediaItems && Array.isArray(mediaItems)) {
        const transformedPhotos = mediaItems.map(transformMediaToPhoto);
        console.log(`Successfully fetched ${transformedPhotos.length} photos from API`);

        // Only update state if the component is still mounted and using the same IDs
        // This prevents state updates if props changed during the async operation
        if (currentAlbumId === albumId && currentDefaultAlbumId === defaultAlbumId &&
          currentEventId === eventId) {
          setPhotos(transformedPhotos);
          return true;
        } else {
          console.warn('Component props changed during fetch, skipping state update');
          return false;
        }
      }

      return false;
    } catch (error) {
      console.error('Error fetching photos from API:', error);
      return false;
    }
  }, [token, albumId, defaultAlbumId, eventId]);

  // Load photos when component mounts or dependencies change
  useEffect(() => {
    // Flag to track if component is mounted
    let isMounted = true;

    const loadPhotos = async () => {
      // If values have changed since effect was triggered, don't proceed
      if (!isMounted) return;

      setIsLoading(true);

      try {
        // Capture current values to ensure we're using consistent values throughout the async operation
        const currentAlbumId = albumId;
        const currentDefaultAlbumId = defaultAlbumId;
        const currentEventId = eventId;

        // Log exact params we're using for fetch
        console.log('Loading photos with params:', {
          albumId: currentAlbumId === null ? 'null (event photos mode)' : currentAlbumId,
          defaultAlbumId: currentDefaultAlbumId,
          eventId: currentEventId
        });

        // Check if we're in event photos mode (albumId explicitly set to null)
        const isEventPhotosMode = currentAlbumId === null && currentEventId;

        // Only proceed if we have the necessary IDs or we're in event photos mode
        if (!isEventPhotosMode && !currentAlbumId && !currentDefaultAlbumId && !currentEventId) {
          console.warn('No albumId, defaultAlbumId, or eventId available for photo loading');
          setIsLoading(false);
          return;
        }

        // First try to fetch from the backend API
        const apiSuccess = await fetchPhotosFromAPI();

        // Check if component is still mounted and using same IDs
        if (!isMounted ||
          currentAlbumId !== albumId ||
          currentDefaultAlbumId !== defaultAlbumId ||
          currentEventId !== eventId) {
          console.log('Component state changed during API fetch, aborting');
          return;
        }

        if (!apiSuccess) {
          console.log('API fetch failed or returned no data, falling back to local DB');
          // Fallback to local database
          try {
            // Check if we're in event photos mode (explicitly set to show all photos for an event)
            const isEventPhotosMode = currentAlbumId === null && currentEventId;

            // If in event photos mode or no album ID available, fetch by eventId
            if (isEventPhotosMode || (currentEventId && !currentAlbumId && !currentDefaultAlbumId)) {
              console.log(`Loading photos for event ID ${currentEventId} from local DB (event photos mode)`);
              // For eventId with no album specified, try to find photos by eventId
              const eventPhotos = await db.photos
                .where('eventId')
                .equals(currentEventId)
                .reverse()
                .sortBy('createdAt');

              // Check if component is still mounted and using same IDs before updating state
              if (isMounted && currentEventId === eventId) {
                console.log(`Loaded ${eventPhotos.length} event photos from local database`);
                setPhotos(eventPhotos);
              }
            } else {
              // For album mode, we need an albumId
              const targetAlbumId = currentAlbumId || currentDefaultAlbumId;

              if (targetAlbumId) {
                const albumPhotos = await db.photos
                  .where('albumId')
                  .equals(targetAlbumId)
                  .reverse()
                  .sortBy('createdAt');

                // Check if component is still mounted and using same IDs before updating state
                if (isMounted && currentAlbumId === albumId && currentDefaultAlbumId === defaultAlbumId) {
                  console.log(`Loaded ${albumPhotos.length} photos from local database for album ${targetAlbumId}`);
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

    // Check if we're in event photos mode (albumId is explicitly null, meaning show all event photos)
    const isEventPhotosMode = albumId === null && eventId;

    // Only load photos if we have necessary props
    // We should load photos if:
    // 1. We're in event photos mode (albumId is null and we have eventId)
    // 2. We have an explicit albumId
    // 3. We have a defaultAlbumId
    // 4. We have an eventId (as fallback)
    if ((isEventPhotosMode || albumId || (defaultAlbumId && defaultAlbumId !== null) || eventId) && !isLoading) {
      console.log(`Loading photos with: albumId=${albumId}, defaultAlbumId=${defaultAlbumId}, eventId=${eventId}, isEventPhotosMode=${isEventPhotosMode}`);
    }
    loadPhotos();

    // Simulated realtime updates (polling) - in a real app this would be WebSockets
    let intervalId: NodeJS.Timeout | null = null;
    if (isRealtime) {
      intervalId = setInterval(() => {
        if (isMounted && !isLoading) {
          fetchPhotosFromAPI().catch(err => {
            if (isMounted) console.error('Error in interval photo fetch:', err);
          });
        }
      }, 30000); // Poll every 30 seconds
      realtimeInterval.current = intervalId;
    }

    // Cleanup function
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (realtimeInterval.current) {
        clearInterval(realtimeInterval.current);
      }
    };
    // Removed isLoading from dependency array to prevent infinite loops
  }, [albumId, defaultAlbumId, eventId, fetchPhotosFromAPI, isRealtime]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if we're in event photos mode (albumId is explicitly null)
    const isEventPhotosMode = albumId === null && eventId;

    // When in event photos mode, we'll let the backend choose the default album
    // Otherwise, ensure we have an albumId to use (either provided or default)
    const targetAlbumId = isEventPhotosMode ? null : (albumId || defaultAlbumId);

    // In event photos mode we don't need an albumId, otherwise we do
    if (!isEventPhotosMode && !targetAlbumId) {
      toast.error("No album available for uploading. Please try again later.");
      return;
    }

    // Validate token
    if (!token) {
      toast.error("You need to be logged in to upload photos.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadDialogOpen(false);

      // Show initial upload toast with progress indication
      const uploadingToast = toast.loading(`Preparing ${files.length} photo${files.length > 1 ? 's' : ''} for upload...`);

      // Validate files before uploading with detailed feedback
      const validFiles = Array.from(files).filter(file => {
        // Check file type
        if (!file.type.startsWith('image/')) {
          toast.error(`"${file.name}" is not a valid image file.`);
          console.error(`Invalid file type: ${file.type} for file ${file.name}`);
          return false;
        }

        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          const sizeMB = (file.size / 1024 / 1024).toFixed(2);
          toast.error(`"${file.name}" is too large (${sizeMB}MB). Maximum size is 10MB.`);
          console.error(`File too large: ${sizeMB}MB exceeds limit of 10MB`);
          return false;
        }

        return true;
      });

      if (validFiles.length === 0) {
        toast.dismiss(uploadingToast);
        toast.error("No valid image files to upload.");
        setIsUploading(false);
        return;
      }

      // Update toast with actual upload status
      toast.dismiss(uploadingToast);
      const progressToast = toast.loading(`Uploading ${validFiles.length} photo${validFiles.length > 1 ? 's' : ''}...`, {
        duration: 60000 // Long duration for upload process
      });

      // Track upload progress
      let completedUploads = 0;

      // Process each file
      const results = await Promise.allSettled(
        validFiles.map(async (file, index) => {
          try {
            console.log(`Uploading file ${index + 1}/${validFiles.length}: ${file.name} (${file.size} bytes) to album ${targetAlbumId}`);

            // Upload to API, passing both albumId and eventId for better server-side handling
            const uploadedData = await uploadAlbumMedia(file, targetAlbumId, token, eventId);

            // Update progress
            completedUploads++;
            toast.dismiss(progressToast);
            toast.loading(`Uploaded ${completedUploads}/${validFiles.length} photos...`, {
              id: progressToast,
              duration: 60000
            });

            // Create photo record with data from API response
            const photoId = uploadedData._id || uploadedData.id || uuidv4();

            // Get the actual albumId from the response, or use our targetAlbumId
            // The server might have assigned it to the default album
            const responseAlbumId = uploadedData.album_id || targetAlbumId;

            const newPhoto: Photo = {
              id: photoId,
              albumId: responseAlbumId,
              eventId,
              takenBy: userId,
              imageUrl: uploadedData.url, // URL from API response
              thumbnail: uploadedData.thumbnail_url || uploadedData.url, // Assuming API provides thumbnail URL
              createdAt: new Date(),
              metadata: {
                device: navigator.userAgent,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size
              }
            };

            try {
              // Only store in local DB if we have a valid albumId (DB schema might require it)
              if (newPhoto.albumId) {
                await db.photos.add({
                  ...newPhoto,
                  albumId: newPhoto.albumId // Ensure it's not null for DB
                });
                console.log('Added photo to local DB:', newPhoto);
              } else {
                console.log('Skipping local DB storage as albumId is null');
              }
            } catch (dbError) {
              console.warn('Failed to add to local DB, continuing:', dbError);
            }

            // Also immediately add to the UI
            setPhotos(prevPhotos => [newPhoto, ...prevPhotos]);

            return newPhoto;
          } catch (error) {
            console.error(`Error uploading file ${file.name}:`, error);
            throw error;
          }
        })
      );

      // Process results
      const successfulUploads = results.filter(r => r.status === 'fulfilled');
      const failedUploads = results.filter(r => r.status === 'rejected');

      // Get the new photos
      const newPhotos = successfulUploads.map(r => (r as PromiseFulfilledResult<any>).value);

      // Update state with new photos if any succeeded
      if (newPhotos.length > 0) {
        setPhotos(prev => [...newPhotos, ...prev]);
      }

      // Show appropriate toast messages for the final result
      toast.dismiss(progressToast);

      if (successfulUploads.length > 0) {
        toast.success(`${successfulUploads.length} photo${successfulUploads.length > 1 ? 's' : ''} uploaded successfully.`);
      }

      if (failedUploads.length > 0) {
        // Show specific error for each failed upload
        toast.error(`Failed to upload ${failedUploads.length} photo${failedUploads.length > 1 ? 's' : ''}.`);

        // Log detailed errors and show in UI
        failedUploads.forEach((result, i) => {
          const error = (result as PromiseRejectedResult).reason;
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error(`Failed upload #${i + 1}:`, error);

          // Show individual error messages for each failed file
          if (i < 3) { // Limit to first 3 errors to avoid spam
            toast.error(`Upload failed: ${errorMessage}`, {
              duration: 8000,
              id: `upload-error-${i}`
            });
          }
        });

        // If we have many failed uploads, provide guidance
        if (failedUploads.length > 3) {
          toast.error(`Check browser console for details on all ${failedUploads.length} failed uploads.`);
        }

        // If all uploads failed due to server errors, suggest using diagnostic tool
        if (failedUploads.length === validFiles.length) {
          toast.error(
            "All uploads failed. Try the diagnostics tool to troubleshoot.",
            { duration: 10000, id: 'suggest-diagnostic' }
          );
        }
      }

      // Reset file inputs regardless of success/failure
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      const errorMessage = error instanceof Error ? error.message : "There was an error uploading your photos.";
      toast.error(errorMessage, { duration: 8000 });

      // Additional debug information
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
      }

      // Add a clickable toast that links to the diagnostic page
      toast.error(
        <div onClick={() => window.location.href = '/diagnostic'} className="cursor-pointer">
          Click here to visit the diagnostics page for troubleshooting help.
        </div>,
        {
          duration: 10000,
          id: 'diagnostics-link'
        }
      );
    } finally {
      setIsUploading(false);
    }
  };

  const deletePhoto = async (photoId: string) => {
    try {
      // Show a loading toast
      const loadingToast = toast.loading("Deleting photo...");

      // First try to delete from the backend API
      if (token) {
        try {
          await deleteMedia(photoId, token);
          console.log('Successfully deleted photo from backend');
        } catch (apiError) {
          console.error('Error deleting photo from backend:', apiError);
          // Continue with local deletion even if API delete fails
        }
      }

      // Then delete from local DB
      await db.photos
        .where('id')
        .equals(photoId)
        .delete();

      // Update state
      setPhotos(photos.filter(p => p.id !== photoId));

      // Close photo viewer if open
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null);
        setPhotoViewerOpen(false);
      }

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success("The photo has been removed from the album.");
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error("There was an error deleting the photo.");
    }
  };

  const handleCameraCapture = () => {
    // Trigger the camera input
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const downloadPhoto = (photo: Photo) => {
    const link = document.createElement('a');
    link.href = photo.imageUrl;
    link.download = `photo-${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openPhotoViewer = (photo: Photo, index: number) => {
    setSelectedPhoto(photo);
    setSelectedPhotoIndex(index);
    setPhotoViewerOpen(true);
  };

  // Component for the full-screen mobile photo viewer
  const FullscreenPhotoViewer = () => {
    if (!selectedPhoto) return null;

    return (
      <div
        className="fixed inset-0 z-50 bg-black flex flex-col"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 text-white">
          <Button
            variant="ghost"
            size="icon"
            className="text-white"
            onClick={() => setIsFullscreen(false)}
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>

          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-white"
              onClick={() => downloadPhoto(selectedPhoto)}
            >
              <DownloadIcon className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-white"
              onClick={(e) => {
                e.stopPropagation();
                const shareUrl = `${window.location.origin}/shared/photos/${selectedPhoto.id}`;
                if (navigator.share) {
                  navigator.share({
                    title: 'Check out this photo',
                    url: shareUrl
                  });
                } else {
                  navigator.clipboard.writeText(shareUrl);
                  toast("Share link copied to clipboard");
                }
              }}
            >
              <ShareIcon className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-white"
              onClick={() => setPhotoInfoOpen(true)}
            >
              <InfoIcon className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-red-400"
              onClick={() => {
                if (confirm('Are you sure you want to delete this photo?')) {
                  deletePhoto(selectedPhoto.id);
                }
              }}
            >
              <TrashIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main image with navigation */}
        <div className="flex-1 relative overflow-hidden">
          {/* Left navigation button (desktop only) */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex absolute left-4 top-1/2 transform -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/30 text-white"
            onClick={() => navigateToPhoto('prev')}
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </Button>

          {/* Image */}
          <div className="h-full w-full flex items-center justify-center bg-black">
            <Image
              src={selectedPhoto.imageUrl}
              alt="Photo"
              fill
              className="object-contain"
            />
          </div>

          {/* Right navigation button (desktop only) */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex absolute right-4 top-1/2 transform -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/30 text-white"
            onClick={() => navigateToPhoto('next')}
          >
            <ChevronRightIcon className="h-6 w-6" />
          </Button>
        </div>

        {/* Footer with photo info */}
        <div className="p-4 text-xs text-gray-300">
          <div className="flex items-center justify-between">
            <div>
              {selectedPhotoIndex !== null && (
                <span>{selectedPhotoIndex + 1} of {photos.length}</span>
              )}
            </div>

            <div>
              <time>
                {selectedPhoto.createdAt.toLocaleDateString()}
              </time>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <h2 className="text-2xl font-bold">Photos</h2>
          {isRealtime && (
            <div className="flex items-center ml-3 bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full">
              <span className="h-2 w-2 bg-green-500 rounded-full mr-1.5"></span>
              Live
            </div>
          )}
        </div>

        {canUpload && (defaultAlbumId || albumId !== undefined || albumId === null) && (
          <div className="flex space-x-2">
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={isUploading}>
                  <CameraIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">
                    {isUploading ? 'Uploading...' : 'Add Photos'}
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Photos</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 py-4">
                  <div
                    className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <div className="bg-gray-100 p-3 rounded-full mb-2">
                      <DownloadIcon className="h-6 w-6 text-gray-500" />
                    </div>
                    <h3 className="font-medium text-sm">Upload Photos</h3>
                    <p className="text-xs text-gray-500 text-center mt-1">
                      Select photos from your device
                    </p>
                  </div>

                  <div
                    className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={handleCameraCapture}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      ref={cameraInputRef}
                      onChange={handleFileUpload}
                    />
                    <div className="bg-primary/10 p-3 rounded-full mb-2">
                      <CameraIcon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-medium text-sm">Take Photo</h3>
                    <p className="text-xs text-gray-500 text-center mt-1">
                      Capture a new photo with camera
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                    Cancel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
              disabled={isUploading}
            >
              <DownloadIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">
                {isUploading ? 'Uploading...' : 'Upload'}
              </span>
            </Button>

            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
          </div>
        )}
      </div>

      {isLoading || isUploading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : !defaultAlbumId && !albumId && albumId !== null && !eventId ? (
        // Only show "Loading Album..." when we're not in event photos mode
        <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed rounded-lg">
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <CameraIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-700 mb-2">Loading Album...</h3>
          <p className="text-gray-500 text-center max-w-md mb-6">
            Please wait while we prepare your album.
          </p>
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed rounded-lg">
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <CameraIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-700 mb-2">No Photos Yet</h3>
          <p className="text-gray-500 text-center max-w-md mb-6">
            Be the first to add photos to this album. Upload images or take new ones with your camera.
          </p>
          {canUpload && (
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
          {/* Optimized responsive grid with smaller gaps on mobile */}
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-1 sm:gap-2 md:gap-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="relative aspect-square bg-gray-100 cursor-pointer overflow-hidden"
                onClick={() => {
                  openPhotoViewer(photo, index);
                  // On mobile, go straight to fullscreen
                  if (window.innerWidth < 768) {
                    setIsFullscreen(true);
                  }
                }}
              >
                <Image
                  src={photo.imageUrl}
                  alt="Photo"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 33vw, 25vw"
                  loading="lazy"
                />
              </div>
            ))}
          </div>

          {/* Desktop Dialog Photo Viewer */}
          {!isFullscreen && (
            <Dialog open={photoViewerOpen} onOpenChange={setPhotoViewerOpen}>
              <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col p-0 gap-0">
                {selectedPhoto && (
                  <>
                    <div className="flex items-center justify-between p-4 border-b">
                      <DialogTitle>Photo Details</DialogTitle>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsFullscreen(true)}
                        >
                          <div className="h-4 w-4 border-2 border-current" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => downloadPhoto(selectedPhoto)}
                        >
                          <DownloadIcon className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            const shareUrl = `${window.location.origin}/shared/photos/${selectedPhoto.id}`;

                            if (navigator.share) {
                              navigator.share({
                                title: 'Check out this photo',
                                url: shareUrl
                              });
                            } else {
                              navigator.clipboard.writeText(shareUrl);
                              toast("Share link copied to clipboard");
                            }
                          }}
                        >
                          <ShareIcon className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePhoto(selectedPhoto.id);
                          }}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPhotoViewerOpen(false)}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div
                      className="flex-1 relative overflow-hidden"
                      onTouchStart={onTouchStart}
                      onTouchMove={onTouchMove}
                      onTouchEnd={onTouchEnd}
                    >
                      {/* Navigation arrows for desktop */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-black/30 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToPhoto('prev');
                        }}
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </Button>

                      <Image
                        src={selectedPhoto.imageUrl}
                        alt="Photo"
                        fill
                        className="object-contain"
                      />

                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-black/30 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToPhoto('next');
                        }}
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </Button>
                    </div>

                    <div className="p-4 border-t text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-gray-500">Uploaded </span>
                          <time className="text-gray-700">
                            {selectedPhoto.createdAt.toLocaleDateString()} at {selectedPhoto.createdAt.toLocaleTimeString()}
                          </time>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center text-gray-500 text-xs"
                          onClick={() => setPhotoInfoOpen(true)}
                        >
                          <InfoIcon className="h-3 w-3 mr-1" />
                          Photo Info
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>
          )}

          {/* Mobile Fullscreen Photo Viewer */}
          {isFullscreen && selectedPhoto && <FullscreenPhotoViewer />}

          {/* Photo Info Dialog */}
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