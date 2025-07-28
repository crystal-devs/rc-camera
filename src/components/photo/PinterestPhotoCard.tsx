import { TransformedPhoto } from "@/app/guest/[eventId]/page";
import { Camera, Download, Heart } from "lucide-react";
import { useState } from "react";
import { Image as ImageKitImage } from '@imagekit/next';

export const PinterestPhotoCard: React.FC<{
    photo: TransformedPhoto;
    index: number;
    baseWidth: number;
    optimizedHeight: number;
    rowSpan: number;
    isLiked: boolean;
    onLike: () => void;
    onClick: () => void;
}> = ({ photo, index, baseWidth, optimizedHeight, rowSpan, isLiked, onLike, onClick }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    const transformation = [
        { format: 'auto' as const },
        { progressive: true },
        { dpr: 'auto' as const },
        { quality: index < 4 ? 85 : 75 },
        { width: baseWidth },
        { height: Math.round(optimizedHeight) }
    ];

    return (
        <div
            className="group relative bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer transform hover:-translate-y-1"
            style={{
                gridRowEnd: `span ${rowSpan}`,
                height: 'fit-content'
            }}
            onClick={onClick}
        >
            <div className="relative">
                {!hasError ? (
                    <ImageKitImage
                        src={photo.src}
                        alt={`Photo by ${photo.uploaded_by}`}
                        width={baseWidth}
                        height={Math.round(optimizedHeight)}
                        transformation={transformation}
                        lqip={{ active: true, quality: 20, blur: 6 }}
                        className={`w-full h-auto object-cover rounded-xl transition-all duration-500 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                            } group-hover:scale-105`}
                        onLoad={() => setIsLoaded(true)}
                        onError={() => setHasError(true)}
                        priority={index < 4}
                        loading={index < 4 ? 'eager' : 'lazy'}
                    />
                ) : (
                    <div
                        className="w-full bg-gray-200 flex items-center justify-center rounded-xl"
                        style={{ height: optimizedHeight }}
                    >
                        <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                )}

                {/* Loading placeholder */}
                {!isLoaded && !hasError && (
                    <div
                        className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center rounded-xl"
                    >
                        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl">
                    {/* Action buttons */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                        <div className="text-white">
                            <p className="font-medium text-sm">{photo.uploaded_by}</p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onLike();
                                }}
                                className={`p-2 rounded-full transition-all duration-200 ${isLiked
                                        ? 'bg-red-500 text-white scale-110'
                                        : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                            >
                                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Handle download
                                }}
                                className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Approval status badge */}
                {photo.approval?.status === 'pending' && (
                    <div className="absolute top-3 right-3 bg-yellow-500/90 text-white px-2 py-1 rounded-full text-xs">
                        Pending
                    </div>
                )}
            </div>
        </div>
    );
};
