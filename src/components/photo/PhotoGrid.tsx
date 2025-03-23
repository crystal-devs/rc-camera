// components/photo/PhotoGrid.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';

interface Photo {
  id: string;
  imageUrl: string;
  thumbnail?: string;
  createdAt: Date;
  takenBy: number;
}

interface PhotoGridProps {
  photos: Photo[];
  onDelete?: (photoId: string) => void;
}

export function PhotoGrid({ photos, onDelete }: PhotoGridProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [columns, setColumns] = useState<Photo[][]>([[], [], []]);
  const [openPhotoId, setOpenPhotoId] = useState<string | null>(null);

  // Organize photos into columns for Pinterest-style layout
  useEffect(() => {
    if (photos.length === 0) return;

    const getColumnCount = () => {
      if (window.innerWidth < 640) return 2; // Mobile: 2 columns
      if (window.innerWidth < 1024) return 3; // Tablet: 3 columns
      return 4; // Desktop: 4 columns
    };

    const columnCount = getColumnCount();
    const newColumns: Photo[][] = Array.from({ length: columnCount }, () => []);

    // Sort photos by creation date (newest first)
    const sortedPhotos = [...photos].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Distribute photos to columns - this creates the masonry effect
    sortedPhotos.forEach((photo, index) => {
      const columnIndex = index % columnCount;
      newColumns[columnIndex].push(photo);
    });

    setColumns(newColumns);

    // Add window resize listener
    const handleResize = () => {
      const newColumnCount = getColumnCount();
      if (newColumnCount !== columns.length) {
        // Recalculate columns if the column count changes
        const resizedColumns: Photo[][] = Array.from({ length: newColumnCount }, () => []);
        const allPhotos = columns.flat();
        allPhotos.forEach((photo, index) => {
          const columnIndex = index % newColumnCount;
          resizedColumns[columnIndex].push(photo);
        });
        setColumns(resizedColumns);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [photos]);

  const handlePhotoClick = (id: string) => {
    setOpenPhotoId(id);
    const index = photos.findIndex(photo => photo.id === id);
    if (index !== -1) {
      setActiveIndex(index);
    }
  };

  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeIndex !== null && activeIndex > 0) {
      const newIndex = activeIndex - 1;
      setActiveIndex(newIndex);
      setOpenPhotoId(photos[newIndex].id);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeIndex !== null && activeIndex < photos.length - 1) {
      const newIndex = activeIndex + 1;
      setActiveIndex(newIndex);
      setOpenPhotoId(photos[newIndex].id);
    }
  };

  const handleDownload = (e: React.MouseEvent, imageUrl: string) => {
    e.stopPropagation();
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `photo-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (e: React.MouseEvent, photoId: string) => {
    e.stopPropagation();
    
    if (confirm('Are you sure you want to delete this photo?')) {
      try {
        await db.photos.delete(photoId);
        if (onDelete) {
          onDelete(photoId);
        }
        // Close the dialog if we're viewing the deleted photo
        if (openPhotoId === photoId) {
          setOpenPhotoId(null);
        }
      } catch (error) {
        console.error('Error deleting photo:', error);
      }
    }
  };

  const closeDialog = () => {
    setOpenPhotoId(null);
    setActiveIndex(null);
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No photos in this album yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {columns.map((column, colIndex) => (
          <div key={`column-${colIndex}`} className="flex flex-col gap-2">
            {column.map((photo) => (
              <div 
                key={photo.id}
                className="relative overflow-hidden bg-gray-100 rounded-md cursor-pointer group"
                onClick={() => handlePhotoClick(photo.id)}
              >
                <img 
                  src={photo.thumbnail || photo.imageUrl} 
                  alt="Photo"
                  className="w-full h-auto object-cover transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-end justify-end p-2 opacity-0 group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-black/40 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(e, photo.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Fullscreen photo view dialog */}
      <Dialog open={openPhotoId !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent 
          className="sm:max-w-xl md:max-w-3xl lg:max-w-5xl max-h-[90vh] p-0 overflow-hidden bg-black flex items-center"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
          onTouchStart={() => setShowControls(true)}
        >
          {activeIndex !== null && (
            <>
              <img 
                src={photos[activeIndex]?.imageUrl} 
                alt="Full size photo"
                className="w-full h-auto max-h-[90vh] object-contain"
              />
              
              {/* Navigation and controls */}
              <div className={`absolute inset-0 pointer-events-none transition-opacity duration-200 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                {/* Left/Right buttons */}
                <div className="absolute inset-y-0 left-0 flex items-center pointer-events-auto">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-12 w-12 rounded-full bg-black/30 text-white ml-2"
                    onClick={handlePrevious}
                    disabled={activeIndex === 0}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                </div>
                
                <div className="absolute inset-y-0 right-0 flex items-center pointer-events-auto">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-12 w-12 rounded-full bg-black/30 text-white mr-2"
                    onClick={handleNext}
                    disabled={activeIndex === photos.length - 1}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </div>
                
                {/* Bottom controls */}
                <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-auto">
                  <div className="flex justify-between items-center h-full px-4">
                    <div className="text-sm text-white">
                      {activeIndex + 1} of {photos.length}
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full bg-white/10 text-white"
                        onClick={(e) => handleDownload(e, photos[activeIndex]?.imageUrl)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full bg-white/10 text-white"
                        onClick={(e) => handleDelete(e, photos[activeIndex]?.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}