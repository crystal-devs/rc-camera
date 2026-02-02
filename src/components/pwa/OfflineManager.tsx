import React, { useState, useEffect, createContext, useContext } from 'react';
import { Wifi, WifiOff, CloudUpload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OfflinePhoto {
    id: string;
    url: string;
    thumbnail: string;
    eventId: string;
    eventName: string;
    cachedAt: Date;
    size: number;
}

interface QueuedUpload {
    id: string;
    file: File;
    eventId: string;
    eventName: string;
    queuedAt: Date;
    retryCount: number;
    status: 'queued' | 'uploading' | 'failed' | 'completed';
}

interface OfflineContextType {
    isOnline: boolean;
    cachedPhotos: OfflinePhoto[];
    queuedUploads: QueuedUpload[];
    cachePhoto: (photo: OfflinePhoto) => Promise<void>;
    removeCachedPhoto: (photoId: string) => Promise<void>;
    queueUpload: (upload: Omit<QueuedUpload, 'id' | 'queuedAt' | 'retryCount' | 'status'>) => Promise<void>;
    retryUpload: (uploadId: string) => Promise<void>;
    clearCompletedUploads: () => void;
}

const OfflineContext = createContext<OfflineContextType | null>(null);

export const useOffline = () => {
    const context = useContext(OfflineContext);
    if (!context) {
        throw new Error('useOffline must be used within OfflineProvider');
    }
    return context;
};

interface OfflineProviderProps {
    children: React.ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [cachedPhotos, setCachedPhotos] = useState<OfflinePhoto[]>([]);
    const [queuedUploads, setQueuedUploads] = useState<QueuedUpload[]>([]);

    // Monitor online status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Load cached data on mount
    useEffect(() => {
        loadCachedData();
    }, []);

    // Auto-retry uploads when coming online
    useEffect(() => {
        if (isOnline && queuedUploads.some(u => u.status === 'failed')) {
            retryFailedUploads();
        }
    }, [isOnline, queuedUploads]);

    const loadCachedData = async () => {
        try {
            // Load cached photos from IndexedDB or localStorage
            const cached = localStorage.getItem('offline_cached_photos');
            if (cached) {
                setCachedPhotos(JSON.parse(cached));
            }

            // Load queued uploads
            const queued = localStorage.getItem('offline_queued_uploads');
            if (queued) {
                setQueuedUploads(JSON.parse(queued));
            }
        } catch (error) {
            console.error('Failed to load cached data:', error);
        }
    };

    const saveCachedData = async () => {
        try {
            localStorage.setItem('offline_cached_photos', JSON.stringify(cachedPhotos));
            localStorage.setItem('offline_queued_uploads', JSON.stringify(queuedUploads));
        } catch (error) {
            console.error('Failed to save cached data:', error);
        }
    };

    useEffect(() => {
        saveCachedData();
    }, [cachedPhotos, queuedUploads]);

    const cachePhoto = async (photo: OfflinePhoto) => {
        // Check storage quota
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const usedPercent = (estimate.usage || 0) / (estimate.quota || 1) * 100;

            if (usedPercent > 90) {
                throw new Error('Storage quota exceeded. Please clear some cached photos.');
            }
        }

        // Cache the photo blob if possible
        try {
            const response = await fetch(photo.url);
            const blob = await response.blob();

            // Store in Cache API for better performance
            if ('caches' in window) {
                const cache = await caches.open('photo-cache-v1');
                await cache.put(photo.url, new Response(blob));
            }
        } catch (error) {
            console.warn('Failed to cache photo blob:', error);
        }

        setCachedPhotos(prev => [...prev, photo]);
    };

    const removeCachedPhoto = async (photoId: string) => {
        setCachedPhotos(prev => prev.filter(p => p.id !== photoId));

        // Remove from Cache API
        if ('caches' in window) {
            try {
                const cache = await caches.open('photo-cache-v1');
                const cachedPhotos = await cache.keys();
                const photoToRemove = cachedPhotos.find(req => req.url.includes(photoId));
                if (photoToRemove) {
                    await cache.delete(photoToRemove);
                }
            } catch (error) {
                console.warn('Failed to remove from cache:', error);
            }
        }
    };

    const queueUpload = async (uploadData: Omit<QueuedUpload, 'id' | 'queuedAt' | 'retryCount' | 'status'>) => {
        const newUpload: QueuedUpload = {
            ...uploadData,
            id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            queuedAt: new Date(),
            retryCount: 0,
            status: 'queued'
        };

        setQueuedUploads(prev => [...prev, newUpload]);

        // Try to upload immediately if online
        if (isOnline) {
            processUpload(newUpload);
        }
    };

    const processUpload = async (upload: QueuedUpload) => {
        setQueuedUploads(prev => prev.map(u =>
            u.id === upload.id ? { ...u, status: 'uploading' } : u
        ));

        try {
            // Simulate upload process - replace with actual API call
            await new Promise(resolve => setTimeout(resolve, 2000));

            setQueuedUploads(prev => prev.map(u =>
                u.id === upload.id ? { ...u, status: 'completed' } : u
            ));
        } catch (error) {
            setQueuedUploads(prev => prev.map(u =>
                u.id === upload.id
                    ? { ...u, status: 'failed', retryCount: u.retryCount + 1 }
                    : u
            ));
        }
    };

    const retryUpload = async (uploadId: string) => {
        const upload = queuedUploads.find(u => u.id === uploadId);
        if (upload && isOnline) {
            await processUpload(upload);
        }
    };

    const retryFailedUploads = async () => {
        const failedUploads = queuedUploads.filter(u => u.status === 'failed');
        for (const upload of failedUploads) {
            await processUpload(upload);
        }
    };

    const clearCompletedUploads = () => {
        setQueuedUploads(prev => prev.filter(u => u.status !== 'completed'));
    };

    const contextValue: OfflineContextType = {
        isOnline,
        cachedPhotos,
        queuedUploads,
        cachePhoto,
        removeCachedPhoto,
        queueUpload,
        retryUpload,
        clearCompletedUploads
    };

    return (
        <OfflineContext.Provider value={contextValue}>
            {children}
        </OfflineContext.Provider>
    );
}

