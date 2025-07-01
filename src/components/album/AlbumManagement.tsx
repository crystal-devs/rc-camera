// components/AlbumManagement.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { PlusIcon, FolderIcon, UploadIcon, MoreHorizontalIcon, ImageIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// Import API services
import { fetchEventAlbums, createAlbum, deleteAlbum } from '@/services/apis/albums.api';
import { Album } from '@/types/album';
import { uploadCoverImage } from '@/services/apis/media.api';

interface AlbumManagementProps {
  eventId: string;
  initialAlbums?: Album[];
  onAlbumCreated?: (album: Album) => void;
  onRefresh?: () => Promise<Album[]>;
}

export default function AlbumManagement({ eventId, initialAlbums, onAlbumCreated, onRefresh }: AlbumManagementProps) {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>(initialAlbums || []);
  const [isLoading, setIsLoading] = useState(!initialAlbums);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [accessType, setAccessType] = useState<'public' | 'restricted'>('public');
  const [isDefault, setIsDefault] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Get auth token
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setAuthToken(storedToken);
    } else {
      // Redirect to login if no token
      toast.error("You need to be logged in to manage albums");
      router.push('/events');
    }

    // Check if eventId is provided
    if (!eventId) {
      toast.error("Event ID is required to manage albums");
      router.push('/events');
    }
  }, [eventId, router]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authToken || !eventId) return;

    try {
      // Show loading state
      toast.loading("Uploading cover image...");

      // Show temporary preview for immediate feedback
      const reader = new FileReader();
      reader.onload = (e) => {
        const tempPreview = e.target?.result as string;
        // This is just for UI preview, not sent to the server
        setPreviewImage(tempPreview);
      };
      reader.readAsDataURL(file);
      const imageUrl = await uploadCoverImage(file, 'album', authToken);

      // Save the ImageKit URL
      setPreviewImage(imageUrl);
      toast.dismiss();
      toast.success("Cover image uploaded successfully");
    } catch (error) {
      console.error('Error uploading cover image:', error);
      toast.dismiss();
      toast.error("Failed to upload cover image. Please try again.");
      // Keep the temporary preview as it looks better than removing it
    }
  };

  // Load albums if initialAlbums is not provided
  useEffect(() => {
    const loadAlbums = async () => {
      if (!authToken || !eventId) return;
      
      // Skip API call if we have initialAlbums
      if (initialAlbums && initialAlbums.length > 0) {
        console.log(`Using ${initialAlbums.length} albums from parent component`);
        setAlbums(initialAlbums);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        console.log(`AlbumManagement: Fetching albums for event ${eventId}`);
        const albumList = await fetchEventAlbums(eventId, authToken);
        console.log(`AlbumManagement: Fetched ${albumList.length} albums`);

        // Sort albums - default album first, then by creation date
        albumList.sort((a, b) => {
          if (a.isDefault && !b.isDefault) return -1;
          if (!a.isDefault && b.isDefault) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setAlbums(albumList);
      } catch (error) {
        console.error('Error loading albums:', error);
        toast.error("Failed to load albums");
      } finally {
        setIsLoading(false);
      }
    };

    loadAlbums();
  }, [eventId, authToken, initialAlbums]);

  // Update local state when initialAlbums changes
  useEffect(() => {
    if (initialAlbums) {
      setAlbums(initialAlbums);
      setIsLoading(false);
    }
  }, [initialAlbums]);

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim() || !eventId || !authToken) return;

    setIsSubmitting(true);

    try {
      // Generate a shorter, user-friendly access code if restricted
      const accessCode = accessType === 'restricted'
        ? Math.random().toString(36).substring(2, 8).toUpperCase()
        : undefined;

      // Prepare album data for API
      const albumData: Partial<Album> = {
        name: newAlbumName.trim(),
        description: newAlbumDescription.trim(),
        eventId,
        cover_image: previewImage || undefined,
        accessType,
        accessCode,
        isDefault
      };

      console.log('Creating album with data:', albumData);

      // Call API to create the album
      const createdAlbum = await createAlbum(albumData, authToken);
      console.log('Album created successfully:', createdAlbum);

      // If this is a default album, remove any existing default album from state
      const updatedAlbums = createdAlbum.isDefault 
        ? [createdAlbum, ...albums.filter(album => !album.isDefault)] 
        : [createdAlbum, ...albums];
      
      // Update local state
      setAlbums(updatedAlbums);
      
      // Notify parent component about the new album
      if (onAlbumCreated) {
        console.log('Notifying parent component about new album:', createdAlbum.id);
        onAlbumCreated(createdAlbum);
      }

      // Reset form
      setNewAlbumName('');
      setNewAlbumDescription('');
      setPreviewImage(null);
      setIsDefault(false);
      setAccessType('public');

      // Close dialog
      setCreateDialogOpen(false);

      toast.success("Album created successfully!");
    } catch (error) {
      console.error('Error creating album:', error);
      if (error instanceof Error) {
        toast.error(error.message || "Failed to create album. Please try again.");
      } else {
        toast.error("Failed to create album. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigateToAlbum = (albumId: string) => {
    console.log(`Navigating to album: ${albumId}`);
    try {
      // Add a toast to confirm the navigation
      toast.info(`Opening album...`);
      router.push(`/albums/${albumId}`);
    } catch (error) {
      console.error('Navigation error:', error);
      toast.error('Error navigating to album');
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    if (!authToken) return;

    // Don't allow deleting the default album
    const album = albums.find(a => a.id === albumId);
    if (album?.isDefault) {
      toast.error("Cannot delete the default album");
      return;
    }

    try {
      // Confirm deletion
      if (!confirm(`Are you sure you want to delete "${album?.name}" album? This will remove all photos in this album.`)) {
        return;
      }

      // Call API to delete album
      await deleteAlbum(albumId, authToken);

      // Update state
      setAlbums(albums.filter(a => a.id !== albumId));

      toast.success(`"${album?.name}" album has been deleted.`);
    } catch (error) {
      console.error('Error deleting album:', error);
      toast.error("Failed to delete album. Please try again.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Albums</h2>
          {onRefresh && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={async () => {
                setIsLoading(true);
                try {
                  const refreshedAlbums = await onRefresh();
                  setAlbums(refreshedAlbums);
                  toast.success("Albums refreshed");
                } catch (error) {
                  console.error('Error refreshing albums:', error);
                } finally {
                  setIsLoading(false);
                }
              }}
              className="text-xs"
            >
              ↻ Refresh
            </Button>
          )}
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              New Album
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Album</DialogTitle>
              <DialogDescription>
                Add a new photo album to organize your pictures
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="albumName">Album Name</Label>
                <Input
                  id="albumName"
                  placeholder="Beach Day Photos"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="albumDescription">Description (Optional)</Label>
                <Textarea
                  id="albumDescription"
                  placeholder="Photos from our day at the beach"
                  value={newAlbumDescription}
                  onChange={(e) => setNewAlbumDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="albumCover">Cover Image (Optional)</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  {previewImage ? (
                    <div className="relative h-32 w-full mb-2">
                      {/* Replace this Image component with this version */}
                      <Image
                        src={previewImage}
                        alt="Cover preview"
                        fill
                        className="object-cover rounded-lg"
                        unoptimized={previewImage.startsWith('data:')} // Skip optimization for data URLs
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 bg-gray-50 rounded-lg">
                      <ImageIcon className="h-8 w-8 text-gray-300 mb-2" />
                      <p className="text-xs text-gray-500">Select a cover image</p>
                    </div>
                  )}

                  <Input
                    id="albumCover"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('albumCover')?.click()}
                    className="mt-2"
                  >
                    {previewImage ? 'Change Image' : 'Select Image'}
                  </Button>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  className="mt-1"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                <div>
                  <Label htmlFor="isDefault" className="font-medium">
                    Make this the default album
                  </Label>
                  <p className="text-xs text-gray-500">
                    The default album is where photos will be added when not specified.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateAlbum}
                disabled={isSubmitting || !newAlbumName.trim()}
              >
                {isSubmitting ? 'Creating...' : 'Create Album'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-lg bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed rounded-lg">
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <FolderIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-700 mb-2">No Albums Yet</h3>
          <p className="text-gray-500 text-center max-w-md mb-6">
            Create albums to organize your photos. Albums help you group photos by theme or category.
          </p>
          <Button
            onClick={() => setCreateDialogOpen(true)}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create First Album
          </Button>
        </div>
      ) : (
        <ScrollArea className="h-[500px] pr-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {albums.map((album) => (
              <Card
                key={album.id}
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigateToAlbum(album.id)}
              >
                <div className="relative h-32 w-full">
                  {album.cover_image ? (
                    <div className="relative h-32 w-full">
                      <Image
                        src={album.cover_image}
                        alt={album.name}
                        fill
                        className="object-cover"
                        unoptimized={album.cover_image.startsWith('data:')} // Skip optimization for data URLs
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-100">
                      <FolderIcon className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                </div>

                <CardHeader className="py-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-medium truncate">
                      {album.name}
                      {album.isDefault && (
                        <span className="ml-2 text-xs bg-gray-100 text-gray-600 py-0.5 px-1.5 rounded-full">
                          Default
                        </span>
                      )}
                    </CardTitle>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToAlbum(album.id);
                          }}
                        >
                          View Photos
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            // Open upload dialog/page
                            router.push(`/events/${eventId}/albums/${album.id}/upload`);
                          }}
                        >
                          Upload Photos
                        </DropdownMenuItem>
                        {!album.isDefault && (
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAlbum(album.id);
                            }}
                          >
                            Delete Album
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardFooter className="py-3 text-sm text-gray-500">
                  {album.photoCount ?? 0} {(album.photoCount ?? 0) === 1 ? 'photo' : 'photos'}
                </CardFooter>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}