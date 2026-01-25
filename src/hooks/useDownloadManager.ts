import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
    createGuestBulkDownload,
    getDownloadStatus,
    downloadZipFile
} from '@/services/apis/bulk-download.api';

interface DownloadProgress {
    status: string;
    progress: number;
    totalFiles: number;
}

interface UseDownloadManagerOptions {
    shareToken: string;
    eventId: string;
    eventTitle?: string;
}

/**
 * Hook to manage bulk download functionality with polling and progress tracking.
 * Follows Vercel best practices:
 * - Uses refs instead of state for polling to avoid stale closures
 * - Properly cleans up intervals on unmount
 * - Stable callback references
 */
export function useDownloadManager({
    shareToken,
    eventId,
    eventTitle = 'event'
}: UseDownloadManagerOptions) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);

    // Use refs to avoid stale closures in polling function
    const downloadJobIdRef = useRef<string | null>(null);
    const isDownloadingRef = useRef(false);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Sync state to refs
    useEffect(() => {
        isDownloadingRef.current = isDownloading;
    }, [isDownloading]);

    // Cleanup intervals on unmount
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const stopPolling = useCallback(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const pollDownloadStatus = useCallback((jobId: string) => {
        const POLL_INTERVAL_MS = 2000; // 2 seconds
        const POLL_TIMEOUT_MS = 600000; // 10 minutes

        const poll = async () => {
            if (!isDownloadingRef.current) {
                stopPolling();
                return;
            }

            try {
                const response = await getDownloadStatus(jobId);

                if (response.data) {
                    const { status, progress, totalFiles, downloadUrl } = response.data;
                    const currentStatus = status || (response.data as any).jobStatus || 'processing';

                    setDownloadProgress({
                        status: currentStatus,
                        progress: progress || 0,
                        totalFiles: totalFiles || 0
                    });

                    if (currentStatus === 'completed' && downloadUrl) {
                        stopPolling();
                        setIsDownloading(false);
                        downloadJobIdRef.current = null;
                        setDownloadProgress(null);

                        toast.success('Download ready! Starting download...', { duration: 2000 });

                        setTimeout(async () => {
                            try {
                                await downloadZipFile(downloadUrl, `${eventTitle}_photos.zip`);
                                toast.success('Download completed!', { duration: 3000 });
                            } catch (downloadError) {
                                toast.error('Download failed. Please try again.');
                            }
                        }, 100);

                        return;
                    } else if (currentStatus === 'failed') {
                        stopPolling();
                        setIsDownloading(false);
                        downloadJobIdRef.current = null;
                        setDownloadProgress(null);
                        toast.error('Download failed. Please try again.');
                        return;
                    }
                } else {
                    stopPolling();
                    setIsDownloading(false);
                    downloadJobIdRef.current = null;
                    setDownloadProgress(null);
                    toast.error('Failed to check download status');
                }
            } catch (error) {
                stopPolling();
                setIsDownloading(false);
                downloadJobIdRef.current = null;
                setDownloadProgress(null);
                toast.error('Failed to check download status');
            }
        };

        // Start polling immediately
        poll();

        // Set up interval for subsequent polls
        pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

        // Cleanup after timeout
        timeoutRef.current = setTimeout(() => {
            stopPolling();
            if (isDownloadingRef.current) {
                setIsDownloading(false);
                downloadJobIdRef.current = null;
                setDownloadProgress(null);
                toast.error('Download timed out. Please try again.');
            }
        }, POLL_TIMEOUT_MS);
    }, [eventTitle, stopPolling]);

    const startDownload = useCallback(async () => {
        if (!eventId) {
            toast.error('Event not loaded yet');
            return;
        }

        try {
            setIsDownloading(true);
            toast.info('Starting bulk download...', { duration: 2000 });

            const response = await createGuestBulkDownload(
                shareToken,
                eventId,
                'original'
            );

            if (response.status && response.data?.jobId) {
                const jobId = response.data.jobId;
                downloadJobIdRef.current = jobId;
                toast.success('Download started! Processing photos...', { duration: 3000 });

                pollDownloadStatus(jobId);
            } else {
                throw new Error(response.message || 'Failed to start download');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to start download');
            setIsDownloading(false);
        }
    }, [shareToken, eventId, pollDownloadStatus]);

    const cancelDownload = useCallback(() => {
        stopPolling();
        setIsDownloading(false);
        downloadJobIdRef.current = null;
        setDownloadProgress(null);
        toast.info('Download cancelled');
    }, [stopPolling]);

    return {
        isDownloading,
        downloadProgress,
        downloadJobId: downloadJobIdRef.current,
        startDownload,
        cancelDownload
    };
}
