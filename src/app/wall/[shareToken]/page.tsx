// app/wall/[shareToken]/page.tsx - Fixed with Real-time Image Count

'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
    PhotoWallItem,
    PhotoWallSettings,
    PhotoWallResponse
} from '@/services/apis/photowall.api';
import { getPhotoWallData } from '@/services/apis/photowall.api';
import { useSimpleWebSocket } from '@/hooks/useWebSocket';
import { toast } from 'sonner';
import { LoadingScreen } from '@/components/photo-wall/LoadingScreen';
import { Header } from '@/components/photo-wall/Header';
import { SlideshowDisplay } from '@/components/photo-wall/DisplayModes/SlideshowDisplay';
import { ErrorScreen } from '@/components/photo-wall/ErrorScreen';
import { GridDisplay } from '@/components/photo-wall/DisplayModes/GridDisplay';
import { Controls } from '@/components/photo-wall/Controls';
import { ProgressBar } from '@/components/photo-wall/ProgressBar';
import { SettingsSheet } from '@/components/photo-wall/SettingsSheet';
import { Button } from '@/components/ui/button';

export default function PhotoWallPage() {
    const params = useParams();
    const shareToken = params?.shareToken as string;

    // State
    const [wallData, setWallData] = useState<PhotoWallResponse['data'] | null>(null);
    const [images, setImages] = useState<PhotoWallItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [displayMode, setDisplayMode] = useState<'slideshow' | 'grid' | 'mosaic'>('slideshow');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showControls, setShowControls] = useState(true);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    // 🚀 NEW: Real-time stats tracking
    const [realtimeStats, setRealtimeStats] = useState({
        totalImages: 0,
        viewerCount: 0,
        lastUpdated: Date.now()
    });

    // Refs to prevent infinite loops
    const slideIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastRefreshTimeRef = useRef<number>(0);
    const isRefreshingRef = useRef<boolean>(false);
    const initialLoadCompleteRef = useRef<boolean>(false);

    // Real-time activity state
    const [realtimeActivity, setRealtimeActivity] = useState<{
        isNewMediaUploading: boolean;
        isProcessingComplete: boolean;
        isMediaBeingRemoved: boolean;
        newMediaCount: number;
        removedMediaCount: number;
        lastActivityTime: number;
    }>({
        isNewMediaUploading: false,
        isProcessingComplete: false,
        isMediaBeingRemoved: false,
        newMediaCount: 0,
        removedMediaCount: 0,
        lastActivityTime: Date.now()
    });

    // 🚀 USE SAME WEBSOCKET AS GUEST PAGE
    const webSocket = useSimpleWebSocket(shareToken, shareToken, 'photowall');

    // 🚀 ENHANCED: Handle new media with count updates
    const handleNewMediaForPhotoWall = useCallback((data: any) => {
        console.log('📺 New media received in photo wall:', data);

        // Show toast notification
        toast.success(`📺 New photo from ${data.uploadedBy?.name || 'someone'}!`);

        // Create photo wall compatible item
        const newItem: PhotoWallItem = {
            id: data.mediaId || data.media?.id || `temp_${Date.now()}`,
            imageUrl: data.media?.url || data.media?.thumbnailUrl || '',
            uploaderName: wallData?.settings?.showUploaderNames ? (data.uploadedBy?.name || 'Anonymous') : null,
            uploadedAt: data.uploadedAt || new Date().toISOString(),
            isNew: true
        };

        // Add to slideshow with insertion strategy
        setImages(prevImages => {
            const newImages = [...prevImages];
            const strategy = wallData?.settings?.newImageInsertion || 'after_current';

            switch (strategy) {
                case 'immediate':
                    newImages.unshift(newItem);
                    setCurrentIndex(0);
                    break;
                case 'after_current':
                    const insertIndex = Math.min(currentIndex + 3, newImages.length);
                    newImages.splice(insertIndex, 0, newItem);
                    break;
                case 'end_of_queue':
                    newImages.push(newItem);
                    break;
                case 'smart_priority':
                    const smartIndex = Math.min(
                        currentIndex + Math.floor(Math.random() * 5) + 1,
                        newImages.length
                    );
                    newImages.splice(smartIndex, 0, newItem);
                    break;
                default:
                    newImages.push(newItem);
            }

            // 🚀 UPDATE REAL-TIME STATS
            setRealtimeStats(prev => ({
                ...prev,
                totalImages: newImages.length,
                lastUpdated: Date.now()
            }));

            return newImages;
        });

        // Update activity state
        setRealtimeActivity(prev => ({
            ...prev,
            isNewMediaUploading: true,
            newMediaCount: prev.newMediaCount + 1,
            lastActivityTime: Date.now()
        }));

        // Reset activity state after delay
        setTimeout(() => {
            setRealtimeActivity(prev => ({
                ...prev,
                isNewMediaUploading: false
            }));
        }, 3000);

        // Remove "new" flag after delay
        setTimeout(() => {
            setImages(prevImages =>
                prevImages.map(img =>
                    img.id === newItem.id ? { ...img, isNew: false } : img
                )
            );
        }, 10000);
    }, [currentIndex, wallData?.settings]);

    const handleProcessingComplete = useCallback((data: any) => {
        console.log('📺 Processing completed in photo wall:', data);

        // Update the image with higher quality version
        setImages(prevImages =>
            prevImages.map(img => {
                if (img.id === data.mediaId) {
                    return {
                        ...img,
                        imageUrl: data.variants?.display || data.variants?.full || img.imageUrl
                    };
                }
                return img;
            })
        );

        // Update activity state
        setRealtimeActivity(prev => ({
            ...prev,
            isProcessingComplete: true,
            lastActivityTime: Date.now()
        }));

        // Reset activity state after delay
        setTimeout(() => {
            setRealtimeActivity(prev => ({
                ...prev,
                isProcessingComplete: false
            }));
        }, 2000);

        toast.info('✨ Higher quality version ready!');
    }, []);

    // 🚀 ENHANCED: Handle media removal with count updates
    const handleMediaRemoved = useCallback((data: any) => {
        console.log('📺 Media removed in photo wall:', data);

        // Remove from slideshow
        setImages(prevImages => {
            const newImages = prevImages.filter(img => img.id !== data.mediaId);
            
            // Adjust current index if needed
            if (currentIndex >= newImages.length && newImages.length > 0) {
                setCurrentIndex(newImages.length - 1);
            }

            // 🚀 UPDATE REAL-TIME STATS
            setRealtimeStats(prev => ({
                ...prev,
                totalImages: newImages.length,
                lastUpdated: Date.now()
            }));
            
            return newImages;
        });

        // Update activity state
        setRealtimeActivity(prev => ({
            ...prev,
            isMediaBeingRemoved: true,
            removedMediaCount: prev.removedMediaCount + 1,
            lastActivityTime: Date.now()
        }));

        // Reset activity state after delay
        setTimeout(() => {
            setRealtimeActivity(prev => ({
                ...prev,
                isMediaBeingRemoved: false
            }));
        }, 3000);

        toast.warning(`📺 Photo removed: ${data.guest_context?.reason_display || 'Content moderated'}`);
    }, [currentIndex]);

    // 🚀 NEW: Handle event stats updates for real-time counts
    const handleEventStatsUpdate = useCallback((data: any) => {
        console.log('📺 Event stats update in photo wall:', data);
        
        if (data.stats) {
            setRealtimeStats(prev => ({
                ...prev,
                totalImages: data.stats.approved || data.stats.totalMedia || prev.totalImages,
                lastUpdated: Date.now()
            }));
        }
    }, []);

    // 🚀 NEW: Handle room stats for viewer count
    const handleRoomStats = useCallback((data: any) => {
        console.log('📺 Room stats update:', data);
        
        setRealtimeStats(prev => ({
            ...prev,
            viewerCount: data.guestCount || data.total || 0,
            lastUpdated: Date.now()
        }));
    }, []);

    // 🚀 SAME EVENT LISTENERS AS GUEST PAGE
    useEffect(() => {
        if (!webSocket.socket) return;

        // Use the SAME events as guest page
        webSocket.socket.on('new_media_uploaded', handleNewMediaForPhotoWall);
        webSocket.socket.on('media_processing_complete', handleProcessingComplete);
        webSocket.socket.on('event_stats_update', handleEventStatsUpdate);
        webSocket.socket.on('guest_media_removed', handleMediaRemoved);
        webSocket.socket.on('media_removed', handleMediaRemoved);
        webSocket.socket.on('room_user_counts', handleRoomStats);

        // Cleanup
        return () => {
            webSocket.socket?.off('new_media_uploaded', handleNewMediaForPhotoWall);
            webSocket.socket?.off('media_processing_complete', handleProcessingComplete);
            webSocket.socket?.off('event_stats_update', handleEventStatsUpdate);
            webSocket.socket?.off('guest_media_removed', handleMediaRemoved);
            webSocket.socket?.off('media_removed', handleMediaRemoved);
            webSocket.socket?.off('room_user_counts', handleRoomStats);
        };
    }, [webSocket.socket, handleNewMediaForPhotoWall, handleProcessingComplete, handleEventStatsUpdate, handleMediaRemoved, handleRoomStats]);

    // FIXED: Prevent infinite API calls with throttling
    const refreshPhotoWallData = useCallback(async (reason: string = 'manual') => {
        const now = Date.now();
        
        // Throttle API calls - minimum 5 seconds between calls
        if (now - lastRefreshTimeRef.current < 5000 && initialLoadCompleteRef.current) {
            console.log(`🚫 Refresh throttled (reason: ${reason})`);
            return;
        }

        if (isRefreshingRef.current) {
            console.log(`🚫 Already refreshing (reason: ${reason})`);
            return;
        }

        isRefreshingRef.current = true;
        lastRefreshTimeRef.current = now;

        try {
            console.log(`🔄 Refreshing photo wall data (reason: ${reason})`);
            
            const response = await getPhotoWallData(shareToken, {
                quality: 'large',
                maxItems: 100,
            });

            if (response.status && response.data) {
                const newImageCount = response.data.items.length;
                const currentImageCount = images.length;

                // Only update if there's actually a change
                if (newImageCount !== currentImageCount || reason === 'initial' || reason === 'manual') {
                    console.log(`📸 Updating images: ${currentImageCount} → ${newImageCount}`);
                    setImages(response.data.items);

                    // 🚀 UPDATE REAL-TIME STATS
                    setRealtimeStats(prev => ({
                        ...prev,
                        totalImages: newImageCount,
                        lastUpdated: Date.now()
                    }));

                    if (newImageCount > currentImageCount && initialLoadCompleteRef.current) {
                        toast.info(`Added ${newImageCount - currentImageCount} new photos`);
                    }
                }

                // Update wall data if needed
                setWallData(prevData => {
                    if (!prevData || JSON.stringify(prevData.settings) !== JSON.stringify(response.data.settings)) {
                        return response.data;
                    }
                    return prevData;
                });
            }
        } catch (error) {
            console.error(`❌ Error refreshing data (reason: ${reason}):`, error);
        } finally {
            isRefreshingRef.current = false;
        }
    }, [shareToken, images.length]);

    // FIXED: Initial data loading (only once)
    const loadWallData = useCallback(async () => {
        if (!shareToken || initialLoadCompleteRef.current) return;

        try {
            setIsLoading(true);
            setError(null);

            const response = await getPhotoWallData(shareToken, {
                quality: 'large',
                maxItems: 100,
            });

            if (response.status && response.data) {
                setWallData(response.data);
                setImages(response.data.items);
                setSessionId(response.data.sessionId);
                setDisplayMode(response.data.settings.displayMode);
                setIsPlaying(response.data.settings.autoAdvance);

                // 🚀 INITIALIZE REAL-TIME STATS
                setRealtimeStats({
                    totalImages: response.data.items.length,
                    viewerCount: 0,
                    lastUpdated: Date.now()
                });
                
                initialLoadCompleteRef.current = true;
                toast.success(`📺 ${response.data.items.length} photos ready to display`);
            } else {
                throw new Error(response.error?.message || 'Failed to load photo wall');
            }
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [shareToken]);

    // Connection status monitoring
    useEffect(() => {
        console.log('🔌 WebSocket Status:', { 
            isConnected: webSocket.isConnected, 
            isAuthenticated: webSocket.isAuthenticated 
        });

        if (webSocket.isConnected && webSocket.isAuthenticated) {
            toast.success('📺 Connected to live updates', { duration: 2000 });
        } else if (webSocket.isConnected && !webSocket.isAuthenticated) {
            toast.info('🔄 Connecting...', { duration: 2000 });
        } else if (!webSocket.isConnected) {
            toast.error('📺 Disconnected from live updates', { duration: 2000 });
        }
    }, [webSocket.isConnected, webSocket.isAuthenticated]);

    // Optimized periodic refresh (only when needed)
    useEffect(() => {
        if (!shareToken || !initialLoadCompleteRef.current) return;

        const refreshInterval = setInterval(async () => {
            // Only refresh if disconnected from real-time updates
            if (!webSocket.isConnected || !webSocket.isAuthenticated) {
                await refreshPhotoWallData('periodic_fallback');
            }
        }, 60000); // Every 60 seconds

        return () => clearInterval(refreshInterval);
    }, [shareToken, webSocket.isConnected, webSocket.isAuthenticated, refreshPhotoWallData]);

    // Slideshow control with proper cleanup
    const startSlideshow = useCallback(() => {
        if (slideIntervalRef.current) {
            clearInterval(slideIntervalRef.current);
        }

        const duration = wallData?.settings?.transitionDuration;
        if (duration && images.length > 0) {
            slideIntervalRef.current = setInterval(() => {
                setCurrentIndex(prevIndex => (prevIndex + 1) % images.length);
            }, duration);
        }
    }, [wallData?.settings?.transitionDuration, images.length]);

    const stopSlideshow = useCallback(() => {
        if (slideIntervalRef.current) {
            clearInterval(slideIntervalRef.current);
            slideIntervalRef.current = null;
        }
    }, []);

    // Navigation functions
    const nextSlide = useCallback(() => {
        if (images.length === 0) return;
        setCurrentIndex(prevIndex => (prevIndex + 1) % images.length);
    }, [images.length]);

    const prevSlide = useCallback(() => {
        if (images.length === 0) return;
        setCurrentIndex(prevIndex => prevIndex > 0 ? prevIndex - 1 : images.length - 1);
    }, [images.length]);

    const togglePlayPause = useCallback(() => setIsPlaying(prev => !prev), []);
    
    const toggleGrid = useCallback(() => {
        setDisplayMode(prevMode => {
            const newMode = prevMode === 'slideshow' ? 'grid' : 'slideshow';
            if (newMode === 'slideshow') setIsPlaying(true);
            return newMode;
        });
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }, []);

    const handleLocalSettingsChange = useCallback((newSettings: PhotoWallSettings) => {
        setWallData(prevWallData => {
            if (!prevWallData) return null;
            return { ...prevWallData, settings: newSettings };
        });
        setDisplayMode(newSettings.displayMode);
        setIsPlaying(newSettings.autoAdvance);
        toast.success('Settings updated successfully');
    }, []);

    // Effect dependencies and cleanup
    useEffect(() => {
        if (shareToken && !initialLoadCompleteRef.current) {
            loadWallData();
        }
    }, [shareToken, loadWallData]);

    useEffect(() => {
        if (wallData?.settings?.isEnabled && 
            displayMode === 'slideshow' && 
            isPlaying && 
            wallData?.settings?.autoAdvance) {
            startSlideshow();
        } else {
            stopSlideshow();
        }
        return stopSlideshow;
    }, [displayMode, isPlaying, wallData?.settings?.autoAdvance, wallData?.settings?.isEnabled, startSlideshow, stopSlideshow]);

    // Auto-hide controls
    useEffect(() => {
        let hideTimeout: NodeJS.Timeout;

        const resetHideTimer = () => {
            if (hideTimeout) clearTimeout(hideTimeout);
            setShowControls(true);
            hideTimeout = setTimeout(() => setShowControls(false), 3000);
        };

        const handleMouseMove = () => resetHideTimer();
        const handleKeyDown = () => resetHideTimer();

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('keydown', handleKeyDown);
        resetHideTimer();

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('keydown', handleKeyDown);
            if (hideTimeout) clearTimeout(hideTimeout);
        };
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePlayPause();
                    break;
                case 'ArrowLeft':
                    prevSlide();
                    break;
                case 'ArrowRight':
                    nextSlide();
                    break;
                case 'KeyG':
                    toggleGrid();
                    break;
                case 'KeyF':
                    toggleFullscreen();
                    break;
                case 'KeyS':
                    setShowSettings(prev => !prev);
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [togglePlayPause, prevSlide, nextSlide, toggleGrid, toggleFullscreen]);

    // Manual refresh handler
    const handleManualRefresh = useCallback(async () => {
        await refreshPhotoWallData('manual');
    }, [refreshPhotoWallData]);

    if (isLoading) return <LoadingScreen />;
    if (error) return <ErrorScreen error={error} onRetry={loadWallData} />;
    if (!wallData) return <ErrorScreen error="No photo wall data available" onRetry={loadWallData} />;

    if (!wallData.settings.isEnabled) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="text-6xl mb-4">📷</div>
                    <h2 className="text-xl font-semibold mb-2">Photo Wall Disabled</h2>
                    <p className="text-slate-400 mb-6">The event organizer has temporarily disabled the photo wall display.</p>
                    <Button onClick={handleManualRefresh} className="bg-green-600 hover:bg-green-700">
                        Check Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white overflow-hidden">
            <Header
                wallData={wallData}
                displayMode={displayMode}
                isConnected={webSocket.isConnected}
                isAuthenticated={webSocket.isAuthenticated}
                imageCount={realtimeStats.totalImages} // 🚀 USE REAL-TIME COUNT
                viewerCount={realtimeStats.viewerCount} // 🚀 USE REAL-TIME COUNT
                showControls={showControls}
                onToggleSettings={() => setShowSettings(true)}
                onRefresh={handleManualRefresh}
            />

            {/* Real-time activity indicator */}
            {webSocket.isAuthenticated && (
                realtimeActivity.isNewMediaUploading ||
                realtimeActivity.isProcessingComplete ||
                realtimeActivity.isMediaBeingRemoved
            ) && (
                <div className="absolute top-20 left-4 right-4 z-30">
                    <div className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-lg p-3 text-center">
                        {realtimeActivity.isNewMediaUploading && (
                            <div className="text-blue-400 animate-pulse">
                                📤 New photos uploading...
                            </div>
                        )}
                        {realtimeActivity.isProcessingComplete && (
                            <div className="text-green-400 animate-pulse">
                                ✨ High-quality versions ready!
                            </div>
                        )}
                        {realtimeActivity.isMediaBeingRemoved && (
                            <div className="text-orange-400 animate-pulse">
                                🗑️ Photos being removed...
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="absolute inset-0 h-full w-full">
                {displayMode === 'slideshow' ? (
                    <SlideshowDisplay
                        images={images}
                        currentIndex={currentIndex}
                        showUploaderNames={wallData.settings.showUploaderNames}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <GridDisplay
                            images={images}
                            mode={displayMode}
                            showUploaderNames={wallData.settings.showUploaderNames}
                        />
                    </div>
                )}
            </div>

            <Controls
                showControls={showControls}
                isPlaying={isPlaying}
                onPrevSlide={prevSlide}
                onTogglePlayPause={togglePlayPause}
                onNextSlide={nextSlide}
                onToggleGrid={toggleGrid}
                onToggleFullscreen={toggleFullscreen}
                onToggleSettings={() => setShowSettings(true)}
            />

            {displayMode === 'slideshow' && isPlaying && wallData?.settings?.transitionDuration && (
                <ProgressBar duration={wallData.settings.transitionDuration} />
            )}

            <SettingsSheet
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                settings={wallData.settings}
                shareToken={shareToken}
                onSettingsChange={handleLocalSettingsChange}
            />
        </div>
    );
}