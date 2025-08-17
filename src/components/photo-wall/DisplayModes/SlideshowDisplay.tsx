// app/wall/[shareToken]/components/SlideshowDisplay.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';
import { PhotoWallItem } from '@/services/apis/photowall.api';

interface SlideshowDisplayProps {
    images: PhotoWallItem[];
    currentIndex: number;
    showUploaderNames?: boolean;
}

export const SlideshowDisplay = React.memo<SlideshowDisplayProps>(({ 
    images, 
    currentIndex, 
    showUploaderNames = false 
}) => {
    if (images.length === 0) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">📷</div>
                    <p className="text-xl text-slate-400">No photos yet</p>
                    <p className="text-sm text-slate-500">Photos will appear here as they're uploaded</p>
                </div>
            </div>
        );
    }

    const currentImage = images[currentIndex];
    if (!currentImage) return null;

    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {/* Blurred Background */}
            <AnimatePresence>
                <motion.div
                    key={`bg-${currentIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 z-0"
                >
                    <img
                        src={currentImage.imageUrl}
                        alt=""
                        className="w-full h-full object-cover blur scale-110 opacity-30"
                        loading="lazy"
                    />
                </motion.div>
            </AnimatePresence>

            {/* Main Image with Overlapping Fade Animation */}
            <AnimatePresence>
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                        duration: 0.5,
                        ease: "easeInOut"
                    }}
                    className="absolute inset-0 z-10 flex items-center justify-center w-full h-full p-2 md:p-8"
                >
                    <div className="relative flex items-center justify-center w-full h-full">
                        <img
                            src={currentImage.imageUrl}
                            alt={`Photo ${currentIndex + 1}`}
                            className="w-auto h-auto max-w-full max-h-full object-contain rounded-xl shadow-xl"
                            loading="lazy"
                        />

                        {/* Badges Container */}
                        <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                            {currentImage.isNew && (
                                <Badge className="bg-red-500 text-white animate-pulse">
                                    NEW
                                </Badge>
                            )}
                            
                            {showUploaderNames && currentImage.uploaderName && (
                                <Badge 
                                    variant="secondary" 
                                    className="bg-black/70 text-white border-slate-600 backdrop-blur-sm"
                                >
                                    <User className="h-3 w-3 mr-1" />
                                    {currentImage.uploaderName}
                                </Badge>
                            )}
                        </div>

                        {/* Photo count indicator */}
                        <div className="absolute bottom-4 left-4 z-20">
                            <Badge 
                                variant="outline" 
                                className="bg-black/50 text-white border-slate-600 backdrop-blur-sm"
                            >
                                {currentIndex + 1} of {images.length}
                            </Badge>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
});

SlideshowDisplay.displayName = 'SlideshowDisplay';