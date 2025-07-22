'use client';
import React, { useState, useEffect, use } from 'react';
import { Camera, Upload, Users, Calendar, MapPin, Download, X, ChevronLeft, ChevronRight, Info, Heart, Share2, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useParams } from 'next/navigation';
import { getEventMediaWithGuestToken, transformMediaToPhoto } from '@/services/apis/media.api';

// TypeScript interfaces
interface ApiPhoto {
    _id: string;
    albumId: string;
    eventId: string;
    imageUrl: string;
    thumbnail: string;
    progressiveUrls: {
        placeholder: string;
        thumbnail: string;
        display: string;
        full: string;
    };
    createdAt: string;
    approval: {
        status: 'auto_approved' | 'approved' | 'pending' | 'rejected';
        approved_by?: string | null;
        approved_at?: string;
        rejection_reason?: string;
        auto_approval_reason?: string;
    };
    processing: {
        status: string;
        thumbnails_generated: boolean;
        ai_analysis: {
            completed: boolean;
            content_score: number;
            tags: string[];
            faces_detected: number;
        };
        compressed_versions: string[];
    };
    metadata: {
        width: number;
        height: number;
        duration: number;
        device_info: {
            brand: string;
            model: string;
            os: string;
        };
        location: {
            lat: number | null;
            lng: number | null;
        };
        timestamp: string | null;
        device: string;
    };
    url: string;
}

