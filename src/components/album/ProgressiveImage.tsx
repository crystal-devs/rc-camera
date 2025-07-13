// Optimized ProgressiveImage for large galleries
import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { AlertCircleIcon, DownloadIcon, TrashIcon } from 'lucide-react';
import { Button } from '../ui/button';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  onClick?: () => void;
  fit?: 'cover' | 'contain';
  fullHeight?: boolean;
  index?: number; // Add index to determine priority
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className = '',
  priority = false,
  sizes = '(max-width: 768px) 33vw, 25vw',
  onClick,
  fit = 'cover',
  fullHeight = false,
  index = 0,
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentSrc, setCurrentSrc] = useState<string>('');

  const imageUrls = useMemo(() => {
    if (!src) return { placeholder: '', thumbnail: '', display: '', full: src };
    const isImageKit = src.includes('imagekit.io') || src.includes('ik.imagekit.io');
    if (isImageKit) {
      return {
        placeholder: `${src}?tr=w-20,h-15,bl-10,q-20`,
        thumbnail: `${src}?tr=w-300,q-60,f-webp`,
        display: `${src}?tr=w-800,q-80,f-webp`,
        full: `${src}?tr=q-95,f-webp`
      };
    }
    return {
      placeholder: src,
      thumbnail: src,
      display: src,
      full: src
    };
  }, [src]);

  // Smart priority: Only first 4 images get priority (likely above fold)
  const shouldUsePriority = useMemo(() => {
    return priority || 
           className?.includes('above-the-fold') || 
           fullHeight ||
           index < 4; // Only first 4 images
  }, [priority, className, fullHeight, index]);

  useEffect(() => {
    if (!src) return;
    
    let isMounted = true;
    setImageState('loading');
    
    // Start with placeholder
    setCurrentSrc(imageUrls.placeholder);

    const loadImage = (imageSrc: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageSrc;
      });
    };

    const loadProgressive = async () => {
      try {
        // For non-priority images, add a small delay to prevent overwhelming the browser
        if (!shouldUsePriority && index > 10) {
          await new Promise(resolve => setTimeout(resolve, index * 50)); // Stagger loading
        }

        // Load thumbnail first
        if (imageUrls.thumbnail !== imageUrls.placeholder) {
          await loadImage(imageUrls.thumbnail);
          if (isMounted) {
            setCurrentSrc(imageUrls.thumbnail);
          }
        }

        // For fullscreen mode, load full quality
        if (fullHeight) {
          await loadImage(imageUrls.full);
          if (isMounted) {
            setCurrentSrc(imageUrls.full);
            setImageState('loaded');
          }
        } else {
          // For gallery view, thumbnail is often sufficient
          // Only load display quality if it's a priority image or user is likely to interact
          if (shouldUsePriority || index < 20) {
            if (imageUrls.display !== imageUrls.thumbnail) {
              await loadImage(imageUrls.display);
              if (isMounted) {
                setCurrentSrc(imageUrls.display);
              }
            }
          }
          
          if (isMounted) {
            setImageState('loaded');
          }
        }
      } catch (error) {
        if (isMounted) {
          setImageState('error');
          setCurrentSrc(src); // Fallback to original
        }
      }
    };

    loadProgressive();
    return () => { isMounted = false; };
  }, [src, imageUrls, fullHeight, shouldUsePriority, index]);

  if (imageState === 'error') {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <AlertCircleIcon className="h-8 w-8 text-gray-400" />
      </div>
    );
  }

  // Fullscreen: use native img for better control and full quality image
  if (fullHeight) {
    const fullscreenSrc = imageState === 'loaded' ? imageUrls.full : (currentSrc || src);
    
    return (
      <div
        className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}
        onClick={onClick}
        style={{ background: '#000' }}
      >
        <img
          src={fullscreenSrc}
          alt={alt}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            transition: 'opacity 0.3s ease, filter 0.3s ease',
            filter: imageState === 'loading' ? 'blur(8px)' : 'none',
            opacity: imageState === 'loading' ? 0.7 : 1,
            display: 'block',
          }}
          loading={shouldUsePriority ? 'eager' : 'lazy'}
        />
        {imageState === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  }

  // Normal: use next/image with lazy loading for most images
  return (
    <div className={`relative ${className}`} onClick={onClick}>
      <Image
        src={currentSrc || src}
        alt={alt}
        fill
        className={`object-${fit} transition-all duration-300 ${
          imageState === 'loading' ? 'blur-sm opacity-70' : 'blur-0 opacity-100'
        }`}
        sizes={sizes}
        priority={shouldUsePriority}
        loading={shouldUsePriority ? 'eager' : 'lazy'} // Most images use lazy loading!
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyEkJyTkn/Z"
      />
      {imageState === 'loading' && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default ProgressiveImage;

// PhotoGrid optimization for large galleries
// const PhotoGrid: React.FC<PhotoGridProps> = ({
//   photos,
//   onPhotoClick,
//   userPermissions,
//   downloadPhoto,
//   deletePhoto
// }) => {
//   return (
//     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3 md:gap-4">
//       {photos.map((photo, index) => (
//         <div
//           key={photo.id}
//           className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200"
//         >
//           <ProgressiveImage
//             src={photo.imageUrl}
//             alt={`Photo ${index + 1}`}
//             className="" // No special classes needed
//             priority={false} // Let the component decide based on index
//             index={index} // Pass index for smart priority
//             sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 16.67vw, 12.5vw"
//             fit="cover"
//             onClick={() => onPhotoClick(photo, index)}
//           />
          
//           {/* Hover overlay - only show for loaded images to avoid layout shift */}
//           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
//             {userPermissions.download && (
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 className="text-white hover:bg-white/20 h-8 w-8"
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   downloadPhoto(photo);
//                 }}
//               >
//                 <DownloadIcon className="h-4 w-4" />
//               </Button>
//             )}
//             {userPermissions.delete && (
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 className="text-red-400 hover:bg-red-400/20 h-8 w-8"
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   if (confirm('Delete this photo?')) {
//                     deletePhoto(photo.id);
//                   }
//                 }}
//               >
//                 <TrashIcon className="h-4 w-4" />
//               </Button>
//             )}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// };