// app/albums/create/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { db } from '@/lib/db';

export default function CreateAlbumPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [accessType, setAccessType] = useState<'public' | 'restricted'>('restricted');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userId = 1; // In a real app, get this from authentication

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const albumId = uuidv4();
      // Generate a shorter, user-friendly access code
      const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const newAlbum = {
        id: albumId,
        name: name.trim(),
        description: description.trim(),
        createdAt: new Date(),
        createdById: userId,
        accessType,
        accessCode
      };
      
      await db.albums.add(newAlbum);
      
      // Create owner access record
      await db.albumAccess.add({
        id: uuidv4(),
        albumId,
        userId,
        accessType: 'owner',
        joinedAt: new Date()
      });
      
      router.push(`/albums/${albumId}`);
    } catch (error) {
      console.error('Error creating album:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Create New Album</CardTitle>
          <CardDescription>
            Create a new photo album to share with friends and family
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Album Name</Label>
              <Input
                id="name"
                placeholder="Family Vacation 2025"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Our summer trip to the beach"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accessType">Who can add photos?</Label>
              <Select 
                value={accessType} 
                onValueChange={(value: 'public' | 'restricted') => setAccessType(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select access type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Anyone with the link</SelectItem>
                  <SelectItem value="restricted">Only invited people</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Album'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}