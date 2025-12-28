import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Share2, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Event } from '@/types/events';

interface GuestHeaderProps {
    eventDetails: Event | null;
    themeColors: any;
    onDownload: () => void;
    isDownloading: boolean;
    totalPhotos: number;
}

export function GuestHeader({ eventDetails, themeColors, onDownload, isDownloading, totalPhotos }: GuestHeaderProps) {
    if (!eventDetails) return null;

    return (
        <header
            data-gallery-section
            className="sticky top-0 left-0 right-0 z-50 transition-colors duration-300"
            style={{
                backgroundColor: themeColors.custom_secondary || themeColors.secondary || '#ffffff',
                color: themeColors.text || '#000000'
            }}
        >
            <div className="mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="font-semibold text-lg truncate max-w-[200px] sm:max-w-md uppercase tracking-wide opacity-90">
                        {eventDetails.title}
                    </h2>

                    {/* Placeholder for Album Tabs - Future Dynamic Implementation */}
                    <div className="hidden md:flex items-center space-x-1 border-l border-black/10 dark:border-white/10 ml-4 pl-4">
                        <Button variant="ghost" size="sm" className="font-medium bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10">All Photos</Button>
                        <Button variant="ghost" size="sm" className="opacity-60 hover:opacity-100">Highlights</Button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs opacity-60 hidden sm:inline-block mr-2">
                        {totalPhotos} Photos
                    </span>
                    <Button
                        onClick={onDownload}
                        disabled={isDownloading || totalPhotos === 0}
                        size="sm"
                        className="shadow-sm"
                        style={{
                            // Optional: Use accent color for button if available, else standard
                            // backgroundColor: themeColors.accent 
                        }}
                    >
                        {isDownloading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4 sm:mr-2" />
                        )}
                        <span className="hidden sm:inline">Download All</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
