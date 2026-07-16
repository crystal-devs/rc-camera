/**
 * usePhotoSelection - Photo selection logic for bulk operations
 * Manages selected photos Set and provides selection utilities, including
 * anchor-based Shift-range selection (Phase 3 multi-select).
 */

import { useState, useCallback, useRef } from 'react';
import { Photo } from '@/types/PhotoGallery.types';

export function usePhotoSelection() {
    const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
    // Index of the last plainly-clicked tile — the anchor for Shift-range.
    const anchorIndexRef = useRef<number | null>(null);

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

    /**
     * Modifier-aware selection for the grid. Shift-click selects the contiguous
     * range from the anchor to this tile (union with the current selection);
     * a plain click toggles this tile and moves the anchor here.
     */
    const selectPhoto = useCallback(
        (photoId: string, index: number, photos: Photo[], modifiers?: { shift?: boolean }) => {
            const anchor = anchorIndexRef.current;
            setSelectedPhotos((prev) => {
                const next = new Set(prev);
                if (modifiers?.shift && anchor !== null) {
                    const [from, to] = anchor <= index ? [anchor, index] : [index, anchor];
                    for (let i = from; i <= to; i++) {
                        const p = photos[i];
                        if (p) next.add(p.id);
                    }
                    return next;
                }
                if (next.has(photoId)) {
                    next.delete(photoId);
                } else {
                    next.add(photoId);
                }
                return next;
            });
            // The anchor follows plain clicks; Shift extends from the existing anchor.
            if (!modifiers?.shift) anchorIndexRef.current = index;
        },
        []
    );

    const selectAllPhotos = useCallback((photos: Photo[]) => {
        const allPhotoIds = photos.map((photo) => photo.id);
        setSelectedPhotos(new Set(allPhotoIds));
        anchorIndexRef.current = photos.length ? photos.length - 1 : null;
    }, []);

    const deselectAllPhotos = useCallback(() => {
        setSelectedPhotos(new Set());
        anchorIndexRef.current = null;
    }, []);

    const isPhotoSelected = useCallback(
        (photoId: string) => selectedPhotos.has(photoId),
        [selectedPhotos]
    );

    const getSelectedCount = useCallback(() => selectedPhotos.size, [selectedPhotos]);

    return {
        selectedPhotos,
        togglePhotoSelection,
        selectPhoto,
        selectAllPhotos,
        deselectAllPhotos,
        isPhotoSelected,
        getSelectedCount,
    };
}
