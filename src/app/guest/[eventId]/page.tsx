'use client';
import React, { useState, useEffect, use, useMemo, useCallback } from 'react';
import { Camera, Users, Calendar, MapPin, Download, X, ChevronLeft, ChevronRight, Info, Heart, Share2, MoreVertical, Upload, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useParams } from 'next/navigation';
import { getEventMediaWithGuestToken } from '@/services/apis/media.api';
import { PinterestPhotoGrid } from '@/components/photo/PinterestPhotoGrid';
import { toast } from 'sonner';
import { uploadGuestPhotos } from '@/services/apis/guest.api';
import { FullscreenPhotoViewer } from '@/components/photo/FullscreenPhotoViewer';
import { getTokenInfo } from '@/services/apis/sharing.api';

// TypeScript interfaces
interface ApiPhoto {
  _id: string;
  albumId: string;
  eventId: string;
  imageUrl: string;
  thumbnail: string;
  createdAt: string;
  approval: {
    status: 'auto_approved' | 'approved' | 'pending' | 'rejected';
    approved_by?: string | null;
    approved_at?: string;
    rejection_reason?: string;
    auto_approval_reason?: string;
  };
  metadata: {
    width: number;
    height: number;
    device_info: {
      brand: string;
      model: string;
      os: string;
    };
    timestamp: string | null;
  };
  url: string;
}

export interface TransformedPhoto {
  id: string;
  src: string;
  width: number;
  height: number;
  uploaded_by: string;
  approval: ApiPhoto['approval'];
  createdAt: string;
  albumId: string;
  eventId: string;
}

// Transform API data to component format
const transformApiPhoto = (apiPhoto: ApiPhoto): TransformedPhoto => {
  return {
    id: apiPhoto._id,
    src: apiPhoto.url,
    width: apiPhoto.metadata?.width || 400,
    height: apiPhoto.metadata?.height || 600,
    uploaded_by: "Guest",
    approval: apiPhoto.approval,
    createdAt: apiPhoto.createdAt,
    albumId: apiPhoto.albumId,
    eventId: apiPhoto.eventId
  };
};

