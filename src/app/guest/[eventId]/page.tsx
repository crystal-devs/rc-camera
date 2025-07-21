'use client';
import React, { useState, useEffect } from 'react';
import { Camera, Upload, Users, Calendar, MapPin, Download, X, ChevronLeft, ChevronRight, Info, Heart, Share2, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Mock data with varied aspect ratios
const mockEvent = {
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

const mockPhotos = [
    { id: 1, url: "https://picsum.photos/300/400?random=1", uploaded_by: "Guest User", type: "image", width: 300, height: 400 },
    { id: 2, url: "https://picsum.photos/400/300?random=2", uploaded_by: "Amit", type: "image", width: 400, height: 300 },
    { id: 3, url: "https://picsum.photos/300/300?random=3", uploaded_by: "Priya", type: "image", width: 300, height: 300 },
    { id: 4, url: "https://picsum.photos/350/500?random=4", uploaded_by: "Raj", type: "image", width: 350, height: 500 },
    { id: 5, url: "https://picsum.photos/400/250?random=5", uploaded_by: "Meera", type: "image", width: 400, height: 250 },
    { id: 6, url: "https://picsum.photos/300/450?random=6", uploaded_by: "Vikram", type: "image", width: 300, height: 450 },
    { id: 7, url: "https://picsum.photos/450/300?random=7", uploaded_by: "Anjali", type: "image", width: 450, height: 300 },
    { id: 8, url: "https://picsum.photos/300/350?random=8", uploaded_by: "Karan", type: "image", width: 300, height: 350 },
    { id: 9, url: "https://picsum.photos/400/400?random=9", uploaded_by: "Sita", type: "image", width: 400, height: 400 },
    { id: 10, url: "https://picsum.photos/350/280?random=10", uploaded_by: "Rohit", type: "image", width: 350, height: 280 },
    { id: 11, url: "https://picsum.photos/300/500?random=11", uploaded_by: "Neha", type: "image", width: 300, height: 500 },
    { id: 12, url: "https://picsum.photos/500/350?random=12", uploaded_by: "Arjun", type: "image", width: 500, height: 350 },
    { id: 13, url: "https://picsum.photos/320/400?random=13", uploaded_by: "Divya", type: "image", width: 320, height: 400 },
    { id: 14, url: "https://picsum.photos/400/320?random=14", uploaded_by: "Suresh", type: "image", width: 400, height: 320 },
    { id: 15, url: "https://picsum.photos/280/380?random=15", uploaded_by: "Kavya", type: "image", width: 280, height: 380 }
];

// Fullscreen Photo Viewer Component
const FullscreenPhotoViewer = ({ 
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
        const handleKeyDown = (e) => {
            switch(e.key) {
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
                src={selectedPhoto.url}
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
                </div>
            </div>
        </div>
    );
};

// Pinterest-style Photo Grid Component
const PhotoGrid = ({ photos, onPhotoClick }) => {
    const [columns, setColumns] = useState(3);

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

    // Distribute photos across columns
    const distributedPhotos = Array.from({ length: columns }, () => []);
    const columnHeights = Array(columns).fill(0);

    photos.forEach((photo) => {
        // Find the column with minimum height
        const minHeightIndex = columnHeights.indexOf(Math.min(...columnHeights));
        distributedPhotos[minHeightIndex].push(photo);
        
        // Update column height (approximate)
        const aspectRatio = photo.height / photo.width;
        const estimatedHeight = 250 * aspectRatio; // Base width of 250px
        columnHeights[minHeightIndex] += estimatedHeight + 16; // Add gap
    });

    return (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {distributedPhotos.map((columnPhotos, columnIndex) => (
                <div key={columnIndex} className="flex flex-col gap-2">
                    {columnPhotos.map((photo) => (
                        <div 
                            key={photo.id} 
                            className="relative group cursor-pointer overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                            onClick={() => onPhotoClick(photo)}
                        >
                            <img
                                src={photo.url}
                                alt="Event photo"
                                className="w-full h-auto object-cover transition-transform duration-200 group-hover:scale-105"
                                style={{ aspectRatio: `${photo.width}/${photo.height}` }}
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200" />
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
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default function GuestEventPage() {
    const [guestName, setGuestName] = useState('');
    const [hasEnteredName, setHasEnteredName] = useState(false);
    const [showNameDialog, setShowNameDialog] = useState(true);
    const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
    const [photoInfoOpen, setPhotoInfoOpen] = useState(false);

    const photos = mockPhotos;
    const userPermissions = mockEvent.permissions;

    // Simulate localStorage with state (since localStorage isn't available in artifacts)
    const [savedName, setSavedName] = useState('');

    useEffect(() => {
        // Simulate checking localStorage
        if (savedName) {
            setGuestName(savedName);
            setHasEnteredName(true);
            setShowNameDialog(false);
        }
    }, [savedName]);

    const handleNameSubmit = () => {
        if (guestName.trim()) {
            setSavedName(guestName); // Simulate localStorage
            setHasEnteredName(true);
            setShowNameDialog(false);
        }
    };

    const handlePhotoClick = (photo) => {
        const photoIndex = photos.findIndex(p => p.id === photo.id);
        setSelectedPhoto(photo);
        setSelectedPhotoIndex(photoIndex);
        setPhotoViewerOpen(true);
    };

    const navigateToPhoto = (direction) => {
        let newIndex;
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

    const deletePhoto = (photo) => {
        console.log('Delete photo:', photo);
    };

    const downloadPhoto = (photo) => {
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
            <Dialog open={showNameDialog} onOpenChange={() => {}}>
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
                                <p className="text-gray-600">{photos.length} photos shared</p>
                            </div>
                            {mockEvent.permissions.can_download && (
                                <Button variant="outline">
                                    <Download className="w-4 h-4 mr-2" />
                                    Download All
                                </Button>
                            )}
                        </div>

                        {/* Pinterest-style Photo Grid */}
                        {photos.length > 0 ? (
                            <PhotoGrid photos={photos} onPhotoClick={handlePhotoClick} />
                        ) : (
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