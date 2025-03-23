'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/db';

export default function EditAlbumPage() {
    const router = useRouter();
    const { albumId } = useParams();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [accessType, setAccessType] = useState<'public' | 'restricted'>('restricted');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    const userId = 1; // Mock user ID

    useEffect(() => {
        const loadAlbum = async () => {
            const album = await db.albums.get(albumId as string);
            if (album && album.createdById === userId) {
                setName(album.name);
                setDescription(album.description || '');
                setAccessType(album.accessType);
            }
            setLoading(false);
        };
        loadAlbum();
    }, [albumId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            await db.albums.update(albumId as string, {
                name: name.trim(),
                description: description.trim(),
                accessType,
            });
            router.push(`/albums/${albumId}`);
        } catch (error) {
            console.error('Error updating album:', error);
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="text-center py-8">Loading...</div>;

    return (
        <div className="container mx-auto px-4 py-8 max-w-md">
            <Card>
                <CardHeader>
                    <CardTitle>Edit Album</CardTitle>
                    <CardDescription>Update your album details</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Album Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="accessType">Who can add photos?</Label>
                            <Select value={accessType} onValueChange={(value: 'public' | 'restricted') => setAccessType(value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="public">Anyone with the link</SelectItem>
                                    <SelectItem value="restricted">Only invited people</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isSubmitting || !name.trim()}>
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}