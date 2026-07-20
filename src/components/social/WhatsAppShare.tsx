import React, { useState } from 'react';
import { MessageCircle, Users, Send, CheckCircle, AlertCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

export interface WhatsAppShareData {
    photos: Array<{
        id: string;
        url: string;
        caption?: string;
    }>;
    message: string;
    recipientGroups: string[];
    eventId: string;
    eventName: string;
}

interface WhatsAppShareProps {
    photos: Array<{
        id: string;
        url: string;
        thumbnail: string;
        alt: string;
    }>;
    eventName: string;
    eventId: string;
    onBulkShare: (shareData: WhatsAppShareData) => Promise<void>;
}

export function WhatsAppShare({ photos, eventName, eventId, onBulkShare }: WhatsAppShareProps) {
    const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
    const [message, setMessage] = useState(`Check out these amazing photos from ${eventName}! 📸✨`);
    const [recipientNumbers, setRecipientNumbers] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [shareProgress, setShareProgress] = useState<{
        current: number;
        total: number;
        status: string;
    } | null>(null);
    const [shareResult, setShareResult] = useState<{
        success: boolean;
        message: string;
        sharedCount?: number;
    } | null>(null);

    const handlePhotoSelect = (photoId: string) => {
        setSelectedPhotos(prev =>
            prev.includes(photoId)
                ? prev.filter(id => id !== photoId)
                : [...prev, photoId]
        );
    };

    const handleSelectAll = () => {
        setSelectedPhotos(selectedPhotos.length === photos.length ? [] : photos.map(p => p.id));
    };

    const generateWhatsAppUrl = (phoneNumber: string, photoUrl: string, text: string) => {
        const fullText = `${text}\n\n${photoUrl}`;
        return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(fullText)}`;
    };

    const handleBulkShare = async () => {
        if (selectedPhotos.length === 0) return;

        const numbers = recipientNumbers.split(',').map(n => n.trim()).filter(n => n);
        if (numbers.length === 0) return;

        setIsSharing(true);
        setShareResult(null);
        setShareProgress({ current: 0, total: numbers.length * selectedPhotos.length, status: 'Preparing to share...' });

        try {
            const selectedPhotoData = selectedPhotos.map(id =>
                photos.find(p => p.id === id)
            ).filter(Boolean);

            const shareData: WhatsAppShareData = {
                photos: selectedPhotoData.map(photo => ({
                    id: photo!.id,
                    url: photo!.url,
                    caption: message
                })),
                message,
                recipientGroups: numbers,
                eventId,
                eventName
            };

            await onBulkShare(shareData);

            setShareResult({
                success: true,
                message: `Successfully shared ${selectedPhotos.length} photos with ${numbers.length} recipients!`,
                sharedCount: selectedPhotos.length * numbers.length
            });

        } catch (error) {
            setShareResult({
                success: false,
                message: 'Failed to share photos. Please check your connection and try again.'
            });
        } finally {
            setIsSharing(false);
            setShareProgress(null);
        }
    };

    const handleQuickShare = (photoId: string) => {
        const photo = photos.find(p => p.id === photoId);
        if (!photo) return;

        const numbers = recipientNumbers.split(',').map(n => n.trim()).filter(n => n);
        if (numbers.length === 0) return;

        // Open WhatsApp for the first number
        const whatsappUrl = generateWhatsAppUrl(numbers[0], photo.url, message);
        window.open(whatsappUrl, '_blank');
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-green-500" />
                    Share via WhatsApp
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Photo Selection */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Select Photos to Share</Label>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAll}
                        >
                            {selectedPhotos.length === photos.length ? 'Deselect All' : 'Select All'}
                        </Button>
                    </div>

                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                        {photos.slice(0, 12).map((photo) => (
                            <div
                                key={photo.id}
                                className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${selectedPhotos.includes(photo.id)
                                        ? 'border-green-500 ring-2 ring-green-200'
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
                                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                        <CheckCircle className="h-4 w-4 text-white" />
                                    </div>
                                )}
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="absolute top-1 right-1 h-6 w-6 bg-white/80 hover:bg-white"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuickShare(photo.id);
                                    }}
                                >
                                    <Send className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>{selectedPhotos.length} photos selected</span>
                        {photos.length > 12 && (
                            <span>+{photos.length - 12} more available</span>
                        )}
                    </div>
                </div>

                {/* Recipient Numbers */}
                <div className="space-y-2">
                    <Label htmlFor="recipients" className="text-sm font-medium">
                        Recipient Phone Numbers
                    </Label>
                    <Textarea
                        id="recipients"
                        value={recipientNumbers}
                        onChange={(e) => setRecipientNumbers(e.target.value)}
                        placeholder="Enter phone numbers separated by commas&#10;Example: +1234567890, +0987654321"
                        className="min-h-[80px]"
                    />
                    <p className="text-xs text-gray-500">
                        Include country code (e.g., +1 for US, +91 for India)
                    </p>
                </div>

                {/* Message */}
                <div className="space-y-2">
                    <Label htmlFor="message" className="text-sm font-medium">
                        Message
                    </Label>
                    <Textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Add a personal message..."
                        className="min-h-[60px]"
                    />
                    <p className="text-xs text-gray-500">
                        {message.length}/1000 characters
                    </p>
                </div>

                {/* Progress */}
                {shareProgress && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>{shareProgress.status}</span>
                            <span>{shareProgress.current}/{shareProgress.total}</span>
                        </div>
                        <Progress value={(shareProgress.current / shareProgress.total) * 100} />
                    </div>
                )}

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
                        onClick={handleBulkShare}
                        disabled={selectedPhotos.length === 0 || !recipientNumbers.trim() || isSharing}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                        {isSharing ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Sharing...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4 mr-2" />
                                Bulk Share ({selectedPhotos.length} photos)
                            </>
                        )}
                    </Button>
                </div>

                {/* Info */}
                <div className="text-xs text-gray-500 space-y-1">
                    <p>• Photos will open WhatsApp with pre-filled messages</p>
                    <p>• Recipients need WhatsApp installed to receive photos</p>
                    <p>• Large files may be sent as documents</p>
                </div>
            </CardContent>
        </Card>
    );
}