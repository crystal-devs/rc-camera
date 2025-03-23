// app/join/[accessCode]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Camera } from 'lucide-react';
import { db } from '@/lib/db';

interface JoinPageProps {
  params: {
    accessCode: string;
  };
}

export default function JoinPage({ params }: JoinPageProps) {
  const { accessCode } = params;
  const router = useRouter();
  const [album, setAlbum] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const userId = 1; // In a real app, get this from authentication

  useEffect(() => {
    const findAlbum = async () => {
      try {
        // Find album by access code
        const albums = await db.albums
          .where('accessCode')
          .equals(accessCode)
          .toArray();
        
        if (albums.length === 0) {
          setError('Album not found');
        } else {
          setAlbum(albums[0]);
          
          // Check if user already has access
          const existingAccess = await db.albumAccess
            .where({ albumId: albums[0].id, userId })
            .first();
          
          if (existingAccess) {
            // User already has access, redirect to album
            router.push(`/albums/${albums[0].id}`);
            return;
          }
        }
      } catch (error) {
        console.error('Error finding album:', error);
        setError('Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    findAlbum();
  }, [accessCode, router]);

  const joinAlbum = async () => {
    if (!album) return;
    
    setJoining(true);
    
    try {
      // Create album access record
      await db.albumAccess.add({
        id: uuidv4(),
        albumId: album.id,
        userId,
        accessType: 'contributor',
        joinedAt: new Date()
      });
      
      // Redirect to album
      router.push(`/albums/${album.id}`);
    } catch (error) {
      console.error('Error joining album:', error);
      setJoining(false);
      setError('Failed to join album');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Album Not Found</CardTitle>
            <CardDescription>
              The album you're looking for doesn't exist or the link is invalid.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push('/albums')} className="w-full">
              Go to My Albums
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Join Album</CardTitle>
          <CardDescription>
            You've been invited to join and contribute to this album
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{album.name}</h3>
            {album.description && (
              <p className="text-sm text-gray-500 mt-1">{album.description}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button 
            onClick={joinAlbum} 
            className="w-full" 
            disabled={joining}
          >
            {joining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              'Join Album'
            )}
          </Button>
          <Button 
            onClick={() => router.push(`/albums/${album.id}/capture`)} 
            variant="outline" 
            className="w-full"
          >
            <Camera className="mr-2 h-4 w-4" />
            Capture Photos
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}