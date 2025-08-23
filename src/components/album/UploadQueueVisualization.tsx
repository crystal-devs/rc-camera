// components/admin/UploadQueueVisualization.tsx
'use client';

import { useState, useEffect, memo } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Upload, 
  Image, 
  Users, 
  Activity,
  Pause,
  Play,
  RotateCcw,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface UploadQueueItem {
  mediaId: string;
  filename: string;
  uploader: {
    id: string;
    name: string;
    type: 'admin' | 'guest';
    avatar?: string;
  };
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'paused';
  stage: 'uploading' | 'preview_creating' | 'processing' | 'variants_creating' | 'completed';
  progress: number;
  size: number; // in MB
  queuePosition?: number;
  estimatedTime?: number; // in seconds
  startTime?: Date;
  completedTime?: Date;
  error?: string;
  retryCount: number;
  jobId?: string;
  thumbnail?: string;
}

interface QueueStats {
  total: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  paused: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
  queueThroughput: number; // items per minute
}

interface UploadQueueVisualizationProps {
  eventId: string;
  webSocket: any;
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const UploadQueueVisualization = memo<UploadQueueVisualizationProps>(({
  eventId,
  webSocket,
  className = '',
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  const [queueItems, setQueueItems] = useState<UploadQueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    total: 0,
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    paused: 0,
    totalProcessingTime: 0,
    averageProcessingTime: 0,
    queueThroughput: 0
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'queue' | 'history'>('overview');
  const [isLive, setIsLive] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Simulate queue data - replace with real API calls
  useEffect(() => {
    const fetchQueueData = async () => {
      try {
        // This would be your actual API call
        // const response = await fetch(`/api/events/${eventId}/upload-queue`);
        // const data = await response.json();
        
        // Mock data for demonstration
        const mockData = generateMockQueueData();
        setQueueItems(mockData.items);
        setStats(mockData.stats);
      } catch (error) {
        console.error('Failed to fetch queue data:', error);
      }
    };

    fetchQueueData();

    if (autoRefresh && isLive) {
      const interval = setInterval(fetchQueueData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [eventId, autoRefresh, refreshInterval, isLive]);

  // WebSocket listeners for real-time updates
  useEffect(() => {
    if (!webSocket?.socket || !isLive) return;

    const socket = webSocket.socket;

    const handleQueueUpdate = (data: any) => {
      setQueueItems(prev => {
        const index = prev.findIndex(item => item.mediaId === data.mediaId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...data };
          return updated;
        } else {
          return [...prev, data];
        }
      });
    };

    const handleQueueStats = (data: QueueStats) => {
      setStats(data);
    };

    socket.on('queue_update', handleQueueUpdate);
    socket.on('queue_stats', handleQueueStats);
    socket.on('upload_progress', handleQueueUpdate);

    return () => {
      socket.off('queue_update', handleQueueUpdate);
      socket.off('queue_stats', handleQueueStats);
      socket.off('upload_progress', handleQueueUpdate);
    };
  }, [webSocket?.socket, isLive]);

  const getStatusIcon = (status: string, stage: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'queued':
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Upload className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'completed': 'bg-green-500',
      'failed': 'bg-red-500',
      'paused': 'bg-yellow-500',
      'processing': 'bg-blue-500',
      'queued': 'bg-gray-400'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-300';
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return '--';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const formatFileSize = (mb: number) => {
    return `${mb.toFixed(1)} MB`;
  };

  const retryUpload = (mediaId: string) => {
    // Implementation for retry functionality
    console.log('Retrying upload:', mediaId);
  };

  const pauseUpload = (mediaId: string) => {
    // Implementation for pause functionality
    console.log('Pausing upload:', mediaId);
  };

  const cancelUpload = (mediaId: string) => {
    // Implementation for cancel functionality
    console.log('Cancelling upload:', mediaId);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Upload Queue</h2>
          <p className="text-muted-foreground">
            Monitor and manage all upload activities for this event
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={isLive ? "default" : "outline"}
            size="sm"
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Live
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Paused
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Refresh data
              window.location.reload();
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Queue</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500 animate-pulse" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Average Processing Time</p>
              <p className="text-xl font-semibold">{formatTime(stats.averageProcessingTime)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Queue Throughput</p>
              <p className="text-xl font-semibold">{stats.queueThroughput}/min</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Queue Health</p>
              <div className="flex items-center gap-2">
                {stats.failed === 0 ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Healthy
                  </Badge>
                ) : stats.failed < 3 ? (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                    Warning
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    Critical
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Tabs */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queue">Active Queue ({stats.queued + stats.processing})</TabsTrigger>
          <TabsTrigger value="history">History ({stats.completed + stats.failed})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Queue Progress Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>Queue Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {queueItems
                  .filter(item => item.status === 'processing')
                  .slice(0, 5)
                  .map(item => (
                    <div key={item.mediaId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status, item.stage)}
                          <span className="font-medium">{item.filename}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.uploader.type}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {item.progress}%
                        </span>
                      </div>
                      <Progress value={item.progress} className="h-2" />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Queue Items</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {queueItems
                    .filter(item => ['queued', 'processing', 'paused'].includes(item.status))
                    .map(item => (
                      <QueueItemCard 
                        key={item.mediaId} 
                        item={item}
                        onRetry={retryUpload}
                        onPause={pauseUpload}
                        onCancel={cancelUpload}
                      />
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed & Failed Items</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {queueItems
                    .filter(item => ['completed', 'failed'].includes(item.status))
                    .slice(0, 20)
                    .map(item => (
                      <QueueItemCard 
                        key={item.mediaId} 
                        item={item}
                        onRetry={retryUpload}
                        showHistory={true}
                      />
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});

// Individual Queue Item Component
const QueueItemCard = memo<{
  item: UploadQueueItem;
  onRetry?: (mediaId: string) => void;
  onPause?: (mediaId: string) => void;
  onCancel?: (mediaId: string) => void;
  showHistory?: boolean;
}>(({ item, onRetry, onPause, onCancel, showHistory = false }) => {
  const getStatusIcon = (status: string, stage: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'queued':
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Upload className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return '--';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const formatFileSize = (mb: number) => {
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg">
      {/* Status & Thumbnail */}
      <div className="flex items-center gap-3">
        {getStatusIcon(item.status, item.stage)}
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
          {item.thumbnail ? (
            <img 
              src={item.thumbnail} 
              alt={item.filename}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <Image className="h-6 w-6 text-gray-400" />
          )}
        </div>
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium truncate">{item.filename}</p>
          <Badge variant="outline" className="text-xs">
            {formatFileSize(item.size)}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Avatar className="h-4 w-4">
            <AvatarFallback className="text-xs">
              {item.uploader.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span>{item.uploader.name}</span>
          <Badge variant="outline" className="text-xs">
            {item.uploader.type}
          </Badge>
        </div>

        {/* Progress Bar for Active Items */}
        {!showHistory && item.status === 'processing' && (
          <div className="mt-2">
            <Progress value={item.progress} className="h-1" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{item.stage.replace('_', ' ')}</span>
              <span>{item.progress}%</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {item.error && (
          <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
            <AlertTriangle className="h-3 w-3" />
            <span>{item.error}</span>
          </div>
        )}
      </div>

      {/* Stats & Actions */}
      <div className="text-right space-y-1">
        <div className="text-sm text-muted-foreground">
          {showHistory && item.completedTime ? (
            <span>
              Completed {formatTime((Date.now() - item.completedTime.getTime()) / 1000)} ago
            </span>
          ) : item.estimatedTime ? (
            <span>ETA: {formatTime(item.estimatedTime)}</span>
          ) : null}
        </div>
        
        {item.queuePosition && (
          <Badge variant="outline" className="text-xs">
            #{item.queuePosition}
          </Badge>
        )}
        
        {/* Action Buttons */}
        <div className="flex gap-1 mt-2">
          {item.status === 'failed' && onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRetry(item.mediaId)}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
          
          {item.status === 'processing' && onPause && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPause(item.mediaId)}
            >
              <Pause className="h-3 w-3" />
            </Button>
          )}
          
          {['queued', 'processing', 'paused'].includes(item.status) && onCancel && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCancel(item.mediaId)}
            >
              <XCircle className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

// Mock data generator (replace with real API)
function generateMockQueueData() {
  const mockItems: UploadQueueItem[] = [
    {
      mediaId: '1',
      filename: 'wedding-photo-001.jpg',
      uploader: { id: 'guest1', name: 'Sarah Johnson', type: 'guest' },
      status: 'processing',
      stage: 'variants_creating',
      progress: 75,
      size: 3.2,
      queuePosition: 1,
      estimatedTime: 30,
      startTime: new Date(Date.now() - 45000),
      retryCount: 0,
      jobId: 'job_123'
    },
    {
      mediaId: '2',
      filename: 'ceremony-group.jpg',
      uploader: { id: 'admin1', name: 'John Photographer', type: 'admin' },
      status: 'queued',
      stage: 'uploading',
      progress: 0,
      size: 5.8,
      queuePosition: 2,
      estimatedTime: 120,
      retryCount: 0
    },
    {
      mediaId: '3',
      filename: 'reception-dance.mp4',
      uploader: { id: 'guest2', name: 'Mike Wilson', type: 'guest' },
      status: 'failed',
      stage: 'processing',
      progress: 0,
      size: 12.5,
      retryCount: 2,
      error: 'File format not supported'
    },
    {
      mediaId: '4',
      filename: 'bride-portrait.jpg',
      uploader: { id: 'admin1', name: 'John Photographer', type: 'admin' },
      status: 'completed',
      stage: 'completed',
      progress: 100,
      size: 2.1,
      completedTime: new Date(Date.now() - 300000),
      retryCount: 0
    }
  ];

  const stats: QueueStats = {
    total: 4,
    queued: 1,
    processing: 1,
    completed: 1,
    failed: 1,
    paused: 0,
    totalProcessingTime: 1200,
    averageProcessingTime: 45,
    queueThroughput: 12
  };

  return { items: mockItems, stats };
}

UploadQueueVisualization.displayName = 'UploadQueueVisualization';

export default UploadQueueVisualization;