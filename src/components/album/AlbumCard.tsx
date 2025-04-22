// components/album/AlbumCard.tsx
import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image, FolderOpen } from 'lucide-react';
import { db } from '@/lib/db';
import { AlbumActions } from './AlbumAction';

interface AlbumCardProps {
  album: {
    id: string;
    name: string;
    description?: string;
    createdAt: Date;
    coverImage?: string;
  };
  onClick: () => void;
  isOwner: boolean;
}

export function AlbumCard({ album, onClick, isOwner }: AlbumCardProps) {
  const [photoCount, setPhotoCount] = React.useState(0);

  React.useEffect(() => {
    const getPhotoCount = async () => {
      try {
        const count = await db.photos.where('albumId').equals(album.id).count();
        setPhotoCount(count);
      } catch (error) {
        console.error('Error counting photos:', error);
      }
    };
    getPhotoCount();
  }, [album.id]);

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow duration-200 p-0 h-fit gap-0"
      onClick={onClick}
    >
      <div className="relative h-40 bg-gray-100">
        {!album.coverImage ? (
          <img src={'https://images.unsplash.com/photo-1743993330456-6fa7a903b3bd?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'} alt={album.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FolderOpen className="h-12 w-12 text-gray-300" />
          </div>
        )}
      </div>
      <CardContent className="p-4 ">
        <div className="flex items-center justify-between">
          <h3 className="font-medium line-clamp-1">{album.name}</h3>
          {isOwner && (
            <Badge variant="outline" className="ml-2">Owner</Badge>
          )}
        </div>
        {album.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{album.description}</p>
        )}
      </CardContent>


      {/* <CardFooter className="p-4 pt-0 text-sm text-gray-500 flex items-center justify-between">
        <div className="flex items-center">
          <Image className="h-4 w-4 mr-1" />
          {photoCount} photos
        </div>
        <div className="flex items-center space-x-2">
          <span>{new Date(album.createdAt).toLocaleDateString()}</span>
          {isOwner && <AlbumActions albumId={album.id} isOwner={isOwner} />}
        </div>
      </CardFooter> */}
    </Card>
  );
}