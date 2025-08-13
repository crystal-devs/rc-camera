// components/UploadProgressIndicator.tsx - Real-time upload progress UI

'use client';

import React, { memo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Upload, 
  FileImage, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react';
import { useCurrentUploadProgress } from '@/hooks/useUploadProgress';
import { useState } from 'react';

interface UploadProgressIndicatorProps {
  eventId: string;
  userType?: 'admin' | 'guest';
  className?: string;
  showDetails?: boolean;
}

export const UploadProgressIndicator = memo(function UploadProgressIndicator({
  eventId,
  userType = 'admin',
  className = '',
  showDetails = true
}: UploadProgressIndicatorProps) {
  const { session, isUploading, isProcessing, progress, files } = useCurrentUploadProgress(eventId, userType);
  const [showFileDetails, setShowFileDetails] = useState(false);

  if (!session || session.isComplete) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'uploading':
        return <Upload className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'uploaded':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileImage className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStageText = (stage: string) => {
    switch (stage) {
      case 'upload':
        return 'Uploading';
      case 'validation':
        return 'Validating';
      case 'processing':
        return 'Processing';
      case 'thumbnail':
        return 'Creating thumbnail';
      case 'variants':
        return 'Generating sizes';
      case 'completed':
        return 'Complete';
      case 'failed':
        return 'Failed';
      default:
        return 'Processing';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond?: number) => {
    if (!bytesPerSecond) return '';
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  const formatETA = (seconds?: number) => {
    if (!seconds) return '';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isUploading ? (
              <Upload className="h-5 w-5 text-blue-600 animate-pulse" />
            ) : isProcessing ? (
              <Zap className="h-5 w-5 text-orange-600" />
            ) : (
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            )}
            <span className="font-medium text-blue-700 dark:text-blue-300">
              {isUploading ? 'Uploading files' : isProcessing ? 'Processing files' : 'Working on files'}
            </span>
          </div>
          
          <Badge variant="outline" className="text-xs">
            {progress?.completed + progress?.failed}/{progress?.total}
          </Badge>
        </div>

        {showDetails && files.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFileDetails(!showFileDetails)}
            className="h-6 w-6 p-0"
          >
            {showFileDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-blue-700 dark:text-blue-300">
            Overall Progress
          </span>
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            {progress?.percentage || 0}%
          </span>
        </div>
        
        <Progress 
          value={progress?.percentage || 0} 
          className="h-2"
        />
        
        <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
          <span>{progress?.processing || 0} processing</span>
          <span>{progress?.completed || 0} completed</span>
          {(progress?.failed || 0) > 0 && (
            <span className="text-red-600">{progress?.failed} failed</span>
          )}
        </div>
      </div>

      {/* File Details */}
      {showDetails && (showFileDetails || files.length === 1) && (
        <div className="space-y-2 border-t border-blue-200 dark:border-blue-700 pt-3">
          <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
            File Progress
          </div>
          
          <div className="max-h-32 overflow-y-auto space-y-2">
            {files.map((file) => (
              <div
                key={file.fileId}
                className="flex items-center gap-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded border"
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(file.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">
                      {file.filename}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {file.progress}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {getStageText(file.stage)}
                    </span>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {file.uploadSpeed && (
                        <span>{formatSpeed(file.uploadSpeed)}</span>
                      )}
                      {file.eta && (
                        <span>• ETA {formatETA(file.eta)}</span>
                      )}
                    </div>
                  </div>
                  
                  <Progress 
                    value={file.progress} 
                    className="h-1 mt-1"
                  />
                  
                  {file.error && (
                    <div className="text-xs text-red-600 mt-1">
                      Error: {file.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {!showFileDetails && files.length > 1 && (
        <div className="flex items-center gap-4 text-xs text-blue-600 dark:text-blue-400 border-t border-blue-200 dark:border-blue-700 pt-2">
          <span className="flex items-center gap-1">
            <Upload className="h-3 w-3" />
            {files.filter(f => f.status === 'uploading').length} uploading
          </span>
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3" />
            {files.filter(f => f.status === 'processing').length} processing
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            {files.filter(f => f.status === 'completed').length} done
          </span>
          {files.filter(f => f.status === 'failed').length > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="h-3 w-3" />
              {files.filter(f => f.status === 'failed').length} failed
            </span>
          )}
        </div>
      )}
    </div>
  );
});

// Compact version for minimal UI space
export const CompactUploadProgress = memo(function CompactUploadProgress({
  eventId,
  userType = 'admin',
  className = ''
}: UploadProgressIndicatorProps) {
  const { session, isUploading, isProcessing, progress } = useCurrentUploadProgress(eventId, userType);

  if (!session || session.isComplete) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <div className="flex items-center gap-1">
        {isUploading ? (
          <Upload className="h-4 w-4 text-blue-500 animate-pulse" />
        ) : (
          <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />
        )}
        <span className="text-blue-700 dark:text-blue-300">
          {isUploading ? 'Uploading' : 'Processing'}
        </span>
      </div>
      
      <Progress 
        value={progress?.percentage || 0} 
        className="h-2 w-20"
      />
      
      <span className="text-xs text-gray-600 dark:text-gray-400">
        {progress?.completed}/{progress?.total}
      </span>
    </div>
  );
});

// Toast notification component for upload completion
export const UploadCompletionToast = ({ 
  completedFiles, 
  failedFiles, 
  totalFiles 
}: { 
  completedFiles: number; 
  failedFiles: number; 
  totalFiles: number; 
}) => (
  <div className="flex items-center gap-3">
    <CheckCircle className="h-5 w-5 text-green-600" />
    <div>
      <div className="font-medium">
        Upload {completedFiles === totalFiles ? 'completed' : 'finished'}!
      </div>
      <div className="text-sm text-gray-600">
        {completedFiles} of {totalFiles} files processed successfully
        {failedFiles > 0 && ` • ${failedFiles} failed`}
      </div>
    </div>
  </div>
);