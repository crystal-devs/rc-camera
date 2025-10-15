// components/gallery/UploadProgressTab.tsx
'use client';

import React, { useState } from 'react';
import { 
  X, CheckCircle, Upload, ChevronDown, ChevronUp, Pause, Play, RotateCcw, Trash2 
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
    if (status === 'completed') return <CheckCircle className="h-3 w-3 text-green-500" />;
    if (status === 'failed') return <X className="h-3 w-3 text-red-500" />;
    if (status === 'paused') return <Pause className="h-3 w-3 text-yellow-500" />;
    return <Upload className="h-3 w-3 text-blue-500" />;
  };

  const formatSummary = () => {
    const parts: string[] = [];
    if (summary.uploading > 0) parts.push(`${summary.uploading} uploading`);
    if (summary.processing > 0) parts.push(`${summary.processing} processing`);
    if ((summary.paused || 0) > 0) parts.push(`${summary.paused} paused`);
    if (summary.completed > 0) parts.push(`${summary.completed} done`);
    if (summary.failed > 0) parts.push(`${summary.failed} failed`);
    return parts.join(' • ');
  };

  return (
    <div className={cn(
      "relative flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-sm",
      hasActiveUploads ? "border border-blue-200 dark:border-blue-700" : "border border-green-200 dark:border-green-700",
      className
    )}>
      {/* Summary Tab */}
      <div className="flex items-center gap-2">
        {hasActiveUploads ? (
          <div className="animate-pulse">{getStatusIcon('uploading')}</div>
        ) : (
          getStatusIcon('completed')
        )}
        <span className="text-xs font-medium">
          {summary.completed + summary.failed}/{summary.total}
        </span>
        {hasActiveUploads && (
          <Progress 
            value={summary.overallProgress} 
            className="w-20 h-1 bg-gray-300 dark:bg-gray-600"
          />
        )}
        <span className="text-xs text-gray-600 dark:text-gray-400 hidden sm:inline">
          {formatSummary()}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 w-6 p-0"
        >
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
        {!hasActiveUploads && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Dropdown for Detailed Progress */}
      {isExpanded && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
          <div className="p-2 space-y-2">
            {progressArray.map((item) => (
              <div
                key={item.mediaId}
                className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-md"
              >
                {getStatusIcon(item.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium truncate">{item.filename}</p>
                    <div className="flex items-center gap-1">
                      {item.status === 'failed' && onRetryItem && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRetryItem(item.mediaId)}
                          className="h-5 w-5 p-0 text-yellow-500 hover:text-yellow-700"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                      {(item.status === 'uploading' || item.status === 'processing') && onPauseResumeItem && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPauseResumeItem(item.mediaId, 'pause')}
                          className="h-5 w-5 p-0 text-yellow-500 hover:text-yellow-700"
                        >
                          <Pause className="h-3 w-3" />
                        </Button>
                      )}
                      {item.status === 'paused' && onPauseResumeItem && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPauseResumeItem(item.mediaId, 'resume')}
                          className="h-5 w-5 p-0 text-green-500 hover:text-green-700"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                      {(item.status === 'failed' || item.status === 'paused') && onCancelItem && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCancelItem(item.mediaId)}
                          className="h-5 w-5 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                      {item.status === 'completed' && onRemoveItem && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveItem(item.mediaId)}
                          className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    {item.status !== 'failed' && item.status !== 'completed' && ` • ${item.percentage}%`}
                    {item.status === 'failed' && item.error && ` • ${item.error}`}
                  </div>
                  {(item.status === 'uploading' || item.status === 'processing') && (
                    <Progress value={item.percentage} className="h-1 mt-1" />
                  )}
                </div>
              </div>
            ))}
            {progressArray.length === 0 && (
              <div className="text-center py-2 text-xs text-gray-500 dark:text-gray-400">
                No uploads in progress
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}