/**
 * FloatingActionBar - Bottom floating action bar for bulk operations
 */

'use client';

import { XIcon, CheckIcon, EyeOffIcon, TrashIcon, DownloadIcon, CheckCheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserPermissions } from '../../utils/permissionUtils';
import { TabType } from '../GalleryHeader/GalleryTabs';

interface FloatingActionBarProps {
    selectedCount: number;
    /** Number of photos currently loaded in the grid (for the Select-all toggle) */
    totalCount?: number;
    onDeselect: () => void;
    onSelectAll?: () => void;
    onApprove?: () => void;
    onReject?: () => void;
    onHide?: () => void;
    onDownload?: () => void;
    onDelete?: () => void;
    permissions: UserPermissions;
    currentTab: TabType;
}

export function FloatingActionBar({
    selectedCount,
    totalCount,
    onDeselect,
    onSelectAll,
    onApprove,
    onReject,
    onHide,
    onDownload,
    onDelete,
    permissions,
    currentTab,
}: FloatingActionBarProps) {
    if (selectedCount === 0) return null;

    const allSelected = totalCount !== undefined && selectedCount >= totalCount && totalCount > 0;

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-2xl bg-background/80 backdrop-blur-md border shadow-lg rounded-full px-6 py-3 flex items-center justify-between animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-muted"
                        onClick={onDeselect}
                    >
                        <XIcon className="h-4 w-4" />
                    </Button>
                    <span className="font-medium text-sm">{selectedCount} selected</span>
                    {onSelectAll && !allSelected && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onSelectAll}
                            className="h-8 rounded-full text-xs text-muted-foreground hover:text-foreground"
                            title="Select all loaded photos"
                        >
                            <CheckCheckIcon className="h-4 w-4 sm:mr-1.5" />
                            <span className="hidden sm:inline">
                                Select all{totalCount ? ` ${totalCount}` : ''}
                            </span>
                        </Button>
                    )}
                </div>

                <div className="h-6 w-px bg-border" />

                <div className="flex items-center gap-1">
                    {permissions.moderate && (
                        <>
                            {currentTab !== 'approved' && onApprove && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onApprove}
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                    title="Approve Selected"
                                >
                                    <CheckIcon className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Approve</span>
                                </Button>
                            )}
                            {currentTab !== 'rejected' && onReject && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onReject}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    title="Reject Selected"
                                >
                                    <XIcon className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Reject</span>
                                </Button>
                            )}
                            {currentTab !== 'hidden' && onHide && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onHide}
                                    className="text-gray-600 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    title="Hide Selected"
                                >
                                    <EyeOffIcon className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Hide</span>
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1">
                {permissions.download && onDownload && (
                    <Button variant="ghost" size="icon" onClick={onDownload} title="Download Selected">
                        <DownloadIcon className="h-4 w-4" />
                    </Button>
                )}
                {permissions.delete && onDelete && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onDelete}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete Selected"
                    >
                        <TrashIcon className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