interface TransformedPhoto {
    id: string;
    url: string;
    thumbnail: string;
    display: string;
    placeholder: string;
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

interface EventDetailsPageProps {
    params: Promise<{ eventId: string }>;
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
    console.log(apiPhoto, 'API Photo Data');
    return {
        id: apiPhoto._id,
        url: apiPhoto.url,
        thumbnail: apiPhoto.url,
        display: apiPhoto.url,
        placeholder: apiPhoto.url,
        width: apiPhoto.metadata?.width || 400, // Default width if not available
        height: apiPhoto.metadata?.height || 600, // Default height if not available
        uploaded_by: "Guest", // You might want to get this from user data
        approval: apiPhoto.approval,
        createdAt: apiPhoto.createdAt,
        albumId: apiPhoto.albumId,
        eventId: apiPhoto.eventId
    };
};

// Fullscreen Photo Viewer Component Props
interface FullscreenPhotoViewerProps {
    selectedPhoto: TransformedPhoto;
    selectedPhotoIndex: number;
    photos: TransformedPhoto[];
    userPermissions: MockEvent['permissions'];
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
    setPhotoInfoOpen: (open: boolean) => void;
    deletePhoto: (photo: TransformedPhoto) => void;
    downloadPhoto: (photo: TransformedPhoto) => void;
}

// Fullscreen Photo Viewer Component
const FullscreenPhotoViewer: React.FC<FullscreenPhotoViewerProps> = ({
    selectedPhoto,
    selectedPhotoIndex,
    photos,
    userPermissions,
    onClose,
    onPrev,
    onNext,
    setPhotoInfoOpen,
    deletePhoto,
    downloadPhoto
}) => {
    const [showControls, setShowControls] = useState(true);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowLeft':
                    onPrev();
                    break;
                case 'ArrowRight':
                    onNext();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onPrev, onNext]);

    return (
        <div
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            onClick={() => setShowControls(!showControls)}
        >
            {/* Top Controls */}
            <div className={`absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="text-white hover:bg-white/20"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                        <span className="text-sm">
                            {selectedPhotoIndex + 1} of {photos.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setPhotoInfoOpen(true); }}
                            className="text-white hover:bg-white/20"
                        >
                            <Info className="w-5 h-5" />
                        </Button>
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
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-white hover:bg-white/20"
                        >
                            <MoreVertical className="w-5 h-5" />
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
                    className={`absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 z-10 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
                >
                    <ChevronLeft className="w-6 h-6" />
                </Button>
            )}

            {selectedPhotoIndex < photos.length - 1 && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                    className={`absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 z-10 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
                >
                    <ChevronRight className="w-6 h-6" />
                </Button>
            )}

            {/* Image */}
            <img
                src={selectedPhoto.display || selectedPhoto.url}
                alt="Fullscreen view"
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
            />

            {/* Bottom Info */}
            <div className={`absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/50 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <div className="text-white text-center">
                    <Badge variant="secondary" className="mb-2">
                        Uploaded by {selectedPhoto.uploaded_by}
                    </Badge>
                    {selectedPhoto.createdAt && (
                        <p className="text-xs opacity-75 mt-1">
                            {new Date(selectedPhoto.createdAt).toLocaleDateString()}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

// Pinterest-style Photo Grid Component Props
interface PhotoGridProps {
    photos: TransformedPhoto[];
    onPhotoClick: (photo: TransformedPhoto) => void;
}

// Pinterest-style Photo Grid Component
const PhotoGrid: React.FC<PhotoGridProps> = ({ photos, onPhotoClick }) => {
    const [columns, setColumns] = useState(3);
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

    useEffect(() => {
        const updateColumns = () => {
            const width = window.innerWidth;
            if (width < 640) setColumns(2);
            else if (width < 1024) setColumns(3);
            else if (width < 1280) setColumns(4);
            else setColumns(5);
        };

        updateColumns();
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, []);

    const handleImageError = (photoId: string) => {
        setImageErrors(prev => new Set(prev).add(photoId));
    };

    // Distribute photos across columns
    const distributedPhotos = Array.from({ length: columns }, () => [] as TransformedPhoto[]);
    const columnHeights = Array(columns).fill(0);
    console.log(photos, 'asdfasdfphtosss');
    photos.forEach((photo) => {
        // Find the column with minimum height
        const minHeightIndex = columnHeights.indexOf(Math.min(...columnHeights));
        distributedPhotos[minHeightIndex].push(photo);

        // Update column height (approximate)
        // Use a default aspect ratio if dimensions aren't available
        const aspectRatio = (photo.height && photo.width) ? photo.height / photo.width : 1.2;
        const estimatedHeight = 250 * aspectRatio; // Base width of 250px
        columnHeights[minHeightIndex] += estimatedHeight + 16; // Add gap
    });

    return (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {distributedPhotos.map((columnPhotos, columnIndex) => (
                <div key={columnIndex} className="flex flex-col gap-2">
                    {columnPhotos.map((photo) => {
                        const hasError = imageErrors.has(photo.id);

                        return (
                            <div
                                key={photo.id}
                                className="relative group cursor-pointer overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                                onClick={() => onPhotoClick(photo)}
                            >
                                
                                {/* Progressive loading with placeholder */}
                                <div className="relative">
                                    {/* Placeholder blur - only show if main image hasn't loaded yet */}
                                    {photo.placeholder && !hasError && (
                                        <img
                                            src={photo.thumbnail}
                                            alt=""
                                            className="absolute inset-0 w-full h-full object-cover blur-sm scale-110 transition-opacity duration-300"
                                        />
                                    )}

                                    {/* Main thumbnail */}
                                    {!hasError ? (
                                        <img
                                            src={photo.thumbnail}
                                            alt="Event photo"
                                            className="relative w-full h-auto object-cover transition-transform duration-200 group-hover:scale-105"
                                            style={{
                                                aspectRatio: (photo.width && photo.height)
                                                    ? `${photo.width}/${photo.height}`
                                                    : '3/4' // Default aspect ratio
                                            }}
                                            loading="lazy"
                                            onLoad={(e) => {
                                                // Hide placeholder once main image loads
                                                const target = e.target as HTMLImageElement;
                                                const placeholder = target.previousElementSibling as HTMLElement;
                                                if (placeholder) {
                                                    placeholder.style.opacity = '0';
                                                }
                                            }}
                                            onError={() => handleImageError(photo.id)}
                                        />
                                    ) : (
                                        // Fallback when image fails to load
                                        <div
                                            className="relative w-full bg-gray-200 flex items-center justify-center"
                                            style={{
                                                aspectRatio: (photo.width && photo.height)
                                                    ? `${photo.width}/${photo.height}`
                                                    : '3/4'
                                            }}
                                        >
                                            <Camera className="w-8 h-8 text-gray-400" />
                                        </div>
                                    )}
                                </div>

                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-white hover:bg-white/20 h-8 w-8 p-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Handle favorite
                                        }}
                                    >
                                        <Heart className="w-4 h-4" />
                                    </Button>
                                </div>

                                <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <Badge variant="secondary" className="text-xs">
                                        {photo.uploaded_by}
                                    </Badge>
                                    {/* Show approval status if pending */}
                                    {photo.approval?.status === 'pending' && (
                                        <Badge variant="outline" className="text-xs ml-1 bg-yellow-100 text-yellow-800">
                                            Pending
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export default function EventDetailsPage({ params }: EventDetailsPageProps) {
    const { eventId } = use(params);
    const [guestName, setGuestName] = useState<string>('');
    const [hasEnteredName, setHasEnteredName] = useState<boolean>(false);
    const [showNameDialog, setShowNameDialog] = useState<boolean>(true);
    const [photoViewerOpen, setPhotoViewerOpen] = useState<boolean>(false);
    const [selectedPhoto, setSelectedPhoto] = useState<TransformedPhoto | null>(null);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
    const [photoInfoOpen, setPhotoInfoOpen] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    // Simulate localStorage with state (since localStorage isn't available in artifacts)
    const [savedName, setSavedName] = useState<string>('');
    const [photos, setPhotos] = useState<TransformedPhoto[]>([]);
    const userPermissions = mockEvent.permissions;

    console.log(eventId, 'Event ID from URL');

    const fetchMedia = async (): Promise<boolean> => {
        try {
            setLoading(true);
            setError(null);

            // Use the actual API function
            let mediaItems: ApiPhoto[] = await getEventMediaWithGuestToken(eventId);

            console.log('Raw media items from API:', mediaItems);

            if (mediaItems && Array.isArray(mediaItems)) {
                // Transform API photos to component format
                const transformedPhotos = mediaItems.map(transformApiPhoto);

                console.log('Transformed photos:', transformedPhotos);

                // Separate approved and pending photos
                const approvedPhotos = transformedPhotos.filter(photo =>
                    !photo.approval ||
                    photo.approval.status === 'approved' ||
                    photo.approval.status === 'auto_approved'
                );

                console.log('Approved photos:', approvedPhotos);

                setPhotos(approvedPhotos);
                return true;
            } else {
                console.warn('No media items received or invalid format');
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

    console.log('Current photos state:', photos);

    useEffect(() => {
        // Simulate checking localStorage
        if (savedName) {
            setGuestName(savedName);
            setHasEnteredName(true);
            setShowNameDialog(false);
        }
    }, [savedName]);

    const handleNameSubmit = (): void => {
        if (guestName.trim()) {
            setSavedName(guestName); // Simulate localStorage
            setHasEnteredName(true);
            setShowNameDialog(false);
        }
    };

    const handlePhotoClick = (photo: TransformedPhoto): void => {
        const photoIndex = photos.findIndex(p => p.id === photo.id);
        setSelectedPhoto(photo);
        setSelectedPhotoIndex(photoIndex);
        setPhotoViewerOpen(true);
    };

    const navigateToPhoto = (direction: 'next' | 'prev'): void => {
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
    };

    const deletePhoto = (photo: TransformedPhoto): void => {
        console.log('Delete photo:', photo);
    };

    const downloadPhoto = (photo: TransformedPhoto): void => {
        const link = document.createElement('a');
        link.href = photo.url;
        link.download = `photo-${photo.id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Name Entry Dialog */}
            <Dialog open={showNameDialog} onOpenChange={() => { }}>
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
            </Dialog>

            {/* Main Content */}
            {hasEnteredName && (
                <>
                    {/* Event Header */}
                    <div className="relative">
                        <div
                            className="h-48 bg-gradient-to-r from-pink-500 to-purple-600 bg-cover bg-center"
                            style={{ backgroundImage: `url(${mockEvent.cover_image.url})` }}
                        >
                            <div className="absolute inset-0 bg-black bg-opacity-40" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                            <h1 className="text-2xl font-bold mb-2">{mockEvent.title}</h1>
                            <div className="flex flex-wrap gap-4 text-sm opacity-90">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>Feb 15, 2024</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    <span>{mockEvent.location.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    <span>{mockEvent.stats.participants} people</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="container mx-auto px-4 py-8">
                        {/* Header with Download Button */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold">Event Memories</h2>
                                <p className="text-gray-600">
                                    {loading ? 'Loading...' : `${photos.length} photos shared`}
                                </p>
                            </div>
                            {mockEvent.permissions.can_download && (
                                <Button variant="outline" disabled={loading || photos.length === 0}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Download All
                                </Button>
                            )}
                        </div>

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

                        {/* Pinterest-style Photo Grid */}
                        {!loading && !error && photos.length > 0 && (
                            <PhotoGrid photos={photos} onPhotoClick={handlePhotoClick} />
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
                            userPermissions={userPermissions}
                            onClose={() => setPhotoViewerOpen(false)}
                            onPrev={() => navigateToPhoto('prev')}
                            onNext={() => navigateToPhoto('next')}
                            setPhotoInfoOpen={setPhotoInfoOpen}
                            deletePhoto={deletePhoto}
                            downloadPhoto={downloadPhoto}
                        />
                    )}

                    {/* Footer */}
                    <div className="p-6 text-center text-xs text-gray-400">
                        <p>Powered by YourApp • Share memories, create connections</p>
                    </div>
                </>
            )}
        </div>
    );
}