// components/AlbumManagement.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
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
// import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/db';

type Album = {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  createdAt: Date;
  createdById: number;
  coverImage?: string;
  accessType: 'public' | 'restricted';
  accessCode?: string;
  isDefault?: boolean;
  photoCount?: number;
};

interface AlbumManagementProps {
  eventId: string;
}

export default function AlbumManagement({ eventId }: AlbumManagementProps) {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
//   const { toast } = useToast();
  
  // User ID would come from auth in a real app
  const userId = 1;
  
  useEffect(() => {
    const loadAlbums = async () => {
      try {
        // Get all albums for this event
        const albumList = await db.albums
          .where('eventId')
          .equals(eventId)
          .toArray();
        
        // Get photo counts
        const albumsWithCounts = await Promise.all(
          albumList.map(async (album) => {
            const photoCount = await db.photos
              .where('albumId')
              .equals(album.id)
              .count();
            
            return {
              ...album,
              photoCount,
            };
          })
        );
        
        // Sort albums - default album first, then by creation date
        albumsWithCounts.sort((a, b) => {
          if (a.isDefault && !b.isDefault) return -1;
          if (!a.isDefault && b.isDefault) return 1;
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
        
        setAlbums(albumsWithCounts);
      } catch (error) {
        console.error('Error loading albums:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAlbums();
  }, [eventId]);
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const createNewAlbum = async () => {
    if (!newAlbumName.trim()) return;
    
    try {
      const albumId = uuidv4();
      
      const newAlbum = {
        id: albumId,
        eventId,
        name: newAlbumName.trim(),
        description: newAlbumDescription.trim(),
        createdAt: new Date(),
        createdById: userId,
        coverImage: previewImage,
        accessType: 'public' as const,
        isDefault: false
      };
      
      await db.albums.add(newAlbum);
      
      // Create owner access record
      await db.albumAccess.add({
        id: uuidv4(),
        albumId,
        userId,
        accessType: 'owner' as const,
        joinedAt: new Date()
      });
      
      // Reset form and close dialog
      setNewAlbumName('');
      setNewAlbumDescription('');
      setPreviewImage(null);
      setCreateDialogOpen(false);
      
      // Add new album to state
      setAlbums([
        ...albums,
        {
          ...newAlbum,
          photoCount: 0
        }
      ]);
      
      toast({
        title: "Album Created",
        description: `"${newAlbum.name}" album has been created successfully.`,
      });
    } catch (error) {
      console.error('Error creating album:', error);
      toast({
        title: "Error",
        description: "Failed to create album. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const navigateToAlbum = (albumId: string) => {
    router.push(`/events/${eventId}/albums/${albumId}`);
  };
  
  const deleteAlbum = async (albumId: string) => {
    // Don't allow deleting the default album
    const album = albums.find(a => a.id === albumId);
    if (album?.isDefault) return;
    
    try {
      // Delete all photos in the album
      await db.photos
        .where('albumId')
        .equals(albumId)
        .delete();
      
      // Delete album access records
      await db.albumAccess
        .where('albumId')
        .equals(albumId)
        .delete();
      
      // Delete the album
      await db.albums
        .where('id')
        .equals(albumId)
        .delete();
      
      // Update state
      setAlbums(albums.filter(a => a.id !== albumId));
      
    //   toast({
    //     title: "Album Deleted",
    //     description: `"${album?.name}" album has been deleted.`,
    //   });
    } catch (error) {
      console.error('Error deleting album:', error);
    //   toast({
    //     title: "Error",
    //     description: "Failed to delete album. Please try again.",
    //     variant: "destructive",
    //   });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Albums</h2>
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
                      <Image 
                        src={previewImage} 
                        alt="Cover preview" 
                        fill 
                        className="object-cover rounded-lg"
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
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={createNewAlbum}
                disabled={!newAlbumName.trim()}
              >
                Create Album
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
                  {album.coverImage ? (
                    <Image 
                      src={album.coverImage} 
                      alt={album.name} 
                      fill 
                      className="object-cover"
                    />
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
                              if (confirm(`Are you sure you want to delete "${album.name}" album? This will remove all photos in this album.`)) {
                                deleteAlbum(album.id);
                              }
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
                  {album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'}
                </CardFooter>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}