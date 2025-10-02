// components/gallery/UploadProgressPanel.tsx
'use client';

import React, { useState } from 'react';
import { 
  X, CheckCircle, AlertCircle, Upload, FileImage, Clock, Zap, 
  ChevronDown, ChevronUp, Pause, Play, RotateCcw, Trash2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface UploadProgressItem {
  mediaId: string;
  filename: string;
  stage: string;
  percentage: number;
  message: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed' | 'paused';
  startTime: Date;
  lastUpdate: Date;
  error?: string;
  estimatedTime?: number;
}

interface UploadProgressPanelProps {
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

export function UploadProgressPanel({
  uploadProgress,
  isMonitoring,
  summary,
  onClearAll,
  onRemoveItem,
  onRetryItem,
  onCancelItem,
  onPauseResumeItem,
  className
}: UploadProgressPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCompletedOnly, setShowCompletedOnly] = useState(false);

  const progressArray = Object.values(uploadProgress);
  const hasActiveUploads = summary.uploading > 0 || summary.processing > 0 || (summary.paused || 0) > 0;
  const hasAnyUploads = summary.total > 0;

  if (!hasAnyUploads) {
    return null;
  }

  const filteredProgress = showCompletedOnly 
    ? progressArray.filter(item => item.status === 'completed')
    : progressArray;

  const getStageIcon = (stage: string, status: string) => {
    if (status === 'completed') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'failed') return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (status === 'paused') return <Pause className="h-4 w-4 text-yellow-500" />;
    if (stage === 'uploading') return <Upload className="h-4 w-4 text-blue-500" />;
    if (stage === 'processing' || stage === 'variants_creating') return <Zap className="h-4 w-4 text-orange-500" />;
    return <FileImage className="h-4 w-4 text-gray-500" />;
  };

  const getStageText = (stage: string, status: string) => {
    if (status === 'completed') return 'Complete';
    if (status === 'failed') return 'Failed';
    if (status === 'paused') return 'Paused';
    
    const stageMap: { [key: string]: string } = {
      'uploading': 'Uploading',
      'preview_creating': 'Creating Preview',
      'processing': 'Processing',
      'variants_creating': 'Creating Variants',
      'completed': 'Complete'
    };
    
    return stageMap[stage] || stage;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'processing': return 'bg-orange-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const formatDuration = (startTime: Date) => {
    const duration = Date.now() - startTime.getTime();
    const seconds = Math.floor(duration / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const formatETA = (estimatedTime?: number) => {
    if (!estimatedTime) return null;
    const seconds = Math.ceil(estimatedTime / 1000);
    if (seconds < 60) return `${seconds}s remaining`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m remaining`;
  };

  return (
    <Card className={cn("border-2 transition-all duration-200", className, {
      "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/10": hasActiveUploads,
      "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10": !hasActiveUploads && summary.completed > 0,
      "border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/10": !hasActiveUploads && summary.completed === 0
    })}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {hasActiveUploads ? (
                <div className="animate-pulse">
                  <Upload className="h-5 w-5 text-blue-600" />
                </div>
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              <h3 className="font-medium text-sm">
                {hasActiveUploads ? 'Upload Queue' : 'Upload Complete'}
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {summary.completed + summary.failed}/{summary.total}
              </Badge>
              {hasActiveUploads && (
                <Badge variant="secondary" className="text-xs">
                  {summary.overallProgress}%
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 w-7 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            
            {!hasActiveUploads && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Overall Progress Bar */}
        {hasActiveUploads && (
          <div className="mb-3">
            <Progress 
              value={summary.overallProgress} 
              className="h-2 bg-gray-200 dark:bg-gray-700"
            />
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
              <span>
                {summary.processing > 0 && `${summary.processing} processing`}
                {summary.uploading > 0 && summary.processing > 0 && ', '}
                {summary.uploading > 0 && `${summary.uploading} uploading`}
                {(summary.paused || 0) > 0 && `, ${summary.paused} paused`}
              </span>
              <span>{summary.overallProgress}%</span>
            </div>
          </div>
        )}

        {/* Status Summary */}
        {!isExpanded && (
          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            {summary.completed > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>{summary.completed} completed</span>
              </div>
            )}
            {summary.processing > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span>{summary.processing} processing</span>
              </div>
            )}
            {(summary.paused || 0) > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span>{summary.paused} paused</span>
              </div>
            )}
            {summary.failed > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span>{summary.failed} failed</span>
              </div>
            )}
          </div>
        )}

        {/* Detailed Progress List */}
        {isExpanded && (
          <div className="space-y-2">
            {/* Filter Controls */}
            {summary.completed > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {filteredProgress.length} of {progressArray.length} items
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCompletedOnly(!showCompletedOnly)}
                  className="text-xs h-6 px-2"
                >
                  {showCompletedOnly ? 'Show All' : 'Completed Only'}
                </Button>
              </div>
            )}

            {/* Progress Items */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredProgress.map((item) => (
                <div
                  key={item.mediaId}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex-shrink-0">
                    {getStageIcon(item.stage, item.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">
                        {item.filename}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {formatDuration(item.startTime)}
                        </span>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          {item.status === 'failed' && onRetryItem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRetryItem(item.mediaId)}
                              className="h-6 w-6 p-0 text-yellow-500 hover:text-yellow-700"
                              title="Retry upload"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                          
                          {(item.status === 'processing' || item.status === 'uploading') && onPauseResumeItem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onPauseResumeItem(item.mediaId, 'pause')}
                              className="h-6 w-6 p-0 text-yellow-500 hover:text-yellow-700"
                              title="Pause upload"
                            >
                              <Pause className="h-3 w-3" />
                            </Button>
                          )}
                          
                          {item.status === 'paused' && onPauseResumeItem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onPauseResumeItem(item.mediaId, 'resume')}
                              className="h-6 w-6 p-0 text-green-500 hover:text-green-700"
                              title="Resume upload"
                            >
                              <Play className="h-3 w-3" />
                            </Button>
                          )}
                          
                          {(item.status === 'failed' || item.status === 'paused') && onCancelItem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onCancelItem(item.mediaId)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              title="Cancel upload"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                          
                          {item.status === 'completed' && onRemoveItem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveItem(item.mediaId)}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                              title="Remove from list"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">
                            {getStageText(item.stage, item.status)}
                          </span>
                          {item.status !== 'failed' && item.status !== 'completed' && (
                            <span className="text-gray-500">
                              {item.percentage}%
                            </span>
                          )}
                        </div>
                        
                        {/* Progress bar for active uploads */}
                        {(item.status === 'processing' || item.status === 'uploading') && (
                          <Progress 
                            value={item.percentage} 
                            className="h-1 mt-1"
                          />
                        )}
                        
                        {/* ETA for active uploads */}
                        {(item.status === 'processing' || item.status === 'uploading') && item.estimatedTime && (
                          <p className="text-xs text-gray-500 mt-1">
                            {formatETA(item.estimatedTime)}
                          </p>
                        )}
                        
                        {/* Error message for failed uploads */}
                        {item.status === 'failed' && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {item.error || item.message}
                          </p>
                        )}
                        
                        {/* Paused message */}
                        {item.status === 'paused' && (
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                            Upload paused - click play to resume
                          </p>
                        )}
                      </div>
                      
                      <div className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        getStatusColor(item.status)
                      )} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredProgress.length === 0 && (
              <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                {showCompletedOnly ? 'No completed uploads' : 'No uploads in progress'}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}