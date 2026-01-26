/**
 * usePhotoSelection - Photo selection logic for bulk operations
 * Manages selected photos Set and provides selection utilities
 */

import { useState, useCallback } from 'react';
import { Photo } from '@/types/PhotoGallery.types';

export function usePhotoSelection() {
    const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());

    const togglePhotoSelection = useCallback((photoId: string) => {
        setSelectedPhotos((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(photoId)) {
                newSet.delete(photoId);
            } else {
                newSet.add(photoId);
            }
            return newSet;
        });
    }, []);

    const selectAllPhotos = useCallback((photos: Photo[]) => {
        const allPhotoIds = photos.map((photo) => photo.id);
        setSelectedPhotos(new Set(allPhotoIds));
    }, []);

    const deselectAllPhotos = useCallback(() => {
        setSelectedPhotos(new Set());
    }, []);

    const isPhotoSelected = useCallback(
        (photoId: string) => selectedPhotos.has(photoId),
        [selectedPhotos]
    );

    const getSelectedCount = useCallback(() => selectedPhotos.size, [selectedPhotos]);

    return {
        selectedPhotos,
        togglePhotoSelection,
        selectAllPhotos,
        deselectAllPhotos,
        isPhotoSelected,
        getSelectedCount,
    };
}
