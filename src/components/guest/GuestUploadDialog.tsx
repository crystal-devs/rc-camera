'use client';

import { useState, useCallback, memo, useEffect } from 'react';
import { Upload, Camera, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { uploadGuestPhotos } from '@/services/apis/guest.api';
import { Event, TransformedPhoto } from '@/types/events';
import { pLimit } from '@/utils/async';

interface GuestUploadDialogProps {
    isOpen: boolean;
    onClose: () => void;
    shareToken: string;
    eventDetails: Event | null;
    auth: string | null;
    onUploadComplete: (photos: TransformedPhoto[]) => void;
    /** Whether the event requires host approval before photos are visible */
    requireApproval?: boolean;
}

/**
 * Upload dialog component for guest users.
 * Extracted from main page to:
 * - Enable lazy loading via dynamic import
 * - Isolate upload state management
 * - Reduce main component complexity
 * 
 * Follows Vercel best practices:
 * - Memoized with React.memo
 * - Stable callbacks with useCallback
 * - Functional setState for stability
 */
export const GuestUploadDialog = memo(function GuestUploadDialog({
    isOpen,
    onClose,
    shareToken,
    eventDetails,
    auth,
    onUploadComplete,
    requireApproval = false,
}: GuestUploadDialogProps) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [guestInfo, setGuestInfo] = useState({ name: '', email: '' });

    const maxPerGuest = (eventDetails as any)?.permissions?.max_photos_per_guest || 0;
    const [sessionCount, setSessionCount] = useState(0);

    // Update session count when dialog opens
    useEffect(() => {
        if (isOpen && eventDetails?._id) {
            setSessionCount(parseInt(localStorage.getItem(`rc_uploads_${eventDetails._id}`) || '0', 10));
        }
    }, [isOpen, eventDetails?._id]);

    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        let files = Array.from(event.target.files || []);
        
        if (maxPerGuest > 0) {
            const currentCount = parseInt(localStorage.getItem(`rc_uploads_${eventDetails?._id}`) || '0', 10);
            const remaining = maxPerGuest - currentCount;
            const totalPending = selectedFiles.length + files.length;
            
            if (totalPending > remaining) {
                toast.error(`You can only upload ${remaining} more photo(s)`);
                const allowedNewFiles = remaining - selectedFiles.length;
                if (allowedNewFiles > 0) {
                    files = files.slice(0, allowedNewFiles);
                } else {
                    return;
                }
            }
        }

        if (files.length > 0) {
            setSelectedFiles(prev => [...prev, ...files]);
        }
    }, [maxPerGuest, eventDetails?._id, selectedFiles.length]);

    const removeFile = useCallback((index: number) => {
        setSelectedFiles(files => files.filter((_, i) => i !== index));
    }, []);

    const resetForm = useCallback(() => {
        setSelectedFiles([]);
        setGuestInfo({ name: '', email: '' });
    }, []);

    const handleUpload = useCallback(async () => {
        if (selectedFiles.length === 0) {
            toast.error('Please select at least one photo');
            return;
        }

        try {
            setUploading(true);
            const limit = pLimit(2); // Guest uploads are more expensive (multipart), keep concurrency low
            const allUploadedPhotos: TransformedPhoto[] = [];
            let totalSuccess = 0;

            // Process each file individually but with concurrency limit
            // This avoids sending 1 massive 500MB POST request
            const uploadPromises = selectedFiles.map(file => limit(async () => {
                const result = await uploadGuestPhotos(
                    shareToken,
                    [file], // Send 1 file at a time
                    guestInfo,
                    auth || undefined
                );

                if (result.status && result.data.uploads) {
                    const photos = result.data.uploads.map((upload: any) => ({
                        id: upload.mediaId,
                        src: upload.originalUrl,
                        width: upload.width || 800,
                        height: upload.height || 600,
                        uploaded_by: guestInfo.name || 'Guest',
                        approval: upload.approval || {
                            status: requireApproval ? 'pending' : 'auto_approved'
                        },
                        createdAt: new Date().toISOString(),
                        albumId: eventDetails?._id,
                        eventId: eventDetails?._id,
                        type: 'image',
                        imageUrl: upload.originalUrl,
                        responsive_urls: {
                            thumbnail: upload.originalUrl,
                            display: upload.originalUrl,
                            full: upload.originalUrl,
                            original: upload.originalUrl
                        },
                        processing: { status: 'processing' }
                    } as TransformedPhoto));
                    
                    allUploadedPhotos.push(...photos);
                    totalSuccess += (result.data.summary?.success || 1);
                }
            }));

            await Promise.allSettled(uploadPromises);

            if (allUploadedPhotos.length > 0) {
                onUploadComplete(allUploadedPhotos);

                if (eventDetails?._id) {
                    const key = `rc_uploads_${eventDetails._id}`;
                    const current = parseInt(localStorage.getItem(key) || '0', 10);
                    localStorage.setItem(key, String(current + totalSuccess));
                }

                if (requireApproval) {
                    toast.success(
                        `⏳ ${totalSuccess} photo${totalSuccess !== 1 ? 's' : ''} submitted for review!`,
                        {
                            description: 'The host will approve them shortly.',
                            duration: 5000,
                        }
                    );
                } else {
                    toast.success(`Successfully uploaded ${totalSuccess} photo(s)!`);
                }

                resetForm();
                onClose();
            } else {
                toast.error('Upload failed. Please try again.');
            }
        } catch (error: any) {
            toast.error(error.message || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    }, [selectedFiles, shareToken, guestInfo, auth, eventDetails?._id, onUploadComplete, resetForm, onClose, requireApproval]);

    const handleClose = useCallback(() => {
        if (!uploading) {
            resetForm();
            onClose();
        }
    }, [uploading, resetForm, onClose]);

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5 text-blue-500" />
                        Share Your Photos
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 p-4">
                    {!auth && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600 mb-3">Tell us who you are (optional)</p>
                            <div className="space-y-2">
                                <Input
                                    placeholder="Your name"
                                    value={guestInfo.name}
                                    onChange={(e) => setGuestInfo(prev => ({ ...prev, name: e.target.value }))}
                                    className="text-sm"
                                />
                                <Input
                                    type="email"
                                    placeholder="Your email"
                                    value={guestInfo.email}
                                    onChange={(e) => setGuestInfo(prev => ({ ...prev, email: e.target.value }))}
                                    className="text-sm"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                            <input
                                type="file"
                                multiple
                                accept="image/*,video/*"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer">
                                <Camera className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-600">Click to select photos or videos</p>
                                <p className="text-xs text-gray-500 mt-1">Max 10 files, 50MB each</p>
                                {maxPerGuest > 0 && (
                                    <p className="text-xs font-medium text-amber-600 mt-2">
                                        You can upload {maxPerGuest - sessionCount - selectedFiles.length} more photo(s)
                                    </p>
                                )}
                            </label>
                        </div>

                        {selectedFiles.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium">{selectedFiles.length} file(s) selected:</p>
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                    {selectedFiles.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm">
                                            <span className="truncate flex-1">{file.name}</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeFile(index)}
                                                className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-xs text-blue-700 space-y-1">
                            <p>• Photos will be {eventDetails?.privacy?.content_controls?.content_moderation === 'manual' ? 'reviewed before appearing' : 'visible immediately'}</p>
                            <p>• Supported formats: JPG, PNG, HEIC, MP4, MOV</p>
                            <p>• Please only upload appropriate content</p>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            className="flex-1"
                            disabled={uploading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpload}
                            disabled={selectedFiles.length === 0 || uploading}
                            className="flex-1"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
});
