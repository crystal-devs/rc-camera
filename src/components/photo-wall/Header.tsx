// app/wall/[shareToken]/components/Header.tsx - Updated with real-time support

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Settings, Users, RefreshCw } from 'lucide-react';
import { PhotoWallResponse } from '@/services/apis/photowall.api';

interface HeaderProps {
    wallData: PhotoWallResponse['data'];
    displayMode: string;
    isConnected: boolean;
    isAuthenticated: boolean;
    imageCount: number;
    viewerCount: number;
    showControls: boolean;
    onToggleSettings: () => void;
    onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    wallData,
    displayMode,
    isConnected,
    isAuthenticated,
    imageCount,
    viewerCount,
    showControls,
    onToggleSettings,
    onRefresh
}) => {
    return (
        <AnimatePresence>
            {showControls && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute top-4 left-4 right-4 z-50"
                >
                    <Card className="bg-black/70 backdrop-blur-lg border-slate-700">
                        <div className="p-4 flex justify-between items-center">
                            <div>
                                <h1 className="text-xl font-bold text-white">{wallData?.eventTitle || 'Photo Wall'}</h1>
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    <Badge variant="secondary" className="capitalize">
                                        {displayMode}
                                    </Badge>
                                    
                                    {/* 🚀 Enhanced connection status */}
                                    {isConnected && isAuthenticated ? (
                                        <Badge variant="outline" className="text-green-400 border-green-400">
                                            🟢 Live Updates
                                        </Badge>
                                    ) : isConnected ? (
                                        <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                                            🟡 Connecting...
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-red-400 border-red-400">
                                            🔴 Offline
                                        </Badge>
                                    )}
                                    
                                    {!wallData?.settings.isEnabled && (
                                        <Badge variant="destructive">
                                            Disabled
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div className="text-right space-y-1">
                                    {/* 🚀 Real-time viewer count */}
                                    {viewerCount > 0 && (
                                        <div className="flex items-center gap-1 text-green-400 font-semibold text-sm">
                                            <Users className="h-4 w-4" />
                                            {viewerCount} viewer{viewerCount !== 1 ? 's' : ''}
                                        </div>
                                    )}
                                    
                                    {/* 🚀 Real-time image count with live indicator */}
                                    <div className="flex items-center gap-1 text-slate-300 text-sm">
                                        <Camera className="h-4 w-4" />
                                        <span className="font-medium">{imageCount}</span>
                                        <span>photo{imageCount !== 1 ? 's' : ''}</span>
                                        {isConnected && isAuthenticated && (
                                            <span className="ml-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Live count" />
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex gap-2">
                                    {/* 🚀 Manual refresh button */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onRefresh}
                                        className="text-white hover:bg-white/20"
                                        title="Refresh photos"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                    
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onToggleSettings}
                                        className="text-white hover:bg-white/20"
                                        title="Settings"
                                    >
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    );
};