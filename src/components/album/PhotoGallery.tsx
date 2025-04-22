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
  albumId: string;
  eventId: string;
  takenBy: number;
  imageUrl: string;
  thumbnail?: string;
  createdAt: Date;
  metadata?: {
    location?: { lat: number; lng: number };
    device?: string;
  };
};

interface PhotoGalleryProps {
  eventId: string;
  albumId: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    const loadPhotos = async () => {
      try {
        const photosList = await db.photos
          .where('albumId')
          .equals(albumId)
          .sortBy('createdAt');
        
        // Reverse to show newest first
        setPhotos(photosList.reverse());
      } catch (error) {
        console.error('Error loading photos:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPhotos();
    
    // Set up polling for "realtime" updates if enabled
    if (isRealtime) {
      realtimeInterval.current = setInterval(loadPhotos, 5000);
    }
    
    return () => {
      if (realtimeInterval.current) {
        clearInterval(realtimeInterval.current);
      }
    };
  }, [albumId, isRealtime]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    try {
      setUploadDialogOpen(false);
      
      // Process each file
      const uploadPromises = Array.from(files).map(async (file) => {
        // Convert file to base64 (in a real app, you'd upload to cloud storage)
        const reader = new FileReader();
        const imageDataPromise = new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
        });
        reader.readAsDataURL(file);
        const imageData = await imageDataPromise;
        
        // Create a thumbnail (simplified here - in a real app you'd generate proper thumbnails)
        // For now, we'll just use the same image
        const thumbnail = imageData;
        
        // Create photo record
        const photoId = uuidv4();
        const newPhoto = {
          id: photoId,
          albumId,
          eventId,
          takenBy: userId,
          imageUrl: imageData,
          thumbnail,
          createdAt: new Date(),
          metadata: {
            device: navigator.userAgent
          }
        };
        
        await db.photos.add(newPhoto);
        return newPhoto;
      });
      
      const newPhotos = await Promise.all(uploadPromises);
      
      // Update state with new photos
      setPhotos([...newPhotos, ...photos]);
      
      // Show success message
      toast(`${files.length} photo${files.length > 1 ? 's' : ''} uploaded successfully.`);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error("There was an error uploading your photos.");
    }
  };
  
  const deletePhoto = async (photoId: string) => {
    try {
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
      
      toast("The photo has been removed from the album.");
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error("There was an error deleting the photo.");
    }
  };
  
  const handleCameraCapture = () => {
    // In a real app, you'd implement camera access using the browser API
    // For simplicity, we'll just trigger the file upload dialog
    if (fileInputRef.current) {
      fileInputRef.current.click();
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
        
        {canUpload && (
          <div className="flex space-x-2">
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <CameraIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Photos</span>
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
            >
              <DownloadIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Upload</span>
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
      
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
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