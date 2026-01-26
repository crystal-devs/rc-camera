import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, UserSearch, Upload, Sparkles } from 'lucide-react';
import { Event } from '@/types/events';
import { cn } from '@/lib/utils';

interface GuestHeaderProps {
    eventDetails: Event | null;
    themeColors: any;
    onDownload: () => void;
    isDownloading: boolean;
    totalPhotos: number;
    onFindMe: () => void;
    // New props for tabs
    activeTab: 'all' | 'my_photos' | 'highlights';
    onTabChange: (tab: 'all' | 'my_photos' | 'highlights') => void;
    hasMatches: boolean;
    // New props for upload and connection
    onUpload?: () => void;
    connectionStatus?: React.ReactNode;
}

export function GuestHeader({
    eventDetails,
    themeColors,
    onDownload,
    isDownloading,
    totalPhotos,
    onFindMe,
    activeTab,
    onTabChange,
    hasMatches,
    onUpload,
    connectionStatus
}: GuestHeaderProps) {
    if (!eventDetails) return null;

    return (
        <header
            data-gallery-section
            className="sticky top-0 left-0 right-0 z-[999] transition-colors duration-300 shadow-sm backdrop-blur-md bg-opacity-90"
            style={{
                backgroundColor: themeColors.custom_secondary || themeColors.secondary || '#ffffff',
                color: themeColors.text || '#000000'
            }}
        >
            <div className="mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
                    <h2 className="font-semibold text-lg truncate max-w-[150px] sm:max-w-xs uppercase tracking-wide opacity-90 hidden md:block">
                        {eventDetails.title}
                    </h2>

                    {/* Integrated Tabs */}
                    <div className="flex items-center space-x-1 md:border-l md:border-black/10 dark:md:border-white/10 md:ml-4 md:pl-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onTabChange('all')}
                            className={cn(
                                "font-medium transition-all",
                                activeTab === 'all'
                                    ? "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 opacity-100"
                                    : "opacity-60 hover:opacity-100 hover:bg-black/5"
                            )}
                        >
                            All Photos
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onTabChange('my_photos')}
                            className={cn(
                                "font-medium transition-all flex items-center gap-1.5",
                                activeTab === 'my_photos'
                                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 opacity-100"
                                    : "opacity-60 hover:opacity-100 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            )}
                        >
                            {/* Simple logic: If matches exist, show check/count, else search icon */}
                            {hasMatches ? (
                                <UserSearch className="h-3.5 w-3.5" />
                            ) : (
                                <UserSearch className="h-3.5 w-3.5" />
                            )}
                            My Photos
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onTabChange('highlights')}
                            className={cn(
                                "font-medium transition-all flex items-center gap-1.5",
                                activeTab === 'highlights'
                                    ? "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50 opacity-100"
                                    : "opacity-60 hover:opacity-100 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            )}
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            Highlights
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2 pl-2">
                    {/* Connection Status (Desktop) */}
                    <div className="hidden md:block">
                        {connectionStatus}
                    </div>

                    <span className="text-xs opacity-60 hidden sm:inline-block mr-2">
                        {totalPhotos} Photos
                    </span>

                    {/* Find Me Button - Only if not on My Photos tab and no matches */}
                    {!hasMatches && activeTab !== 'my_photos' && (
                        <Button
                            onClick={onFindMe}
                            variant="outline"
                            size="sm"
                            className="mr-1 border-blue-200 hover:bg-blue-50 text-blue-700 hidden sm:flex"
                        >
                            <UserSearch className="h-4 w-4 mr-2" />
                            Find Me
                        </Button>
                    )}

                    {onUpload && (
                        <Button
                            onClick={onUpload}
                            size="sm"
                            className="hidden md:flex items-center gap-1.5 bg-[var(--primary-color)] text-[var(--primary-foreground)] hover:brightness-110 mr-1"
                        >
                            <Upload className="w-4 h-4" />
                            Add
                        </Button>
                    )}

                    <Button
                        onClick={onDownload}
                        disabled={isDownloading || totalPhotos === 0}
                        size="sm"
                        className="shadow-sm"
                    >
                        {isDownloading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4 sm:mr-2" />
                        )}
                        <span className="hidden sm:inline">Download</span>
                        <span className="sm:hidden"><Download className="h-4 w-4" /></span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
