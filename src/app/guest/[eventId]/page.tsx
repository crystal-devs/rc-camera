'use client';
import React, { useState, useEffect, use, useMemo, useCallback } from 'react';
import { Camera, Users, Calendar, MapPin, Download, X, ChevronLeft, ChevronRight, Info, Heart, Share2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useParams } from 'next/navigation';
import { getEventMediaWithGuestToken } from '@/services/apis/media.api';
import { PinterestPhotoGrid } from '@/components/photo/PinterestPhotoGrid';

// TypeScript interfaces
interface ApiPhoto {
    _id: string;
    albumId: string;
    eventId: string;
    imageUrl: string;
    thumbnail: string;
    createdAt: string;
    approval: {
        status: 'auto_approved' | 'approved' | 'pending' | 'rejected';
        approved_by?: string | null;
        approved_at?: string;
        rejection_reason?: string;
        auto_approval_reason?: string;
    };
    metadata: {
        width: number;
        height: number;
        device_info: {
            brand: string;
            model: string;
            os: string;
        };
        timestamp: string | null;
    };
    url: string;
}

export interface TransformedPhoto {
    id: string;
    src: string;
    width: number;
    height: number;
    uploaded_by: string;
    approval: ApiPhoto['approval'];
    createdAt: string;
    albumId: string;
    eventId: string;
}

interface MockEvent {
    _id: string;
    title: string;
    description: string;
    location: { name: string; address: string };
    start_date: string;
    cover_image: { url: string };
    stats: { participants: number; photos: number; videos: number };
    permissions: {
        can_upload: boolean;
        can_download: boolean;
        require_approval: boolean;
    };
}

// Mock event data
const mockEvent: MockEvent = {
    _id: "event123",
    title: "Rahul & Priya's Wedding",
    description: "Join us in celebrating our special day",
    location: { name: "Taj Palace, Mumbai", address: "Colaba, Mumbai" },
    start_date: "2024-02-15",
    cover_image: { url: "https://picsum.photos/800/300?random=0" },
    stats: { participants: 45, photos: 234, videos: 12 },
    permissions: {
        can_upload: true,
        can_download: true,
        require_approval: true
    }
};

// Transform API data to component format
const transformApiPhoto = (apiPhoto: ApiPhoto): TransformedPhoto => {
    return {
        id: apiPhoto._id,
        src: apiPhoto.url,
        width: apiPhoto.metadata?.width || 400,
        height: apiPhoto.metadata?.height || 600,
        uploaded_by: "Guest",
        approval: apiPhoto.approval,
        createdAt: apiPhoto.createdAt,
        albumId: apiPhoto.albumId,
        eventId: apiPhoto.eventId
    };
};

