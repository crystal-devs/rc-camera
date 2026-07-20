import React, { useState } from 'react';
import { Instagram, Camera, Hash, Share2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface InstagramPostData {
    imageUrl: string;
    caption: string;
    hashtags: string[];
    eventId: string;
    eventName: string;
}

interface InstagramShareProps {
    photos: Array<{
        id: string;
        url: string;
        thumbnail: string;
        alt: string;
    }>;
    eventName: string;
    eventId: string;
    onShare: (postData: InstagramPostData) => Promise<void>;
}

export function InstagramShare({ photos, eventName, eventId, onShare }: InstagramShareProps) {
    const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
    const [caption, setCaption] = useState(`${eventName} 📸 #${eventName.replace(/\s+/g, '')} #EventPhotography`);
    const [hashtags, setHashtags] = useState(['EventPhotography', 'WeddingPhotos', 'Celebration']);
    const [customHashtags, setCustomHashtags] = useState('');
    const [isStory, setIsStory] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [shareResult, setShareResult] = useState<{
        success: boolean;
        message: string;
        postUrl?: string;
    } | null>(null);

    const handlePhotoSelect = (photoId: string) => {
        setSelectedPhotos(prev =>
            prev.includes(photoId)
                ? prev.filter(id => id !== photoId)
                : [...prev, photoId]
        );
    };

    const handleShare = async () => {
        if (selectedPhotos.length === 0) return;

        setIsSharing(true);
        setShareResult(null);

        try {
            const selectedPhotoData = photos.find(p => p.id === selectedPhotos[0]);
            if (!selectedPhotoData) return;

            const allHashtags = [...hashtags];
            if (customHashtags.trim()) {
                allHashtags.push(...customHashtags.split(',').map(tag => tag.trim().replace('#', '')));
            }

            const postData: InstagramPostData = {
                imageUrl: selectedPhotoData.url,
                caption: caption,
                hashtags: allHashtags,
                eventId,
                eventName
            };

            await onShare(postData);

            setShareResult({
                success: true,
                message: isStory
                    ? 'Story shared successfully! Check your Instagram app.'
                    : 'Post shared successfully! It may take a few minutes to appear.',
                postUrl: `https://instagram.com/${eventName.toLowerCase().replace(/\s+/g, '')}`
            });

        } catch (error) {
            setShareResult({
                success: false,
                message: 'Failed to share to Instagram. Please try again.'
            });
        } finally {
            setIsSharing(false);
        }
    };

    const generateInstagramUrl = () => {
        const text = encodeURIComponent(`${caption} ${hashtags.map(tag => `#${tag}`).join(' ')}`);
        const imageUrl = photos.find(p => p.id === selectedPhotos[0])?.url;
        return `https://www.instagram.com/create/story/?text=${text}${imageUrl ? `&image_url=${encodeURIComponent(imageUrl)}` : ''}`;
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Instagram className="h-5 w-5 text-pink-500" />
                    Share to Instagram
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Photo Selection */}
                <div className="space-y-3">
                    <Label className="text-sm font-medium">Select Photo to Share</Label>
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {photos.slice(0, 9).map((photo) => (
                            <div
                                key={photo.id}
                                className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${selectedPhotos.includes(photo.id)
                                        ? 'border-pink-500 ring-2 ring-pink-200'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                onClick={() => handlePhotoSelect(photo.id)}
                            >
                                <img
                                    src={photo.thumbnail}
                                    alt={photo.alt}
                                    className="w-full h-full object-cover"
                                />
                                {selectedPhotos.includes(photo.id) && (
                                    <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                                        <CheckCircle className="h-6 w-6 text-white" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    {selectedPhotos.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">
                            Select a photo to share
                        </p>
                    )}
                </div>

                {/* Post Type Toggle */}
                <div className="flex items-center justify-between">
                    <Label htmlFor="story-mode" className="text-sm font-medium">
                        Share as Story
                    </Label>
                    <Switch
                        id="story-mode"
                        checked={isStory}
                        onCheckedChange={setIsStory}
                    />
                </div>

                {/* Caption */}
                <div className="space-y-2">
                    <Label htmlFor="caption" className="text-sm font-medium">
                        Caption
                    </Label>
                    <Textarea
                        id="caption"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Write your caption..."
                        className="min-h-[80px]"
                    />
                    <p className="text-xs text-gray-500">
                        {caption.length}/2200 characters
                    </p>
                </div>

                {/* Hashtags */}
                <div className="space-y-3">
                    <Label className="text-sm font-medium">Hashtags</Label>

                    {/* Default hashtags */}
                    <div className="flex flex-wrap gap-2">
                        {hashtags.map((tag) => (
                            <Badge
                                key={tag}
                                variant="secondary"
                                className="cursor-pointer hover:bg-pink-100"
                                onClick={() => setHashtags(prev => prev.filter(t => t !== tag))}
                            >
                                #{tag} ×
                            </Badge>
                        ))}
                    </div>

                    {/* Custom hashtags input */}
                    <Input
                        value={customHashtags}
                        onChange={(e) => setCustomHashtags(e.target.value)}
                        placeholder="Add custom hashtags (comma separated)"
                        className="text-sm"
                    />
                </div>

                {/* Share Result */}
                {shareResult && (
                    <Alert className={shareResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                        {shareResult.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <AlertDescription className="text-sm">
                            {shareResult.message}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <Button
                        onClick={handleShare}
                        disabled={selectedPhotos.length === 0 || isSharing}
                        className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                    >
                        {isSharing ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Sharing...
                            </>
                        ) : (
                            <>
                                <Share2 className="h-4 w-4 mr-2" />
                                Share to Instagram
                            </>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => window.open(generateInstagramUrl(), '_blank')}
                        disabled={selectedPhotos.length === 0}
                    >
                        <Camera className="h-4 w-4 mr-2" />
                        Open in App
                    </Button>
                </div>

                {/* Info */}
                <div className="text-xs text-gray-500 space-y-1">
                    <p>• For best results, use high-resolution photos</p>
                    <p>• Instagram Business accounts get additional analytics</p>
                    <p>• Stories disappear after 24 hours</p>
                </div>
            </CardContent>
        </Card>
    );
}