/**
 * GalleryTabs - Tab navigation for photo gallery
 */

'use client';

import { cn } from '@/lib/utils';

export type TabType = 'approved' | 'pending' | 'rejected' | 'hidden';

interface Tab {
    id: TabType;
    label: string;
    count: number;
}

interface GalleryTabsProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    counts: {
        approved: number;
        pending: number;
        rejected: number;
        hidden: number;
    };
    isGuest: boolean;
}

export function GalleryTabs({ activeTab, onTabChange, counts, isGuest }: GalleryTabsProps) {
    // Hide tabs for guests
    if (isGuest) {
        return null;
    }

    const tabs: Tab[] = [
        { id: 'approved', label: 'Published', count: counts.approved },
        { id: 'pending', label: 'Pending', count: counts.pending },
        { id: 'rejected', label: 'Rejected', count: counts.rejected },
        { id: 'hidden', label: 'Hidden', count: counts.hidden },
    ];

    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar max-w-[calc(100vw-120px)] sm:max-w-none">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                        'flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                        activeTab === tab.id
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                >
                    {tab.label}
                    <span
                        className={cn(
                            'text-xs px-1.5 py-0.5 rounded-full',
                            activeTab === tab.id
                                ? 'bg-primary-foreground/20 text-primary-foreground'
                                : 'bg-background/50 text-muted-foreground'
                        )}
                    >
                        {tab.count}
                    </span>
                </button>
            ))}
        </div>
    );
}
