/**
 * GalleryHeader - Top section of photo gallery
 * Contains tabs, refresh button, and connection status
 */

'use client';

import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GalleryTabs, TabType } from './GalleryTabs';
import { ConnectionStatus } from './ConnectionStatus';

interface GalleryHeaderProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    counts: {
        approved: number;
        pending: number;
        rejected: number;
        hidden: number;
    };
    onRefresh: () => void;
    isGuest: boolean;
    photoCount: number;
    wsConnected?: boolean;
    wsAuthenticated?: boolean;
    selectedCount?: number;
    onDeselectAll?: () => void;
}

export function GalleryHeader({
    activeTab,
    onTabChange,
    counts,
    onRefresh,
    isGuest,
    photoCount,
    wsConnected = false,
    wsAuthenticated = false,
    selectedCount = 0,
    onDeselectAll,
}: GalleryHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar max-w-[calc(100vw-120px)] sm:max-w-none">
                    <GalleryTabs
                        activeTab={activeTab}
                        onTabChange={onTabChange}
                        counts={counts}
                        isGuest={isGuest}
                    />
                </div>

                <Button variant="outline" size="icon" onClick={onRefresh} title="Refresh photos">
                    <RefreshCcw className="h-4 w-4" />
                </Button>

                <div className="text-xs text-gray-500 hidden sm:block">{photoCount} photos loaded</div>
            </div>

            {/* Selection Actions */}
            <div className="flex items-center gap-2">
                {selectedCount > 0 && onDeselectAll && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDeselectAll}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        Deselect All
                    </Button>
                )}

                {/* Connection Status (Dev Mode Only) */}
                {process.env.NODE_ENV === 'development' && (
                    <ConnectionStatus isConnected={wsConnected} isAuthenticated={wsAuthenticated} />
                )}
            </div>
        </div>
    );
}
