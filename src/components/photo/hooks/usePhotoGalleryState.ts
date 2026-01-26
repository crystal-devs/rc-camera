/**
 * usePhotoGalleryState - Centralized state management for PhotoGallery
 * Manages all UI state including tabs, photo viewer, and selection mode
 */

import { useState, useMemo } from 'react';
import { Photo } from '@/types/PhotoGallery.types';
import { getEffectivePermissions, canUserUpload, UserPermissions, UserRole } from '../utils/permissionUtils';

export type TabType = 'approved' | 'pending' | 'rejected' | 'hidden';

interface UsePhotoGalleryStateProps {
    userRole?: UserRole | string;
    userPermissions: UserPermissions;
    canUpload?: boolean;
}

export function usePhotoGalleryState({
    userRole,
    userPermissions,
    canUpload = true,
}: UsePhotoGalleryStateProps) {
    // Tab state
    const [activeTab, setActiveTab] = useState<TabType>('approved');

    // Photo viewer state
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
    const [photoViewerOpen, setPhotoViewerOpen] = useState(false);

    // Selection mode state
    const [selectionMode, setSelectionMode] = useState(false);

    // Computed values
    const effectivePermissions = useMemo(
        () => getEffectivePermissions(userRole, userPermissions),
        [userRole, userPermissions]
    );

    const canUserUploadPhotos = useMemo(
        () => canUserUpload(effectivePermissions, canUpload),
        [effectivePermissions, canUpload]
    );

    const isGuest = useMemo(
        () => userRole !== 'creator' && userRole !== 'co_host',
        [userRole]
    );

    // Tab change handler
    const handleTabChange = (newTab: TabType) => {
        if (newTab === activeTab) return;
        setActiveTab(newTab);
        setSelectedPhoto(null);
        setPhotoViewerOpen(false);
        setSelectionMode(false);
    };

    // Photo viewer handlers
    const openPhotoViewer = (photo: Photo, index: number) => {
        if (photo.status === 'uploading' || photo.isTemporary) return;
        setSelectedPhoto(photo);
        setSelectedPhotoIndex(index);
        setPhotoViewerOpen(true);
    };

    const closePhotoViewer = () => {
        setPhotoViewerOpen(false);
        setSelectedPhoto(null);
        setSelectedPhotoIndex(null);
    };

    const navigatePhoto = (direction: 'next' | 'prev', photos: Photo[]) => {
        if (selectedPhotoIndex === null || photos.length <= 1) return;

        let newIndex: number;
        if (direction === 'next') {
            newIndex = selectedPhotoIndex < photos.length - 1 ? selectedPhotoIndex + 1 : 0;
        } else {
            newIndex = selectedPhotoIndex > 0 ? selectedPhotoIndex - 1 : photos.length - 1;
        }

        setSelectedPhotoIndex(newIndex);
        setSelectedPhoto(photos[newIndex]);
    };

    return {
        // State
        activeTab,
        selectedPhoto,
        selectedPhotoIndex,
        photoViewerOpen,
        selectionMode,

        // Computed
        effectivePermissions,
        canUserUploadPhotos,
        isGuest,

        // Handlers
        handleTabChange,
        openPhotoViewer,
        closePhotoViewer,
        navigatePhoto,
        setSelectionMode,
    };
}
