// components/album/AlbumActions.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { db } from '@/lib/db';

export function AlbumActions({ albumId, isOwner }: { albumId: string; isOwner: boolean }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this album and all its photos?')) return;
    try {
      await db.photos.where('albumId').equals(albumId).delete(); // Delete photos
      await db.albumAccess.where('albumId').equals(albumId).delete(); // Delete access
      await db.albums.delete(albumId); // Delete album
      router.push('/albums');
    } catch (error) {
      console.error('Error deleting album:', error);
    }
  };

  if (!isOwner) return null;

  return (
    <div className="flex space-x-2">
      <Button variant="outline" size="sm" onClick={() => router.push(`/albums/${albumId}/edit`)}>
        <Pencil className="h-4 w-4 mr-2" /> Edit
      </Button>
      <Button variant="destructive" size="sm" onClick={handleDelete}>
        <Trash2 className="h-4 w-4 mr-2" /> Delete
      </Button>
    </div>
  );
}