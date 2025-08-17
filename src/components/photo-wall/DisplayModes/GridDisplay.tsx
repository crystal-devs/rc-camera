// app/wall/[shareToken]/components/GridDisplay.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';
import { PhotoWallItem } from '@/services/apis/photowall.api';

interface GridDisplayProps {
    images: PhotoWallItem[];
    mode: string;
    showUploaderNames?: boolean;
}

export const GridDisplay = React.memo<GridDisplayProps>(({ 
    images, 
    mode, 
    showUploaderNames = false 
}) => {
    const gridCols = mode === 'grid' ? 2 : 3;
    const itemsToShow = gridCols * gridCols;
    const displayImages = images.slice(0, itemsToShow);

    if (images.length === 0) {
        return (
            <div className="text-center">
                <div className="text-6xl mb-4">📷</div>
                <p className="text-xl text-slate-400">No photos yet</p>
            </div>
        );
    }

    return (
        <div
            className="grid gap-4 w-full max-w-6xl mx-auto p-4 h-full"
            style={{
                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                gridTemplateRows: `repeat(${gridCols}, 1fr)`
            }}
        >
            {displayImages.map((image, index) => (
                <motion.div
                    key={image.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative rounded-xl overflow-hidden bg-zinc-800 group cursor-pointer"
                >
                    <img
                        src={image.imageUrl}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                    />

                    {/* Badges Container */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                        {image.isNew && (
                            <Badge className="bg-red-500 text-white animate-pulse text-xs">
                                NEW
                            </Badge>
                        )}
                        
                        {showUploaderNames && image.uploaderName && (
                            <Badge 
                                variant="secondary" 
                                className="bg-black/70 text-white border-slate-600 backdrop-blur-sm text-xs"
                            >
                                <User className="h-2 w-2 mr-1" />
                                {image.uploaderName.length > 10 
                                    ? `${image.uploaderName.substring(0, 10)}...` 
                                    : image.uploaderName
                                }
                            </Badge>
                        )}
                    </div>

                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </motion.div>
            ))}
        </div>
    );
});

GridDisplay.displayName = 'GridDisplay';