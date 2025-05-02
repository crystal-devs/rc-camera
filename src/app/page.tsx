// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Camera, FolderPlus } from 'lucide-react';
import { db } from '@/lib/db';
import { AlbumCard } from '@/components/album/AlbumCard';
import { authenticateUser } from '@/services/auth.service';

export default function HomePage() {
  const router = useRouter();
  const [myAlbums, setMyAlbums] = useState<any[]>([]);
  const [accessibleAlbums, setAccessibleAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const userId = 1; // In a real app, get this from authentication

  useEffect(() => {
    authenticateUser()
    const loadAlbums = async () => {
      try {
        // Check if this is first time user
        const userExists = await db.users.get(userId);
        
        if (!userExists) {
          // Create demo user
          await db.users.add({
            id: userId,
            name: 'Demo User',
            email: 'demo@example.com'
          });
        }

        // Get albums created by user
        const createdAlbums = await db.albums
          .where('createdById')
          .equals(userId)
          .toArray();
          
        setMyAlbums(createdAlbums);
        
        // Get albums user has access to
        const accessList = await db.albumAccess
          .where('userId')
          .equals(userId)
          .toArray();
          
        const accessibleAlbumIds = accessList
          .filter(access => access.accessType !== 'owner')
          .map(access => access.albumId);
          
        if (accessibleAlbumIds.length > 0) {
          const sharedAlbums = await db.albums
            .where('id')
            .anyOf(accessibleAlbumIds)
            .toArray();
            
          setAccessibleAlbums(sharedAlbums);
        }
      } catch (error) {
        console.error('Error loading albums:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAlbums();
  }, []);

  const handleCreateAlbum = () => {
    router.push('/albums/create');
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Photo Albums</h1>
      
      {loading ? (
        <div className="py-8 text-center">Loading albums...</div>
      ) : (
        <>
          {myAlbums.length === 0 && accessibleAlbums.length === 0 ? (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Welcome to Photo Albums</CardTitle>
                <CardDescription>
                  Create your first album to start capturing and sharing photos
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div className="text-center py-8">
                  <FolderPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-500 mb-4">
                    No albums yet. Create your first album to get started.
                  </p>
                  <Button onClick={handleCreateAlbum}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Album
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Your Albums</h2>
                  <Button onClick={handleCreateAlbum} size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Album
                  </Button>
                </div>
                
                {myAlbums.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed rounded-lg">
                    <p className="text-sm text-gray-500">You haven't created any albums yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {myAlbums.map(album => (
                      <AlbumCard 
                        key={album.id} 
                        album={album} 
                        onClick={() => router.push(`/albums/${album.id}`)}
                        isOwner={true}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {accessibleAlbums.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4">Shared With You</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {accessibleAlbums.map(album => (
                      <AlbumCard 
                        key={album.id} 
                        album={album} 
                        onClick={() => router.push(`/albums/${album.id}`)}
                        isOwner={false}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          
          <div className="fixed bottom-6 right-6">
            <Button 
              onClick={() => router.push('/scan')} 
              size="lg" 
              className="h-14 w-14 rounded-full shadow-lg"
            >
              <Camera className="h-6 w-6" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}