// Optimized Fullscreen Photo Viewer
const FullscreenPhotoViewer: React.FC<{
    selectedPhoto: TransformedPhoto;
    selectedPhotoIndex: number;
    photos: TransformedPhoto[];
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
    downloadPhoto: (photo: TransformedPhoto) => void;
}> = ({ selectedPhoto, selectedPhotoIndex, photos, onClose, onPrev, onNext, downloadPhoto }) => {
    const [showControls, setShowControls] = useState(true);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape': onClose(); break;
                case 'ArrowLeft': onPrev(); break;
                case 'ArrowRight': onNext(); break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [onClose, onPrev, onNext]);

    // For fullscreen, use minimal transformations to preserve original quality
    const fullscreenTransformation = [
        { format: 'auto' },
        { progressive: true },
        { dpr: 'auto' },
        { quality: 95 }
        // No width/height restrictions - let it be original size
    ];

    return (
        <div
            className="fixed inset-0 bg-black z-50 flex flex-col"
            onClick={() => setShowControls(!showControls)}
        >
            {/* Top Controls */}
            <div className={`absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="text-white hover:bg-white/20 rounded-full"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                        <span className="text-sm font-medium">
                            {selectedPhotoIndex + 1} of {photos.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); downloadPhoto(selectedPhoto); }}
                            className="text-white hover:bg-white/20"
                        >
                            <Download className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-white hover:bg-white/20"
                        >
                            <Share2 className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Navigation Buttons */}
            {selectedPhotoIndex > 0 && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onPrev(); }}
                    className={`absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 z-10 h-12 w-12 rounded-full transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
                >
                    <ChevronLeft className="w-6 h-6" />
                </Button>
            )}

            {selectedPhotoIndex < photos.length - 1 && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                    className={`absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 z-10 h-12 w-12 rounded-full transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
                >
                    <ChevronRight className="w-6 h-6" />
                </Button>
            )}

            {/* Image Container - Using CSS approach for true fullscreen */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
                <img
                    src={`${selectedPhoto.src}?tr=f-auto:pr-true:dpr-auto:q-95`}
                    alt="Fullscreen view"
                    className="max-w-full max-h-full object-contain"
                    style={{
                        width: 'auto',
                        height: 'auto',
                        maxWidth: '100%',
                        maxHeight: '100%'
                    }}
                    onClick={(e) => e.stopPropagation()}
                />
            </div>

            {/* Alternative: If you want to stick with ImageKitImage, use this approach */}
            {/* 
            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
                <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}>
                    <ImageKitImage
                        src={selectedPhoto.src}
                        alt="Fullscreen view"
                        width={selectedPhoto.width || 1920}
                        height={selectedPhoto.height || 1080}
                        transformation={fullscreenTransformation}
                        className="max-w-full max-h-full object-contain"
                        style={{
                            width: 'auto',
                            height: 'auto',
                            maxWidth: '100%',
                            maxHeight: '100%'
                        }}
                        priority={true}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            </div>
            */}

            {/* Bottom Info */}
            <div className={`absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <div className="text-white text-center">
                    <Badge variant="secondary" className="mb-2">
                        Uploaded by {selectedPhoto.uploaded_by}
                    </Badge>
                    <p className="text-xs opacity-75 mt-1">
                        {new Date(selectedPhoto.createdAt).toLocaleDateString()}
                    </p>
                </div>
            </div>
        </div>
    );
};

