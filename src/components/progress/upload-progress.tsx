// components/gallery/UploadProgressTab.tsx
'use client';

import React, { useState } from 'react';
import {
  X, CheckCircle, Upload, ChevronDown, ChevronUp, Pause, Play, RotateCcw, Trash2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface UploadProgressItem {
  mediaId: string;
  filename: string;
  stage: string;
  percentage: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed' | 'paused';
  startTime: Date;
  error?: string;
}

interface UploadProgressTabProps {
  uploadProgress: { [mediaId: string]: UploadProgressItem };
  isMonitoring: boolean;
  summary: {
    total: number;
    uploading: number;
    processing: number;
    completed: number;
    failed: number;
    paused?: number;
    overallProgress: number;
  };
  onClearAll: () => void;
  onRemoveItem?: (mediaId: string) => void;
  onRetryItem?: (mediaId: string) => void;
  onCancelItem?: (mediaId: string) => void;
  onPauseResumeItem?: (mediaId: string, action: 'pause' | 'resume') => void;
  className?: string;
}

export function UploadProgressTab({
  uploadProgress,
  isMonitoring,
  summary,
  onClearAll,
  onRemoveItem,
  onRetryItem,
  onCancelItem,
  onPauseResumeItem,
  className
}: UploadProgressTabProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const progressArray = Object.values(uploadProgress);
  const hasActiveUploads = summary.uploading > 0 || summary.processing > 0 || (summary.paused || 0) > 0;
  const hasAnyUploads = summary.total > 0;

  if (!hasAnyUploads) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'failed') return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (status === 'paused') return <Pause className="h-4 w-4 text-yellow-500" />;
    return <Upload className="h-4 w-4 text-blue-500 animate-pulse" />;
  };

  const formatSummary = () => {
    const parts: string[] = [];
    if (summary.completed > 0 && summary.failed > 0) {
      return `${summary.completed} completed • ${summary.failed} failed`;
    }
    if (summary.completed === summary.total) {
      return `${summary.completed} uploaded`;
    }
    if (hasActiveUploads) {
      return `${summary.completed}/${summary.total} uploaded`;
    }
    return `${summary.total} items`;
  };

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 min-w-[320px] max-w-md",
      className
    )}>
      <div className={cn(
        "bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden",
        "transition-all duration-300 ease-in-out"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {hasActiveUploads ? (
              <div className="relative">
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                <div className="absolute inset-0 h-2 w-2 bg-blue-500 rounded-full animate-ping opacity-75" />
              </div>
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {hasActiveUploads ? 'Upload in progress' : 'Upload completed'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatSummary()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            {!hasActiveUploads && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {hasActiveUploads && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
            <Progress
              value={summary.overallProgress}
              className="h-1.5 bg-gray-200 dark:bg-gray-700"
            />
          </div>
        )}

        {/* File List */}
        {isExpanded && (
          <div className="max-h-64 overflow-y-auto">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {progressArray.map((item) => (
                <div
                  key={item.mediaId}
                  className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(item.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {item.filename}
                        </p>
                        <div className="flex items-center gap-1 ml-2">
                          {item.status === 'failed' && onRetryItem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRetryItem(item.mediaId)}
                              className="h-6 w-6 p-0"
                              title="Retry"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                          {item.status === 'completed' && onRemoveItem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveItem(item.mediaId)}
                              className="h-6 w-6 p-0"
                              title="Remove"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xs",
                          item.status === 'completed' && "text-green-600 dark:text-green-400",
                          item.status === 'failed' && "text-red-600 dark:text-red-400",
                          item.status === 'uploading' && "text-blue-600 dark:text-blue-400",
                          item.status === 'processing' && "text-purple-600 dark:text-purple-400"
                        )}>
                          {item.status === 'uploading' && `Uploading • ${Math.round(item.percentage)}%`}
                          {item.status === 'processing' && 'Processing...'}
                          {item.status === 'completed' && 'Completed'}
                          {item.status === 'failed' && (item.error || 'Failed')}
                        </span>
                      </div>
                      {(item.status === 'uploading' || item.status === 'processing') && (
                        <Progress
                          value={item.percentage}
                          className="h-1 mt-2 bg-gray-200 dark:bg-gray-700"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs for Completed/Failed */}
        {!hasActiveUploads && isExpanded && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-4 text-xs">
              <button className="text-green-600 dark:text-green-400 font-medium">
                Completed ({summary.completed})
              </button>
              {summary.failed > 0 && (
                <button className="text-red-600 dark:text-red-400 font-medium">
                  Failed ({summary.failed})
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}