export function OfflineStatusIndicator() {
    const { isOnline, queuedUploads } = useOffline();
    const pendingUploads = queuedUploads.filter(u => u.status === 'queued' || u.status === 'failed');

    if (isOnline && pendingUploads.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <Card className="shadow-lg">
                <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                        {isOnline ? (
                            <Wifi className="h-4 w-4 text-green-500" />
                        ) : (
                            <WifiOff className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm font-medium">
                            {isOnline ? 'Online' : 'Offline'}
                        </span>
                        {pendingUploads.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                                {pendingUploads.length} pending
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export function OfflineManager() {
    const {
        isOnline,
        cachedPhotos,
        queuedUploads,
        removeCachedPhoto,
        retryUpload,
        clearCompletedUploads
    } = useOffline();

    const [showManager, setShowManager] = useState(false);

    const pendingUploads = queuedUploads.filter(u => u.status === 'queued' || u.status === 'uploading');
    const failedUploads = queuedUploads.filter(u => u.status === 'failed');
    const completedUploads = queuedUploads.filter(u => u.status === 'completed');

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getTotalCacheSize = () => {
        return cachedPhotos.reduce((total, photo) => total + photo.size, 0);
    };

    if (!showManager) {
        return (
            <Button
                variant="outline"
                size="sm"
                onClick={() => setShowManager(true)}
                className="fixed bottom-4 left-4 z-50 shadow-lg"
            >
                {isOnline ? (
                    <Wifi className="h-4 w-4 mr-2" />
                ) : (
                    <WifiOff className="h-4 w-4 mr-2" />
                )}
                Offline Manager
            </Button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        {isOnline ? (
                            <Wifi className="h-5 w-5 text-green-500" />
                        ) : (
                            <WifiOff className="h-5 w-5 text-red-500" />
                        )}
                        Offline Manager
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowManager(false)}>
                        ×
                    </Button>
                </CardHeader>

                <CardContent className="space-y-6 overflow-y-auto">
                    {/* Connection Status */}
                    <Alert className={isOnline ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                        {isOnline ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <AlertDescription>
                            {isOnline
                                ? 'You are online. Uploads will be processed automatically.'
                                : 'You are offline. Photos will be uploaded when connection is restored.'
                            }
                        </AlertDescription>
                    </Alert>

                    {/* Upload Queue */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Upload Queue</h3>
                            {completedUploads.length > 0 && (
                                <Button variant="outline" size="sm" onClick={clearCompletedUploads}>
                                    Clear Completed
                                </Button>
                            )}
                        </div>

                        {queuedUploads.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No uploads in queue</p>
                        ) : (
                            <div className="space-y-2">
                                {queuedUploads.map((upload) => (
                                    <div key={upload.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${upload.status === 'completed' ? 'bg-green-100 text-green-600' :
                                                    upload.status === 'failed' ? 'bg-red-100 text-red-600' :
                                                        upload.status === 'uploading' ? 'bg-blue-100 text-blue-600' :
                                                            'bg-gray-100 text-gray-600'
                                                }`}>
                                                {upload.status === 'completed' ? <CheckCircle className="h-4 w-4" /> :
                                                    upload.status === 'failed' ? <AlertCircle className="h-4 w-4" /> :
                                                        upload.status === 'uploading' ? <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> :
                                                            <CloudUpload className="h-4 w-4" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{upload.file.name}</p>
                                                <p className="text-xs text-gray-600">
                                                    {upload.eventName} • {formatFileSize(upload.file.size)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {upload.status === 'failed' && isOnline && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => retryUpload(upload.id)}
                                                >
                                                    Retry
                                                </Button>
                                            )}
                                            <Badge variant={
                                                upload.status === 'completed' ? 'default' :
                                                    upload.status === 'failed' ? 'destructive' :
                                                        upload.status === 'uploading' ? 'secondary' :
                                                            'outline'
                                            }>
                                                {upload.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Cached Photos */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Cached Photos</h3>
                            <div className="text-sm text-gray-600">
                                {cachedPhotos.length} photos • {formatFileSize(getTotalCacheSize())}
                            </div>
                        </div>

                        {cachedPhotos.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No cached photos</p>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {cachedPhotos.map((photo) => (
                                    <div key={photo.id} className="relative group">
                                        <img
                                            src={photo.thumbnail}
                                            alt="Cached photo"
                                            className="w-full aspect-square object-cover rounded-lg"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => removeCachedPhoto(photo.id)}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                        <div className="absolute bottom-2 left-2">
                                            <Badge variant="secondary" className="text-xs">
                                                {photo.eventName}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}