// Main Component
export default function EventDetailsPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);
    const [guestName, setGuestName] = useState<string>('');
    const [hasEnteredName, setHasEnteredName] = useState<boolean>(false);
    const [showNameDialog, setShowNameDialog] = useState<boolean>(true);
    const [photoViewerOpen, setPhotoViewerOpen] = useState<boolean>(false);
    const [selectedPhoto, setSelectedPhoto] = useState<TransformedPhoto | null>(null);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [savedName, setSavedName] = useState<string>('');
    const [photos, setPhotos] = useState<TransformedPhoto[]>([]);

    const fetchMedia = async (): Promise<boolean> => {
        try {
            setLoading(true);
            setError(null);

            let mediaItems: ApiPhoto[] = await getEventMediaWithGuestToken(eventId);

            if (mediaItems && Array.isArray(mediaItems)) {
                const transformedPhotos = mediaItems.map(transformApiPhoto);
                
                const approvedPhotos = transformedPhotos.filter(photo =>
                    !photo.approval ||
                    photo.approval.status === 'approved' ||
                    photo.approval.status === 'auto_approved'
                );

                setPhotos(approvedPhotos);
                return true;
            } else {
                setPhotos([]);
                return false;
            }
        } catch (error) {
            console.error('Error fetching media:', error);
            setError('Failed to load photos. Please try again.');
            setPhotos([]);
            return false;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (eventId) {
            fetchMedia();
        }
    }, [eventId]);

    useEffect(() => {
        if (savedName) {
            setGuestName(savedName);
            setHasEnteredName(true);
            setShowNameDialog(false);
        }
    }, [savedName]);

    const handleNameSubmit = (): void => {
        if (guestName.trim()) {
            setSavedName(guestName);
            setHasEnteredName(true);
            setShowNameDialog(false);
        }
    };

    const handlePhotoClick = useCallback((photo: TransformedPhoto, index: number): void => {
        setSelectedPhoto(photo);
        setSelectedPhotoIndex(index);
        setPhotoViewerOpen(true);
    }, []);

    const navigateToPhoto = useCallback((direction: 'next' | 'prev'): void => {
        let newIndex: number;
        if (direction === 'next' && selectedPhotoIndex < photos.length - 1) {
            newIndex = selectedPhotoIndex + 1;
        } else if (direction === 'prev' && selectedPhotoIndex > 0) {
            newIndex = selectedPhotoIndex - 1;
        } else {
            return;
        }

        setSelectedPhotoIndex(newIndex);
        setSelectedPhoto(photos[newIndex]);
    }, [selectedPhotoIndex, photos]);

    const downloadPhoto = useCallback((photo: TransformedPhoto): void => {
        const link = document.createElement('a');
        link.href = photo.src;
        link.download = `photo-${photo.id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Name Entry Dialog */}
            {/* <Dialog open={showNameDialog} onOpenChange={() => {}}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center">Welcome! 🎉</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 p-4">
                        <p className="text-center text-gray-600">
                            You've been invited to <span className="font-semibold">{mockEvent.title}</span>
                        </p>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Enter your name to continue</label>
                            <Input
                                placeholder="Your name"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
                                className="text-center"
                            />
                        </div>
                        <Button
                            onClick={handleNameSubmit}
                            className="w-full"
                            disabled={!guestName.trim()}
                        >
                            Join Event
                        </Button>
                    </div>
                </DialogContent>
            </Dialog> */}

            {/* Main Content */}
            {/* {hasEnteredName && ( */}
                <>
                    {/* Event Header */}
                    <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
                        <div className="max-w-7xl mx-auto px-4 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">{mockEvent.title}</h1>
                                    <p className="text-gray-600 flex items-center gap-4 mt-1 text-sm">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            Feb 15, 2024
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            {mockEvent.location.name}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-4 h-4" />
                                            {loading ? 'Loading...' : `${photos.length} photos`}
                                        </span>
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    {mockEvent.permissions.can_download && (
                                        <Button 
                                            variant="outline" 
                                            disabled={loading || photos.length === 0}
                                            className="flex items-center gap-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download All
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto px-4 py-8">
                        {/* Error State */}
                        {error && (
                            <div className="text-center py-16">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                                    <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Photos</h3>
                                    <p className="text-red-600 mb-4">{error}</p>
                                    <Button onClick={fetchMedia} variant="outline" className="text-red-600 border-red-300">
                                        Try Again
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Loading State */}
                        {loading && (
                            <div className="text-center py-16">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                                <p className="text-gray-600">Loading photos...</p>
                            </div>
                        )}

                        {/* Pinterest Photo Grid */}
                        {!loading && !error && photos.length > 0 && (
                            <PinterestPhotoGrid photos={photos} onPhotoClick={handlePhotoClick} />
                        )}

                        {/* Empty State */}
                        {!loading && !error && photos.length === 0 && (
                            <div className="text-center py-16">
                                <Camera className="w-20 h-20 mx-auto text-gray-300 mb-4" />
                                <h3 className="text-xl font-medium text-gray-600 mb-2">No photos yet</h3>
                                <p className="text-gray-400">Be the first to share a memory!</p>
                            </div>
                        )}
                    </div>

                    {/* Fullscreen Photo Viewer */}
                    {photoViewerOpen && selectedPhoto && (
                        <FullscreenPhotoViewer
                            selectedPhoto={selectedPhoto}
                            selectedPhotoIndex={selectedPhotoIndex}
                            photos={photos}
                            onClose={() => setPhotoViewerOpen(false)}
                            onPrev={() => navigateToPhoto('prev')}
                            onNext={() => navigateToPhoto('next')}
                            downloadPhoto={downloadPhoto}
                        />
                    )}

                    {/* Live Updates Indicator */}
                    <div className="fixed bottom-6 right-6 z-30">
                        <div className="bg-green-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            Live Updates
                        </div>
                    </div>
                </>
            {/* )} */}
        </div>
    );
}