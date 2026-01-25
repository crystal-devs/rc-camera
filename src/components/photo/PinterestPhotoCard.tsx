// components/photo/PinterestPhotoCard.tsx - Pinterest-style with clean loading
import { Camera, Download, Heart } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { TransformedPhoto } from "@/types/events";

interface PinterestPhotoCardProps {
  photo: TransformedPhoto;
  index: number;
  baseWidth: number;
  expectedHeight: number;
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
    setIsLoaded(true); // Mark as loaded to show error state
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isLoaded && !hasError) {
        onClick();
      }
    }
  }, [isLoaded, hasError, onClick]);

  return (
    <div
      className={`group relative w-full rounded-2xl overflow-hidden transition-[opacity,shadow] duration-300 ${isLoaded ? 'cursor-pointer hover:shadow-xl' : ''} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
      onClick={isLoaded && !hasError ? onClick : undefined}
      onKeyDown={handleKeyDown}
      tabIndex={isLoaded && !hasError ? 0 : -1}
      role="button"
      aria-label={`Photo ${index + 1}`}
      style={{
        backgroundColor: isLoaded ? 'transparent' : '#f0f0f0',
        height: expectedHeight
      }}
    >
      {!hasError ? (
        <>
          {/* Pinterest-style loading placeholder */}
          {!isLoaded && (
            <div
              className="w-full rounded-2xl animate-pulse"
              style={{
                height: expectedHeight,
                backgroundColor: '#e8e8e8'
              }}
            />
          )}

          {/* Actual Image */}
          <img
            ref={imageRef}
            width={baseWidth}
            srcSet={
              photo.responsive_urls
                ? [
                  photo.responsive_urls.thumbnail ? `${photo.responsive_urls.thumbnail} 400w` : null,
                  photo.responsive_urls.display ? `${photo.responsive_urls.display} 800w` : null,
                  photo.responsive_urls.full ? `${photo.responsive_urls.full} 1600w` : null
                ]
                  .filter(Boolean)
                  .join(', ') || undefined
                : undefined
            }
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            src={photo.responsive_urls?.display || photo.src}
            alt={`Photo ${photo.id}`}
            className={`
              w-full h-full object-cover rounded-2xl transition-opacity duration-300
              ${isLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}
            `}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading={index < 12 ? "eager" : "lazy"}
          />
        </>
      ) : (
        // Error state - minimal placeholder
        <div
          className="w-full bg-gray-100 flex items-center justify-center rounded-2xl"
          style={{ height: expectedHeight }}
        >
          <Camera className="w-12 h-12 text-gray-300" />
        </div>
      )}

      {/* Hover overlay - ONLY show when loaded */}
      {isLoaded && !hasError && (<></>
        // <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none">
        //   {/* Button container with fixed positioning */}
        //   <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-end gap-2 pointer-events-auto">
        //     <button
        //       onClick={handleLikeClick}
        //       aria-label={isLiked ? "Unlike photo" : "Like photo"}
        //       className={`
        //         p-3 rounded-full backdrop-blur-md transition-all duration-200 shadow-lg
        //         ${isLiked
        //           ? 'bg-red-500 text-white scale-110'
        //           : 'bg-white/90 text-gray-700 hover:bg-white hover:scale-105'
        //         }
        //       `}
        //     >
        //       <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
        //     </button>

        //     <button
        //       onClick={handleDownload}
        //       aria-label="Download photo"
        //       className="p-3 rounded-full bg-white/90 text-gray-700 hover:bg-white hover:scale-105 transition-all duration-200 backdrop-blur-md shadow-lg"
        //     >
        //       <Download className="w-4 h-4" />
        //     </button>
        //   </div>
        // </div>
      )}
    </div>
  );
};