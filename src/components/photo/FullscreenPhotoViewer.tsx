import { ChevronLeft, ChevronRight, Download, Share2, X } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";
import { TransformedPhoto } from "@/types/events";

export const FullscreenPhotoViewer: React.FC<{
  selectedPhoto: TransformedPhoto;
  selectedPhotoIndex: number | null;
  photos: TransformedPhoto[];
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  downloadPhoto: (photo: TransformedPhoto) => void;
}> = ({ selectedPhoto, selectedPhotoIndex, photos, onClose, onPrev, onNext, downloadPhoto }) => {
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape': onClose(); break;
        case 'ArrowLeft': onPrev(); break;
        case 'ArrowRight': onNext(); break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose, onPrev, onNext]);

  return (
    <div
      className="fixed inset-0 bg-black z-50 flex flex-col"
      onClick={() => setShowControls(!showControls)}
    >
      {/* Top Controls */}
      <div className={`absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="text-white hover:bg-white/20 rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
            <span className="text-sm font-medium">
              {selectedPhotoIndex + 1} of {photos.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); downloadPhoto(selectedPhoto); }}
              className="text-white hover:bg-white/20"
            >
              <Download className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      {selectedPhotoIndex > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className={`absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 z-10 h-12 w-12 rounded-full transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
      )}

      {selectedPhotoIndex < photos.length - 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className={`absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 z-10 h-12 w-12 rounded-full transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      )}

      {/* Image Container */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
        <img
          src={`${selectedPhoto.src}?tr=f-auto:pr-true:dpr-auto:q-95`}
          alt="Fullscreen view"
          className="max-w-full max-h-full object-contain"
          style={{
            width: 'auto',
            height: 'auto',
            maxWidth: '100%',
            maxHeight: '100%'
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Bottom Info */}
      <div className={`absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="text-white text-center">
          <Badge variant="secondary" className="mb-2">
            Uploaded by {selectedPhoto.uploaded_by}
          </Badge>
          <p className="text-xs opacity-75 mt-1">
            {new Date(selectedPhoto.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};
