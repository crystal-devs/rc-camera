/**
 * usePhotoUpload - Photo upload logic with progress tracking
 * Handles file validation, upload mutation, and cache updates
 */

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUploadMultipleMedia } from '@/hooks/useMediaQueries';
import { updatePhotoCacheAfterUpload, invalidateMediaCounts } from '../utils/cacheUtils';
import { Photo } from '@/types/PhotoGallery.types';

interface UsePhotoUploadProps {
    eventId: string;
    albumId?: string;
    canUpload: boolean;
    onUploadStart?: (mediaIds: string[], filenames: string[]) => void;
    onUploadComplete?: () => void;
    onTabChange?: (tab: 'approved' | 'pending') => void;
}

export function usePhotoUpload({
    eventId,
    albumId,
    canUpload,
    onUploadStart,
    onUploadComplete,
    onTabChange,
}: UsePhotoUploadProps) {
    const queryClient = useQueryClient();
    const [manualUploadProgress, setManualUploadProgress] = useState<{ [fileName: string]: number }>({});

    const uploadMutation = useUploadMultipleMedia(eventId, albumId, {
        onProgress: (progress) => {
            setManualUploadProgress(progress);
        },
        onSuccess: (result) => {
            const { data } = result;

            if (data?.uploads && Array.isArray(data.uploads)) {
                const successfulUploads = data.uploads.filter((upload: any) => upload.status !== 'failed');

                if (successfulUploads.length > 0) {
                    const mediaIds = successfulUploads.map((upload: any) => upload.id);
                    const filenames = successfulUploads.map((upload: any) => upload.filename || 'Unknown');

                    // Notify parent to start monitoring
                    onUploadStart?.(mediaIds, filenames);

                    toast.success(
                        `${successfulUploads.length} file${successfulUploads.length > 1 ? 's' : ''} uploaded successfully!`,
                        {
                            description: 'Photos are pending approval',
                            duration: 4000,
                        }
                    );

                    // Transform uploads to Photo objects
                    const realPhotos: Photo[] = successfulUploads.map((upload: any) => {
                        const approvalStatus =
                            upload.approval?.status ||
                            (upload.approval_status === 'approved' || upload.approval_status === 'auto_approved'
                                ? 'approved'
                                : 'pending');

                        return {
                            id: upload.mediaId,
                            albumId: albumId,
                            eventId: eventId,
                            takenBy: 'You',
                            imageUrl: upload.originalUrl,
                            thumbnail: upload.originalUrl,
                            createdAt: upload.uploadedAt ? new Date(upload.uploadedAt) : new Date(),
                            originalFilename: upload.filename || upload.fileName || 'Uploaded Image',
                            processingStatus: 'processing' as const,
                            processingProgress: 0,
                            approval: {
                                status: approvalStatus as any,
                            },
                            processing: {
                                status: 'processing' as const,
                                variants_generated: false,
                            },
                            progressiveUrls: {
                                placeholder: upload.originalUrl,
                                thumbnail: upload.originalUrl,
                                display: upload.originalUrl,
                                full: upload.originalUrl,
                                original: upload.originalUrl,
                            },
                            metadata: {
                                width: 0,
                                height: 0,
                            },
                            stats: {
                                views: 0,
                                downloads: 0,
                                shares: 0,
                                likes: 0,
                            },
                        };
                    });

                    // Update cache with new photos
                    updatePhotoCacheAfterUpload(queryClient, eventId, realPhotos);

                    // Switch to appropriate tab
                    if (data.uploads.some((u: any) => u.approval?.status === 'approved' || u.approval_status === 'approved')) {
                        onTabChange?.('approved');
                    } else {
                        onTabChange?.('pending');
                    }
                }

                const failedUploads = data.uploads.filter((upload: any) => upload.status === 'failed');
                if (failedUploads.length > 0) {
                    toast.error(`${failedUploads.length} file${failedUploads.length > 1 ? 's' : ''} failed to upload`);
                }
            }

            invalidateMediaCounts(queryClient, eventId);
            onUploadComplete?.();
        },
        onError: (error) => {
            console.error('Upload failed:', error);
            toast.error('Upload failed', {
                description: error.message || 'Please try again',
                duration: 5000,
            });
        },
    });

    const validateAndUpload = useCallback(
        (files: File[]) => {
            if (!files || files.length === 0) return;

            if (!canUpload) {
                toast.error("You don't have permission to upload photos to this event.");
                return;
            }

            const validFiles = files.filter((file) => {
                if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
                    toast.error(`"${file.name}" is not a valid image or video file.`);
                    return false;
                }

                const maxSize = 100 * 1024 * 1024; // 100MB
                if (file.size > maxSize) {
                    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
                    toast.error(`"${file.name}" is too large (${sizeMB}MB). Maximum size is 100MB.`);
                    return false;
                }

                return true;
            });

            if (validFiles.length === 0) {
                toast.error('No valid files to upload.');
                return;
            }

            toast.success(`Starting upload of ${validFiles.length} file${validFiles.length > 1 ? 's' : ''}...`);
            uploadMutation.mutate(validFiles);
        },
        [canUpload, uploadMutation]
    );

    return {
        validateAndUpload,
        isUploading: uploadMutation.isPending,
        manualUploadProgress,
        clearManualProgress: () => setManualUploadProgress({}),
    };
}
