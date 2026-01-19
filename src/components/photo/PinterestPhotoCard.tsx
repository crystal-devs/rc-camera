// components/photo/PinterestPhotoCard.tsx - Natural Aspect Ratio Version
import { Camera, Download, Heart } from "lucide-react";
import { useState, useCallback, useRef } from "react";
// import { Image as ImageKitImage } from '@imagekit/next'; // Not needed for natural aspect ratios
import { TransformedPhoto } from "@/types/events";

interface PinterestPhotoCardProps {
  photo: TransformedPhoto;
  index: number;
  baseWidth: number;
  expectedHeight: number; // Only for optimization, not forcing
  isLiked: boolean;
  onLike: () => void;
  onClick: () => void;
  onImageLoad?: (photoId: string, actualHeight: number) => void;
}

export const PinterestPhotoCard: React.FC<PinterestPhotoCardProps> = ({
  photo,
  index,
  baseWidth,
  expectedHeight,
  isLiked,
  onLike,
  onClick,
  onImageLoad
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageLoad = useCallback(() => {
    setIsLoaded(true);

    // Get actual rendered height and report back
    if (imageRef.current && onImageLoad) {
      const actualHeight = imageRef.current.offsetHeight;
      onImageLoad(photo.id, actualHeight);
    }
  }, [onImageLoad, photo.id]);

  const handleImageError = useCallback(() => {
    setHasError(true);
    // Report expected height as fallback
    if (onImageLoad) {
      onImageLoad(photo.id, expectedHeight);
    }
  }, [onImageLoad, photo.id, expectedHeight]);

  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(photo.responsive_urls?.original || photo.src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `photo-${photo.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to opening in new tab
      window.open(photo.responsive_urls?.original || photo.src, '_blank');
    }
  }, [photo.responsive_urls, photo.src, photo.id]);

  const handleLikeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onLike();
  }, [onLike]);

  return (
    <div
      className="group relative w-full bg-white overflow-hidden transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <div className="relative w-full">
        {!hasError ? (
          <>
            {/* Loading placeholder with expected aspect ratio */}
            {!isLoaded && (
              <div
                className="w-full bg-gray-100 animate-pulse flex items-center justify-center"
                style={{ height: expectedHeight }}
              >
                <Camera className="w-8 h-8 text-gray-300" />
              </div>
            )}

            {/* Actual Image - Regular img tag for natural aspect ratio */}
            <img
              ref={imageRef}
              srcSet={
                photo.responsive_urls
                  ? `${photo.responsive_urls.thumbnail} 400w,
                    ${photo.responsive_urls.display} 800w,
                    ${photo.responsive_urls.full} 1600w`
                  : undefined
              }
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              src={photo.responsive_urls?.display}
              alt={`Photo ${photo.id}`}
              className={`
                w-full h-auto object-cover transition-all duration-500
                ${isLoaded ? 'opacity-100' : 'opacity-0 absolute top-0 left-0'}
              `}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading={index < 12 ? "eager" : "lazy"}
            />
          </>
        ) : (
          // Error state
          <div
            className="w-full bg-gray-100 flex items-center justify-center"
            style={{ height: expectedHeight }}
          >
            <Camera className="w-12 h-12 text-gray-300" />
          </div>
        )}

        {/* Hover overlay - Gradient at bottom only */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-transparent group-hover:to-black/40 transition-all duration-300">
          <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <button
              onClick={handleLikeClick}
              className={`
                p-3 rounded-full backdrop-blur-md transition-all duration-200 shadow-lg
                ${isLiked
                  ? 'bg-red-500 text-white scale-110'
                  : 'bg-white/90 text-gray-700 hover:bg-white hover:scale-105'
                }
              `}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleDownload}
              className="p-3 rounded-full bg-white/90 text-gray-700 hover:bg-white hover:scale-105 transition-all duration-200 backdrop-blur-md shadow-lg"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Loading spinner */}
        {!isLoaded && !hasError && (
          <div className="absolute top-4 left-4">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};