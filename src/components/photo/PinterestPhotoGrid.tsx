import { TransformedPhoto } from "@/app/guest/[eventId]/page";
import { useCallback, useEffect, useState } from "react";
import { PinterestPhotoCard } from "./PinterestPhotoCard";

export const PinterestPhotoGrid: React.FC<{
    photos: TransformedPhoto[];
    onPhotoClick: (photo: TransformedPhoto, index: number) => void;
}> = ({ photos, onPhotoClick }) => {
    const [columns, setColumns] = useState(3);
    const [likedPhotos, setLikedPhotos] = useState<Set<string>>(new Set());

    // Responsive column calculation
    useEffect(() => {
        const updateColumns = () => {
            const width = window.innerWidth;
            if (width < 640) setColumns(2);      // Mobile
            else if (width < 768) setColumns(3); // Tablet
            else if (width < 1024) setColumns(4); // Small desktop
            else if (width < 1280) setColumns(5); // Medium desktop
            else setColumns(6);                   // Large desktop
        };

        updateColumns();
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, []);

    const handleLike = useCallback((photoId: string) => {
        setLikedPhotos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(photoId)) {
                newSet.delete(photoId);
            } else {
                newSet.add(photoId);
            }
            return newSet;
        });
    }, []);

    // Base width for each column (will be responsive)
    const baseWidth = 280;

    return (
        <div 
            className="grid gap-4"
            style={{ 
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gridAutoRows: '10px' // Small row height for fine control
            }}
        >
            {photos.map((photo, index) => {
                // Calculate optimized height maintaining aspect ratio
                let optimizedHeight = baseWidth * 1.2; // Default
                
                if (photo.width && photo.height) {
                    optimizedHeight = (baseWidth * photo.height) / photo.width;
                }
                
                // Ensure reasonable bounds
                optimizedHeight = Math.max(200, Math.min(optimizedHeight, 600));
                
                // Calculate grid row span (each row is 10px)
                const rowSpan = Math.ceil(optimizedHeight / 10);

                return (
                    <PinterestPhotoCard
                        key={photo.id}
                        photo={photo}
                        index={index}
                        baseWidth={baseWidth}
                        optimizedHeight={optimizedHeight}
                        rowSpan={rowSpan}
                        isLiked={likedPhotos.has(photo.id)}
                        onLike={() => handleLike(photo.id)}
                        onClick={() => onPhotoClick(photo, index)}
                    />
                );
            })}
        </div>
    );
};
