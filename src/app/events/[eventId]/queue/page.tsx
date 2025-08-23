// pages/admin/events/[eventId]/queue.tsx
// Admin queue management page

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Settings,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

// Import your components and hooks
import { useSimpleWebSocket } from '@/hooks/useWebSocket';
import { useQueueManagement } from '@/hooks/useQueueManagement';
import UploadQueueVisualization from '@/components/album/UploadQueueVisualization';

export default function AdminQueueManagement() {
  const params = useParams();
  const eventId = params?.eventId as string;
  const [selectedTab, setSelectedTab] = useState<'overview' | 'monitoring' | 'settings'>('overview');

  // WebSocket connection for admin
  const webSocket = useSimpleWebSocket(eventId, undefined, 'admin');

  // Queue management hook
  const queueManager = useQueueManagement(eventId, webSocket, {
    autoRefresh: true,
    refreshInterval: 5000,
    enableWebSocket: true,
    onQueueAlert: (alert) => {
      // Custom alert handling
      console.log('Queue alert received:', alert);
      
      if (alert.severity === 'critical') {
        toast.error(`Critical Queue Issue: ${alert.message}`, {
          duration: 10000,
          action: {
            label: 'View Details',
            onClick: () => setSelectedTab('monitoring')
          }
        });
      } else if (alert.severity === 'warning') {
        toast.warning(`Queue Warning: ${alert.message}`, {
          duration: 5000
        });
      }
    }
  });

  const getHealthStatus = () => {
    if (queueManager.isQueueHealthy) {
      return { 
        status: 'healthy', 
        label: 'Healthy', 
        color: 'text-green-600',
        icon: CheckCircle2 
      };
    } else if (queueManager.stats.failed > 0) {
      return { 
        status: 'warning', 
        label: 'Issues Detected', 
        color: 'text-yellow-600',
        icon: AlertTriangle 
      };
    } else {
      return { 
        status: 'unknown', 
        label: 'Unknown', 
        color: 'text-gray-600',
        icon: Clock 
      };
    }
  };

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon;

  if (queueManager.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading queue data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload Queue Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage upload processing for your event
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Queue Health Indicator */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 ${healthStatus.color}`}>
            <HealthIcon className="h-4 w-4" />
            <span className="text-sm font-medium">{healthStatus.label}</span>
          </div>

          {/* Connection Status */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
            webSocket.isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            <div className={`h-2 w-2 rounded-full ${
              webSocket.isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-sm font-medium">
              {webSocket.isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => queueManager.refresh()}
            disabled={queueManager.isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${queueManager.isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Queue</p>
                <p className="text-2xl font-bold">{queueManager.stats.queued + queueManager.stats.processing}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
            {queueManager.stats.processing > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-xs text-muted-foreground">
                  {queueManager.stats.processing} processing
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{queueManager.stats.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <div className="mt-2">
              <span className="text-xs text-muted-foreground">
                {queueManager.queueEfficiency.toFixed(1)}% success rate
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{queueManager.stats.failed}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            {queueManager.hasFailedUploads && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-6 text-xs"
                onClick={queueManager.retryAllFailed}
              >
                Retry All
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Throughput</p>
                <p className="text-2xl font-bold">{queueManager.stats.queueThroughput}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
            <div className="mt-2">
              <span className="text-xs text-muted-foreground">
                items/hour
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
        <TabsList>
          <TabsTrigger value="overview">Queue Overview</TabsTrigger>
          <TabsTrigger value="monitoring">
            Real-time Monitoring
            {queueManager.hasActiveUploads && (
              <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-700">
                {queueManager.getProcessingItems().length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <UploadQueueVisualization
            eventId={eventId}
            webSocket={webSocket}
            autoRefresh={true}
            refreshInterval={5000}
            className="mt-6"
          />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          {/* Real-time monitoring dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Active Uploads */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Currently Processing ({queueManager.getProcessingItems().length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {queueManager.getProcessingItems().slice(0, 5).map(item => (
                    <div key={item.mediaId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate">{item.filename}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-blue-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{item.progress}%</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {item.stage.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                  
                  {queueManager.getProcessingItems().length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      No uploads currently processing
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Failed Uploads */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Failed Uploads ({queueManager.getFailedItems().length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {queueManager.getFailedItems().slice(0, 5).map(item => (
                    <div key={item.mediaId} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate">{item.filename}</p>
                        <p className="text-xs text-red-600 mt-1">{item.error}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => queueManager.retryUpload(item.mediaId)}
                        disabled={queueManager.isPerformingAction === item.mediaId}
                      >
                        Retry
                      </Button>
                    </div>
                  ))}
                  
                  {queueManager.getFailedItems().length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      No failed uploads
                    </div>
                  )}
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
                <div className="text-center">
                  <p className="text-2xl font-bold">{queueManager.stats.averageProcessingTime}s</p>
                  <p className="text-sm text-muted-foreground">Avg Processing Time</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{queueManager.queueEfficiency.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{queueManager.stats.queueThroughput}/h</p>
                  <p className="text-sm text-muted-foreground">Throughput</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {/* Queue Management Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Queue Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={queueManager.retryAllFailed}
                  disabled={!queueManager.hasFailedUploads}
                >
                  Retry All Failed ({queueManager.stats.failed})
                </Button>
                
                <Button
                  variant="outline"
                  onClick={queueManager.pauseAllActive}
                  disabled={!queueManager.hasActiveUploads}
                >
                  Pause All Active ({queueManager.stats.queued + queueManager.stats.processing})
                </Button>
                
                <Button
                  variant="outline"
                  onClick={queueManager.resumeAllPaused}
                  disabled={!queueManager.hasPausedUploads}
                >
                  Resume All Paused ({queueManager.stats.paused})
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => queueManager.clearQueueHistory(24)}
                >
                  Clear History (24h+)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}