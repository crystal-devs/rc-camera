'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Edit, Smartphone, Monitor, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { getBulkUploadUrls, getSignedUrlForKey } from '@/services/apis/media.api';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';
import { updateEvent } from '@/services/apis/events.api';
import { useSecureAuth } from '@/contexts/SecureAuthContext';
import useEventStore from '@/stores/useEventStore';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

// In-memory cache for cover signed URLs (cleared on page reload)
const coverUrlCache = new Map<string, string>();

interface EventCoverSelectorProps {
    eventId: string;
    currentCover?: {
        url: string;
        public_id: string;
    };
}

export default function EventCoverSelector({ eventId, currentCover }: EventCoverSelectorProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('desktop');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { getAccessToken } = useSecureAuth();
    const { updateEventInStore } = useEventStore();
    const queryClient = useQueryClient();

    // Extract S3 key from cover data
    const getS3Key = (cover: any): string | null => {
        // If public_id looks like a key path (contains 'events/'), use it
        if (cover?.public_id && cover.public_id.includes('events/')) {
            return cover.public_id;
        }
        // Otherwise, extract from the URL
        if (cover?.url) {
            try {
                const url = new URL(cover.url);
                const pathParts = url.pathname.split('/');
                // Remove leading slash and 'events/' prefix to get the key
                if (pathParts[1] === 'events') {
                    return pathParts.slice(1).join('/'); // events/.../original/file.jpg
                }
            } catch (error) {
                console.error('Failed to parse URL for S3 key:', error);
            }
        }
        return null;
    };

    const hasCoverImage = !!(getS3Key(currentCover) || currentCover?.url);

    // Memoize S3 key to prevent unnecessary recalculations
    const s3Key = React.useMemo(() => getS3Key(currentCover), [currentCover]);

    // Generate signed URL for current cover when component mounts or cover changes
    React.useEffect(() => {
        const generateSignedUrl = async () => {
            if (s3Key) {
                // Check memory cache first
                const cachedUrl = coverUrlCache.get(s3Key);
                if (cachedUrl) {
                    setSignedUrl(cachedUrl);
                    return;
                }

                try {
                    const authToken = getAccessToken();
                    if (authToken) {
                        const url = await getSignedUrlForKey(s3Key, authToken);
                        // Cache the URL in memory
                        coverUrlCache.set(s3Key, url);
                        setSignedUrl(url);
                    } else {
                        setSignedUrl(currentCover?.url || null);
                    }
                } catch (error) {
                    console.error('Failed to generate signed URL for cover:', error);
                    // Fallback to existing URL if available
                    setSignedUrl(currentCover?.url || null);
                }
            } else {
                setSignedUrl(currentCover?.url || null);
            }
        };

        generateSignedUrl();
    }, [s3Key, currentCover?.url, getAccessToken]);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Please select an image file');
                return;
            }

            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        try {
            setIsUploading(true);
            const authToken = getAccessToken();

            if (!authToken) {
                toast.error('Authentication required');
                return;
            }

            // Get bulk upload URL for the cover image
            const fileData = [{
                fileName: selectedFile.name,
                fileType: selectedFile.type
            }];

            const bulkResponse = await getBulkUploadUrls(eventId, fileData, authToken);
            const uploadData = bulkResponse.data.uploadUrls[0];

            if (!uploadData) {
                throw new Error('Failed to get upload URL');
            }

            // Upload directly to S3
            await axios.put(uploadData.uploadUrl, selectedFile, {
                headers: { 'Content-Type': selectedFile.type },
                onUploadProgress: (e) => {
                    const percent = (e.loaded / (e.total || 1)) * 100;
                    console.log(`Upload progress: ${percent}%`);
                },
            });

            // Notify backend about completion
            const completeResponse = await axios.post(
                `${API_BASE_URL}/media/upload-complete`,
                {
                    key: uploadData.key,
                    eventId,
                    upload_id: uploadData.uploadId,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const responseData = completeResponse.data.data;

            if (!responseData?.mediaId || !responseData?.originalUrl) {
                throw new Error('Invalid response: missing mediaId or originalUrl');
            }

            // Update event cover - store public_id (S3 key) instead of signed URLs
            const updateData = {
                cover_image: {
                    url: '', // Will be generated from public_id when needed
                    public_id: uploadData.key, // Store the S3 key path
                    thumbnail_url: '', // Will be generated from public_id when needed
                    uploaded_by: null, // Will be set by backend
                }
            };

            await updateEvent(eventId, updateData, authToken);

            // Update the event store with new cover data
            updateEventInStore(eventId, { cover_image: updateData.cover_image });

            // Generate signed URL for the new cover
            try {
                const newSignedUrl = await getSignedUrlForKey(uploadData.key, authToken);
                setSignedUrl(newSignedUrl);

                // Cache the new URL in memory
                coverUrlCache.set(uploadData.key, newSignedUrl);

                // Update the event store with the signed URL
                updateEventInStore(eventId, {
                    cover_image: {
                        ...updateData.cover_image,
                        url: newSignedUrl, // Include the signed URL
                    }
                });
            } catch (error) {
                console.error('Failed to generate signed URL for new cover:', error);
            }

            // Invalidate event queries to refetch data
            queryClient.invalidateQueries({
                queryKey: queryKeys.event(eventId),
                exact: false,
                refetchType: 'all'
            });

            toast.success('Cover image updated successfully!');
            setIsDialogOpen(false);
            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload cover image');
        } finally {
            setIsUploading(false);
        }
    };

    const handleCancel = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const displayUrl = previewUrl || signedUrl;

    return (
        <Card className="relative overflow-hidden">
            <CardContent className="p-0">
                {/* Cover Image Display */}
                <div className="relative h-48 bg-gradient-to-r from-gray-200 to-gray-300">
                    {displayUrl ? (
                        <img
                            src={displayUrl}
                            alt="Event cover"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
                                <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No cover image</p>
                            </div>
                        </div>
                    )}

                    {/* Edit Button */}
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                size="sm"
                                className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white border-0"
                            >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                            </Button>
                        </DialogTrigger>

                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                            <DialogHeader>
                                <DialogTitle>Edit Event Cover</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4">
                                {/* Upload Area */}
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        Choose Image
                                    </Button>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Select an image file (JPG, PNG, etc.)
                                    </p>
                                </div>

                                {/* Preview Section */}
                                {previewUrl && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-medium">Preview</h3>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant={previewMode === 'mobile' ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setPreviewMode('mobile')}
                                                >
                                                    <Smartphone className="h-4 w-4 mr-1" />
                                                    Mobile
                                                </Button>
                                                <Button
                                                    variant={previewMode === 'desktop' ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setPreviewMode('desktop')}
                                                >
                                                    <Monitor className="h-4 w-4 mr-1" />
                                                    Desktop
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Preview Container */}
                                        <div className="border rounded-lg overflow-hidden bg-gray-100">
                                            {previewMode === 'mobile' ? (
                                                <div className="mx-auto max-w-sm bg-white shadow-lg">
                                                    <div className="relative h-32">
                                                        <img
                                                            src={previewUrl}
                                                            alt="Mobile preview"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="p-4">
                                                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                                                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="relative h-64 bg-white shadow-lg">
                                                    <img
                                                        src={previewUrl}
                                                        alt="Desktop preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                                        <Badge variant="secondary" className="bg-white/90 text-gray-700">
                                                            Event Cover Preview
                                                        </Badge>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-3 pt-4 border-t">
                                    <Button variant="outline" onClick={handleCancel}>
                                        <X className="h-4 w-4 mr-1" />
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleUpload}
                                        disabled={!selectedFile || isUploading}
                                    >
                                        {isUploading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4 mr-1" />
                                                Save Cover
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Cover Info */}
                <div className="p-4">
                    <h3 className="font-medium text-gray-900 mb-1">Event Cover</h3>
                    <p className="text-sm text-gray-600">
                        {hasCoverImage ? 'Cover image is set' : 'No cover image selected'}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}