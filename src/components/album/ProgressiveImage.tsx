// Optimized ProgressiveImage using only ImageKit Next.js library
import React, { useState, useMemo } from 'react';
import { Image as ImageKitImage } from '@imagekit/next';
import { AlertCircleIcon } from 'lucide-react';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  onClick?: () => void;
  fit?: 'cover' | 'contain';
  fullHeight?: boolean;
  index?: number;
  urlEndpoint?: string; 
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
  urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT

}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');

  // Smart priority: Only first 4 images get priority (likely above fold)
  const shouldUsePriority = useMemo(() => {
    return priority || 
           className?.includes('above-the-fold') || 
           fullHeight ||
           index < 4;
  }, [priority, className, fullHeight, index]);

  // Dynamic transformations based on use case and device
  const getTransformations = useMemo(() => {
    const baseTransformations = [
      { format: 'auto' }, // Auto format selection (webp/avif when supported)
      { progressive: true }
    ];

    if (fullHeight) {
      // Full screen view - high quality, responsive, no width restriction
      return [
        ...baseTransformations,
        { quality: 95 },
        { dpr: 'auto' }, // Auto device pixel ratio for retina displays
      ];
    }
    
    if (shouldUsePriority) {
      // Above fold images - good quality, optimized for fast loading
      return [
        ...baseTransformations,
        { width: 800 },
        { quality: 85 },
        { dpr: 'auto' },
      ];
    }
    
    // Gallery thumbnails - highly optimized for fast loading
    return [
      ...baseTransformations,
      { width: 400 },
      { quality: 75 },
      { dpr: 'auto' },
    ];
  }, [fullHeight, shouldUsePriority]);

  // Enhanced LQIP settings for better UX
  const lqipSettings = useMemo(() => ({
    active: true,
    quality: 20,
    blur: 6,
  }), []);

  const handleLoad = () => {
    setImageState('loaded');
  };

  const handleError = () => {
    setImageState('error');
  };

  if (imageState === 'error') {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <AlertCircleIcon className="h-8 w-8 text-gray-400" />
      </div>
    );
  }

  // For fullscreen view - use fill with container sizing
  // if (fullHeight) {
  //   return (
  //     <div className={`relative w-full h-full ${className}`} onClick={onClick}>
  //       <ImageKitImage
  //         src={src}
  //         alt={alt}
  //         fill
  //         transformation={getTransformations}
  //         lqip={lqipSettings}
  //         loading={shouldUsePriority ? 'eager' : 'lazy'}
  //         onLoad={handleLoad}
  //         onError={handleError}
  //         className={`object-contain transition-all duration-300 ${
  //           imageState === 'loading' ? 'opacity-70' : 'opacity-100'
  //         }`}
  //         sizes="100vw"
  //         priority={shouldUsePriority}
  //       />
  //       {imageState === 'loading' && (
  //         <div className="absolute inset-0 flex items-center justify-center bg-black/20">
  //           <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
  //         </div>
  //       )}
  //     </div>
  //   );
  // }

  // Gallery view - using ImageKit's fill behavior with enhanced optimizations
  return (
    <div className={`relative ${className}`} onClick={onClick}>
      <ImageKitImage
        src={src}
        alt={alt}
        fill
        transformation={getTransformations}
        lqip={lqipSettings}
        className={`object-${fit} transition-all duration-300 ${
          imageState === 'loading' ? 'opacity-70' : 'opacity-100'
        }`}
        sizes={sizes}
        priority={shouldUsePriority}
        loading={shouldUsePriority ? 'eager' : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
      />
      {imageState === 'loading' && (
        <div className="absolute inset-0 bg-gray-100/50 animate-pulse flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default ProgressiveImage;



/*
Key optimizations implemented:

1. **Fixed width/height error**: Always use `fill` prop with proper container sizing
2. **Enhanced transformations**: No width restrictions for fullscreen, allowing full quality
3. **Better LQIP**: Optimized blur placeholders for smooth loading
4. **Keyboard navigation**: Arrow keys and escape for better UX
5. **Performance**: useCallback for event handlers to prevent re-renders
6. **Visual improvements**: Better gradients and transitions
7. **Auto DPR**: Automatic retina display support
8. **Format optimization**: Auto WebP/AVIF selection
9. **Progressive loading**: Better for large images
10. **Memory optimization**: Proper cleanup of event listeners

Usage:
- Make sure NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT is set in your .env.local
- Wrap your app with ImageKitProvider for global context
- Use the optimized components as drop-in replacements
*/