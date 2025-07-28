import { TransformedPhoto } from "@/app/guest/[eventId]/page";
import { useCallback, useState } from "react";
import { PinterestPhotoCard } from "./PinterestPhotoCard";

export const PinterestPhotoGrid: React.FC<{
    photos: TransformedPhoto[];
    onPhotoClick: (photo: TransformedPhoto, index: number) => void;
}> = ({ photos, onPhotoClick }) => {
    const [likedPhotos, setLikedPhotos] = useState<Set<string>>(new Set());

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

    return (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-2 space-y-4">
            {photos.map((photo, index) => {
                // Calculate optimized height maintaining aspect ratio
                const baseWidth = 280;
                let optimizedHeight = baseWidth * 1.3; // Default

                if (photo.width && photo.height) {
                    optimizedHeight = (baseWidth * photo.height) / photo.width;
                }

                // Ensure reasonable bounds
                optimizedHeight = Math.max(200, Math.min(optimizedHeight, 500));

                return (
                    <div key={photo.id} className="break-inside-avoid mb-4">
                        <PinterestPhotoCard
                            photo={photo}
                            index={index}
                            baseWidth={baseWidth}
                            optimizedHeight={optimizedHeight}
                            rowSpan={1}
                            isLiked={likedPhotos.has(photo.id)}
                            onLike={() => handleLike(photo.id)}
                            onClick={() => onPhotoClick(photo, index)}
                        />
                    </div>
                );
            })}
        </div>
    );
};