// Main Component
export default function EventDetailsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId: shareToken } = use(params);
  const [guestName, setGuestName] = useState<string>('');
  const [hasEnteredName, setHasEnteredName] = useState<boolean>(false);
  const [showNameDialog, setShowNameDialog] = useState<boolean>(true);
  const [photoViewerOpen, setPhotoViewerOpen] = useState<boolean>(false);
  const [selectedPhoto, setSelectedPhoto] = useState<TransformedPhoto | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string>('');
  const [photos, setPhotos] = useState<TransformedPhoto[]>([]);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [accessDetails, setAccessDetails] = useState<any>(null);
  // Guest upload states
  const [showUploadDialog, setShowUploadDialog] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '' });

  const [auth] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      console.log('🔍 Auth token from localStorage:', {
        exists: !!token,
        length: token?.length || 0,
        preview: token ? token.substring(0, 20) + '...' : 'none'
      });
      return token;
    }
    return null;
  });

  const fetchEventDetails = async (shareToken: string) => {
    try {
      const response = await getTokenInfo(shareToken, auth);
      console.log('🔍 Full response:', response);

      if (response && response.status === true && response.data) {
        setEventDetails(response.data.event);
        setAccessDetails(response.data.access);
      } else {
        console.warn("⚠️ Unexpected response format", response);
      }
    } catch (err) {
      console.error('❌ Error fetching event details:', err);
    }
  };


  useEffect(() => {
    if (shareToken) {
      fetchEventDetails(shareToken);
    }
  }, [shareToken]);

  const fetchMedia = async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching media with share token:', {
        shareToken: shareToken.substring(0, 10) + '...',
        hasAuth: !!auth,
        authPreview: auth ? auth.substring(0, 20) + '...' : 'none'
      });

      let mediaItems: ApiPhoto[] = await getEventMediaWithGuestToken(shareToken, auth);

      if (mediaItems && Array.isArray(mediaItems)) {
        const transformedPhotos = mediaItems.map(transformApiPhoto);

        const approvedPhotos = transformedPhotos.filter(photo =>
          !photo.approval ||
          photo.approval.status === 'approved' ||
          photo.approval.status === 'auto_approved'
        );

        setPhotos(approvedPhotos);
        return true;
      } else {
        setPhotos([]);
        return false;
      }
    } catch (error) {
      console.error('Error fetching media:', error);
      setError('Failed to load photos. Please try again.');
      setPhotos([]);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shareToken) {
      fetchMedia();
    }
  }, [shareToken]);

  useEffect(() => {
    if (savedName) {
      setGuestName(savedName);
      setHasEnteredName(true);
      setShowNameDialog(false);
    }
  }, [savedName]);

  const handleNameSubmit = (): void => {
    if (guestName.trim()) {
      setSavedName(guestName);
      setHasEnteredName(true);
      setShowNameDialog(false);
    }
  };

  const handlePhotoClick = useCallback((photo: TransformedPhoto, index: number): void => {
    setSelectedPhoto(photo);
    setSelectedPhotoIndex(index);
    setPhotoViewerOpen(true);
  }, []);

  const navigateToPhoto = useCallback((direction: 'next' | 'prev'): void => {
    let newIndex: number;
    if (direction === 'next' && selectedPhotoIndex < photos.length - 1) {
      newIndex = selectedPhotoIndex + 1;
    } else if (direction === 'prev' && selectedPhotoIndex > 0) {
      newIndex = selectedPhotoIndex - 1;
    } else {
      return;
    }

    setSelectedPhotoIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  }, [selectedPhotoIndex, photos]);

  const downloadPhoto = useCallback((photo: TransformedPhoto): void => {
    const link = document.createElement('a');
    link.href = photo.src;
    link.download = `photo-${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Guest upload functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
      console.log('📁 Files selected:', files.map(f => f.name));
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one photo');
      return;
    }

    try {
      setUploading(true);
      console.log('🔍 Starting upload:', {
        fileCount: selectedFiles.length,
        shareToken: shareToken.substring(0, 8) + '...',
        hasAuth: !!auth,
        guestInfo
      });

      const result = await uploadGuestPhotos(
        shareToken,
        selectedFiles,
        guestInfo,
        auth || undefined
      );

      console.log('✅ Upload result:', result);

      if (result.status) {
        const { summary } = result.data;
        if (summary.success > 0) {
          toast.success(
            summary.failed === 0
              ? `All ${summary.success} photo(s) uploaded successfully!`
              : `${summary.success} photo(s) uploaded, ${summary.failed} failed`
          );

          // Clear form and refresh media
          setSelectedFiles([]);
          setGuestInfo({ name: '', email: '' });
          setShowUploadDialog(false);

          // Refresh the photo gallery
          fetchMedia();
        } else {
          toast.error('All uploads failed. Please try again.');
        }
      } else {
        toast.error(result.message || 'Upload failed');
      }

    } catch (error: any) {
      console.error('❌ Upload error:', error);
      toast.error(error.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  console.log('🔍 Event details:', eventDetails, accessDetails)
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Main Content */}
      <>
        {/* Event Header */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{eventDetails?.title}</h1>
                <p className="text-gray-600 flex items-center gap-4 mt-1 text-sm">
                  {
                    eventDetails?.start_date &&
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(eventDetails?.start_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  }
                  {eventDetails?.location?.name && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {eventDetails.location.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {loading ? 'Loading...' : `${photos.length} photos`}
                  </span>
                </p>
              </div>
              <div className="flex gap-3">
                {/* Upload Button */}
                {eventDetails?.permissions?.can_upload && (
                  <Button
                    onClick={() => setShowUploadDialog(true)}
                    className="text-white flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Photos
                  </Button>
                )}

                {eventDetails?.permissions?.can_download && (
                  <Button
                    variant="outline"
                    disabled={loading || photos.length === 0}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download All
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-1 sm-px-4 py-8">
          {/* Error State */}
          {error && (
            <div className="text-center py-16">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Photos</h3>
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={fetchMedia} variant="outline" className="text-red-600 border-red-300">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading photos...</p>
            </div>
          )}

          {/* Pinterest Photo Grid */}
          {!loading && !error && photos.length > 0 && (
            <PinterestPhotoGrid photos={photos} onPhotoClick={handlePhotoClick} />
          )}

          {/* Empty State with Upload CTA */}
          {!loading && !error && photos.length === 0 && (
            <div className="text-center py-16">
              <Camera className="w-20 h-20 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-600 mb-2">No photos yet</h3>
              <p className="text-gray-400 mb-6">Be the first to share a memory!</p>
              {eventDetails?.permissions?.can_upload && (
                <Button
                  onClick={() => setShowUploadDialog(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload First Photo
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Guest Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-500" />
                Share Your Photos
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 p-4">
              {/* Guest info form for non-authenticated users */}
              {!auth && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-3">Tell us who you are (optional)</p>
                  <div className="space-y-2">
                    <Input
                      placeholder="Your name"
                      value={guestInfo.name}
                      onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                      className="text-sm"
                    />
                    <Input
                      type="email"
                      placeholder="Your email"
                      value={guestInfo.email}
                      onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                </div>
              )}

              {/* File selection */}
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
                  </label>
                </div>

                {/* Selected files preview */}
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

              {/* Upload guidelines */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-xs text-blue-700 space-y-1">
                  <p>• Photos will be {eventDetails?.permissions?.require_approval ? 'reviewed before appearing' : 'visible immediately'}</p>
                  <p>• Supported formats: JPG, PNG, HEIC, MP4, MOV</p>
                  <p>• Please only upload appropriate content</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUploadDialog(false);
                    setSelectedFiles([]);
                    setGuestInfo({ name: '', email: '' });
                  }}
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

        {/* Fullscreen Photo Viewer */}
        {photoViewerOpen && selectedPhoto && (
          <FullscreenPhotoViewer
            selectedPhoto={selectedPhoto}
            selectedPhotoIndex={selectedPhotoIndex}
            photos={photos}
            onClose={() => setPhotoViewerOpen(false)}
            onPrev={() => navigateToPhoto('prev')}
            onNext={() => navigateToPhoto('next')}
            downloadPhoto={downloadPhoto}
          />
        )}

        {/* Floating Upload Button */}
        {eventDetails?.permissions?.can_upload && (
          <div className="fixed bottom-20 right-6 z-30">
            <Button
              onClick={() => setShowUploadDialog(true)}
              className=" text-white shadow-lg hover:shadow-xl rounded-full w-14 h-14 p-0"
              title="Upload Photos"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </div>
        )}
      </>
    </div>
  );
}