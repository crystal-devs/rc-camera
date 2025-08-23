// components/gallery/UploadProgressIndicator.tsx
'use client';

import { memo } from 'react';
import { UploadIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { UploadProgressState } from '@/hooks/useUploadProgress';

interface UploadProgressIndicatorProps {
    uploadProgress: UploadProgressState;
    isMonitoring: boolean;
    summary: {
        total: number;
        uploading: number;
        processing: number;
        completed: number;
        failed: number;
        overallProgress: number;
    };
    onClearAll?: () => void;
    showDetails?: boolean;
}

const getStageIcon = (stage: string, status: string) => {
    if (status === 'completed') return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
    if (status === 'failed') return <XCircleIcon className="h-4 w-4 text-red-500" />;
    if (status === 'processing') return <ClockIcon className="h-4 w-4 text-blue-500" />;
    return <UploadIcon className="h-4 w-4 text-gray-500" />;
};

const getStageColor = (status: string) => {
    switch (status) {
        case 'completed': return 'bg-green-500';
        case 'failed': return 'bg-red-500';
        case 'processing': return 'bg-blue-500';
        default: return 'bg-gray-400';
    }
};

const formatTimeElapsed = (startTime: Date): string => {
    const elapsed = Date.now() - startTime.getTime();
    const seconds = Math.floor(elapsed / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
};

export const UploadProgressIndicator = memo<UploadProgressIndicatorProps>(({
    uploadProgress,
    isMonitoring,
    summary,
    onClearAll,
    showDetails = true
}) => {
    if (!isMonitoring || summary.total === 0) return null;

    const progressEntries = Object.values(uploadProgress);
    const hasActiveUploads = summary.uploading > 0 || summary.processing > 0;

    return (
        <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <Collapsible defaultOpen={hasActiveUploads}>
                <CollapsibleTrigger className="w-full">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2">
                                    {hasActiveUploads ? (
                                        <div className="animate-spin">
                                            <UploadIcon className="h-5 w-5 text-blue-600" />
                                        </div>
                                    ) : (
                                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                    )}
                                    <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                        {hasActiveUploads ? 'Processing uploads' : 'Uploads completed'}
                                    </CardTitle>
                                </div>
                                
                                <div className="flex gap-1">
                                    {summary.processing > 0 && (
                                        <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
                                            {summary.processing} processing
                                        </Badge>
                                    )}
                                    {summary.completed > 0 && (
                                        <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
                                            {summary.completed} completed
                                        </Badge>
                                    )}
                                    {summary.failed > 0 && (
                                        <Badge variant="outline" className="text-xs bg-red-100 text-red-700">
                                            {summary.failed} failed
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs text-blue-600 dark:text-blue-400">
                                    {summary.completed + summary.failed}/{summary.total}
                                </span>
                                {!hasActiveUploads && onClearAll && (
                                    <Button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onClearAll();
                                        }}
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                    >
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Overall progress bar */}
                        <div className="space-y-1">
                            <Progress 
                                value={summary.overallProgress} 
                                className="h-2" 
                            />
                            <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
                                <span>
                                    {hasActiveUploads ? 'Processing...' : 'All uploads processed'}
                                </span>
                                <span>{summary.overallProgress}%</span>
                            </div>
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>

                {showDetails && progressEntries.length > 0 && (
                    <CollapsibleContent>
                        <CardContent className="pt-0 space-y-2">
                            {progressEntries.map(progress => (
                                <div 
                                    key={progress.mediaId}
                                    className="flex items-center gap-3 p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg"
                                >
                                    <div className="flex-shrink-0">
                                        {getStageIcon(progress.stage, progress.status)}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                {progress.filename}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">
                                                    {formatTimeElapsed(progress.startTime)}
                                                </span>
                                                <span className="text-xs font-medium">
                                                    {progress.percentage}%
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-1">
                                            <Progress 
                                                value={progress.percentage} 
                                                className="h-1.5" 
                                            />
                                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                                {progress.message}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </CollapsibleContent>
                )}
            </Collapsible>
        </Card>
    );
});

UploadProgressIndicator.displayName = 'UploadProgressIndicator';

// Simplified compact version for when space is limited
export const CompactUploadProgress = memo<{
    summary: UploadProgressIndicatorProps['summary'];
    isMonitoring: boolean;
}>(({ summary, isMonitoring }) => {
    if (!isMonitoring || summary.total === 0) return null;

    const hasActiveUploads = summary.uploading > 0 || summary.processing > 0;

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            {hasActiveUploads ? (
                <div className="animate-spin">
                    <UploadIcon className="h-4 w-4 text-blue-600" />
                </div>
            ) : (
                <CheckCircleIcon className="h-4 w-4 text-green-600" />
            )}
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        {hasActiveUploads ? 'Processing...' : 'Complete'}
                    </span>
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                        {summary.completed + summary.failed}/{summary.total}
                    </span>
                </div>
                <Progress value={summary.overallProgress} className="h-1.5 mt-1" />
            </div>
        </div>
    );
});

CompactUploadProgress.displayName = 'CompactUploadProgress';