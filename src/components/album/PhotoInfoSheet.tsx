// components/photo/PhotoInfoSheet.tsx
import React from 'react';
import { X, Calendar, Camera, MapPin, User, Clock, Eye, Download, FileImage, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PhotoInfoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  photo: {
    id: string;
    imageUrl?: string;
    src?: string;
    title?: string;
    takenBy?: string;
    uploadedBy?: string;
    uploadedAt?: string;
    takenAt?: string;
    location?: {
      name?: string;
      address?: string;
    };
    metadata?: {
      width?: number;
      height?: number;
      size?: number;
      camera?: string;
      lens?: string;
      iso?: number;
      aperture?: string;
      shutterSpeed?: string;
      focalLength?: string;
    };
    stats?: {
      views?: number;
      downloads?: number;
    };
    approval?: {
      status: string;
      reviewedBy?: string;
      reviewedAt?: string;
      reason?: string;
    };
  };
  canDownload?: boolean;
  onDownload?: () => void;
}

export const PhotoInfoSheet: React.FC<PhotoInfoSheetProps> = ({
  isOpen,
  onClose,
  photo,
  canDownload = false,
  onDownload
}) => {
  if (!isOpen) return null;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const getApprovalBadge = (status: string) => {
    const variants = {
      approved: 'default',
      auto_approved: 'default',
      pending: 'secondary',
      rejected: 'destructive'
    } as const;
    
    const labels = {
      approved: 'Approved',
      auto_approved: 'Auto Approved',
      pending: 'Pending Review',
      rejected: 'Rejected'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-hidden animate-slide-up">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <FileImage className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold">Photo Details</h2>
            </div>
            <div className="flex items-center gap-2">
              {canDownload && onDownload && (
                <Button
                  onClick={() => {
                    onDownload();
                    onClose();
                  }}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              )}
              <Button
                onClick={onClose}
                size="sm"
                variant="ghost"
                className="rounded-full h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Basic Info */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 gap-3">
                {photo.title && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Title</p>
                    <p className="text-sm text-gray-600">{photo.title}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  {(photo.takenBy || photo.uploadedBy) && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {photo.takenBy ? 'Photographer' : 'Uploaded by'}
                      </p>
                      <p className="text-sm text-gray-600">{photo.takenBy || photo.uploadedBy}</p>
                    </div>
                  )}
                  
                  {(photo.takenAt || photo.uploadedAt) && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {photo.takenAt ? 'Date taken' : 'Date uploaded'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(photo.takenAt || photo.uploadedAt)}
                      </p>
                    </div>
                  )}
                </div>

                {photo.location?.name && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Location
                    </p>
                    <p className="text-sm text-gray-600">
                      {photo.location.name}
                      {photo.location.address && (
                        <span className="text-gray-500 block">{photo.location.address}</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Technical Details */}
            {photo.metadata && (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Technical Details
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {photo.metadata.width && photo.metadata.height && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Dimensions</p>
                      <p className="text-sm text-gray-600">
                        {photo.metadata.width} × {photo.metadata.height}
                      </p>
                    </div>
                  )}
                  
                  {photo.metadata.size && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">File Size</p>
                      <p className="text-sm text-gray-600">{formatFileSize(photo.metadata.size)}</p>
                    </div>
                  )}
                  
                  {photo.metadata.camera && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Camera</p>
                      <p className="text-sm text-gray-600">{photo.metadata.camera}</p>
                    </div>
                  )}
                  
                  {photo.metadata.lens && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Lens</p>
                      <p className="text-sm text-gray-600">{photo.metadata.lens}</p>
                    </div>
                  )}
                  
                  {photo.metadata.iso && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">ISO</p>
                      <p className="text-sm text-gray-600">{photo.metadata.iso}</p>
                    </div>
                  )}
                  
                  {photo.metadata.aperture && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Aperture</p>
                      <p className="text-sm text-gray-600">{photo.metadata.aperture}</p>
                    </div>
                  )}
                  
                  {photo.metadata.shutterSpeed && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Shutter Speed</p>
                      <p className="text-sm text-gray-600">{photo.metadata.shutterSpeed}</p>
                    </div>
                  )}
                  
                  {photo.metadata.focalLength && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Focal Length</p>
                      <p className="text-sm text-gray-600">{photo.metadata.focalLength}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            {photo.stats && (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Statistics
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {photo.stats.views !== undefined && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Views</p>
                      <p className="text-sm text-gray-600">{photo.stats.views.toLocaleString()}</p>
                    </div>
                  )}
                  
                  {photo.stats.downloads !== undefined && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Downloads</p>
                      <p className="text-sm text-gray-600">{photo.stats.downloads.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Approval Status */}
            {photo.approval && (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Approval Status
                </h3>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    {getApprovalBadge(photo.approval.status)}
                  </div>
                  
                  {photo.approval.reviewedBy && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Reviewed by</p>
                      <p className="text-sm text-gray-600">{photo.approval.reviewedBy}</p>
                    </div>
                  )}
                  
                  {photo.approval.reviewedAt && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Reviewed at</p>
                      <p className="text-sm text-gray-600">{formatDate(photo.approval.reviewedAt)}</p>
                    </div>
                  )}
                  
                  {photo.approval.reason && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Reason</p>
                      <p className="text-sm text-gray-600">{photo.approval.reason}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
};