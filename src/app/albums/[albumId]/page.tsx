// app/albums/[albumId]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Camera, Share2, PencilIcon, Grid, MoreVertical, X, Upload } from 'lucide-react';
import { db } from '@/lib/db';
import { AlbumQR } from '@/components/album/AlbumQR';
import { PhotoGrid } from '@/components/photo/PhotoGrid';
import PhotoGallery from '@/components/album/PhotoGallery';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CameraCapture } from '@/components/camera/CameraCapture';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import React from 'react';

interface AlbumPageProps {
  params: Promise<{ albumId: string }>;
}

export default function AlbumPage({ params }: AlbumPageProps) {
  const { albumId } = React.use(params);
  const router = useRouter();
  const [album, setAlbum] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("photos");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userId = 1; // In a real app, get this from authentication

  useEffect(() => {
    const loadAlbum = async () => {
      try {
        // Try to get the auth token from local storage
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          console.error('No auth token found');
          toast.error("Authentication required. Please log in again.");
          router.push('/login');
          return;
        }

        // Import the album API functions
        const { getAlbumById } = await import('@/services/apis/albums.api');
        
        console.log(`Fetching album details for album ID: ${albumId}`);
        const albumData = await getAlbumById(albumId, authToken);
        
        if (!albumData) {
          console.error(`Album not found with ID: ${albumId}`);
          toast.error("Album not found");
          router.push('/events');
          return;
        }
        
        console.log('Album data loaded successfully:', albumData);
        setAlbum(albumData);

        // For now, we'll still use the local DB for photos
        // In the future, this should be replaced with an API call
        const photosList = await db.photos.where('albumId').equals(albumId).toArray();
        setPhotos(photosList);
      } catch (error) {
        console.error('Error loading album:', error);
        toast.error("Failed to load album details");
      } finally {
        setLoading(false);
      }
    };

    loadAlbum();
  }, [albumId, router]);

  const checkCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission(true);
      return true;
    } catch (error) {
      console.error("Camera permission error:", error);
      setCameraPermission(false);
      return false;
    }
  };

  const handleCameraClick = async () => {
    if (cameraPermission === null) {
      const hasPermission = await checkCameraPermission();
      if (hasPermission) {
        setCameraOpen(true);
      }
    } else if (cameraPermission) {
      setCameraOpen(true);
    } else {
      alert("Camera access is required. Please allow camera access in your browser settings.");
    }
  };

  const handlePhotoCapture = (photoId: string) => {
    db.photos
      .where('albumId')
      .equals(albumId)
      .toArray()
      .then(updatedPhotos => {
        setPhotos(updatedPhotos);
        setCameraOpen(false);
      });
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      try {
        // Convert to data URL for storage
        const imageUrl = await readFileAsDataURL(file);

        // Create a thumbnail
        const thumbnail = await createThumbnail(imageUrl, 300);

        // Generate a unique ID
        const photoId = `photo_${Date.now()}_${i}`;

        // Save to database
        // await db.photos.add({
        //   id: photoId,
        //   albumId,
        //   imageUrl,
        //   thumbnail,
        //   createdAt: new Date(),
        //   takenBy: userId
        // });
      } catch (error) {
        console.error('Error processing image:', error);
      }
    }

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Reload photos
    const updatedPhotos = await db.photos.where('albumId').equals(albumId).toArray();
    setPhotos(updatedPhotos);
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const createThumbnail = (dataUrl: string, maxWidth: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        const aspectRatio = img.width / img.height;
        const width = Math.min(maxWidth, img.width);
        const height = width / aspectRatio;

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Get data URL from canvas
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  };

  const handlePhotoDelete = async (photoId: string) => {
    try {
      // Refresh photos after deletion
      const updatedPhotos = await db.photos.where('albumId').equals(albumId).toArray();
      setPhotos(updatedPhotos);
    } catch (error) {
      console.error('Error refreshing photos after delete:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!album) {
    return <div className="text-center py-8">Album not found</div>;
  }

  const isOwner = album.createdById === userId;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{album.name}</h1>
          <p className="text-sm text-gray-500">
            {photos.length} photos • Created {new Date(album.createdAt).toLocaleDateString()}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOwner && (
              <DropdownMenuItem onClick={() => router.push(`/albums/${albumId}/edit`)}>
                <PencilIcon className="h-4 w-4 mr-2" /> Edit album
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setActiveTab("share")}>
              <Share2 className="h-4 w-4 mr-2" /> Share album
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs defaultValue="photos" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="photos">
            <Grid className="h-4 w-4 mr-2" /> Photos
          </TabsTrigger>
          <TabsTrigger value="share">
            <Share2 className="h-4 w-4 mr-2" /> Share
          </TabsTrigger>
        </TabsList>

        <TabsContent value="photos" className="mt-0">
          {/* Use the same PhotoGallery component from the event details page */}
          {album && (
            <PhotoGallery 
              eventId={album.eventId}
              albumId={albumId}
              canUpload={true}
            />
          )}
        </TabsContent>

        <TabsContent value="share" className="mt-0">
          <div className="py-4">
            <h2 className="text-xl font-semibold mb-4">Share this album</h2>
            <p className="text-sm text-gray-500 mb-6">
              Anyone with this QR code or link can view and add photos to this album.
            </p>
            <AlbumQR albumId={albumId} accessCode={album.accessCode || albumId} />
          </div>
        </TabsContent>
      </Tabs>

      {activeTab === "photos" && (
        <div className="fixed bottom-8 right-8 flex flex-col space-y-2">
          <Button
            onClick={handleUploadClick}
            size="lg"
            variant="outline"
            className="h-14 w-14 rounded-full shadow-lg flex items-center justify-center"
          >
            <Upload className="h-6 w-6" />
          </Button>
          <Button
            onClick={handleCameraClick}
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg flex items-center justify-center"
          >
            <Camera className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Hidden file input for uploading images */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={handleFileChange}
      />

      <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
        <DialogContent className="max-w-md p-0 h-[90vh] max-h-[700px]">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="relative h-full w-full flex flex-col">
            <div className="absolute top-4 right-4 z-10">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-black/30 backdrop-blur-sm border-0 text-white hover:bg-black/40"
                onClick={() => setCameraOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 bg-black">
              <CameraCapture
                albumId={albumId}
                userId={userId}
                onPhotoCapture={handlePhotoCapture}
                fullscreen={true}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}