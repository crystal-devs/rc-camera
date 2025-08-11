// components/AdminNotificationBadge.tsx - Shows new upload notifications for admins

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, BellRing, Upload, Users } from 'lucide-react';
import { useSimpleWebSocket } from '@/hooks/useWebSocket';

interface NotificationItem {
    id: string;
    type: 'single_upload' | 'bulk_upload';
    uploaderName: string;
    count: number;
    timestamp: Date;
    requiresApproval: boolean;
}

interface AdminNotificationBadgeProps {
    eventId: string;
    onNavigateToPending?: () => void;
    className?: string;
}

export function AdminNotificationBadge({
    eventId,
    onNavigateToPending,
    className = ''
}: AdminNotificationBadgeProps) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDetails, setShowDetails] = useState(false);

    const webSocket = useSimpleWebSocket(eventId, undefined, 'admin');

    // Listen for admin notifications
    useEffect(() => {
        if (!webSocket.socket || !webSocket.isAuthenticated) return;

        const handleAdminNotification = (payload: any) => {
            console.log('📤 Admin notification received:', payload);

            const newNotification: NotificationItem = {
                id: `${payload.uploadedBy.id}_${Date.now()}`,
                type: payload.bulkUpload ? 'bulk_upload' : 'single_upload',
                uploaderName: payload.uploadedBy.name,
                count: payload.bulkUpload?.totalCount || 1,
                timestamp: new Date(payload.uploadedAt),
                requiresApproval: payload.requiresApproval
            };

            setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); // Keep last 10
            setUnreadCount(prev => prev + 1);
        };

        const handleUploadSummary = (payload: any) => {
            console.log('📊 Upload summary received:', payload);
            // Could update existing notification or add summary info
        };

        webSocket.socket.on('admin_new_upload_notification', handleAdminNotification);
        webSocket.socket.on('guest_upload_summary', handleUploadSummary);

        return () => {
            webSocket.socket?.off('admin_new_upload_notification', handleAdminNotification);
            webSocket.socket?.off('guest_upload_summary', handleUploadSummary);
        };
    }, [webSocket.socket, webSocket.isAuthenticated]);

    const clearNotifications = useCallback(() => {
        setUnreadCount(0);
        setShowDetails(false);
    }, []);

    const handleBadgeClick = useCallback(() => {
        if (unreadCount > 0) {
            setShowDetails(!showDetails);
        }
    }, [unreadCount, showDetails]);

    const handleNavigateToPending = useCallback(() => {
        clearNotifications();
        onNavigateToPending?.();
    }, [clearNotifications, onNavigateToPending]);

    // Auto-clear notifications after 30 seconds
    useEffect(() => {
        if (unreadCount > 0) {
            const timer = setTimeout(() => {
                setUnreadCount(0);
            }, 30000);

            return () => clearTimeout(timer);
        }
    }, [unreadCount]);

    if (!webSocket.isAuthenticated || unreadCount === 0) {
        return null;
    }

    return (
        <div className={`relative ${className}`}>
            {/* Notification Badge */}
            <Button
                variant="outline"
                size="sm"
                onClick={handleBadgeClick}
                className="relative"
            >
                {unreadCount > 0 ? (
                    <BellRing className="h-4 w-4 text-orange-600" />
                ) : (
                    <Bell className="h-4 w-4" />
                )}

                {unreadCount > 0 && (
                    <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                )}

                <span className="ml-2 hidden sm:inline">
                    {unreadCount > 0 ? `${unreadCount} new upload${unreadCount > 1 ? 's' : ''}` : 'No new uploads'}
                </span>
            </Button>

            {/* Notification Dropdown */}
            {showDetails && notifications.length > 0 && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium text-sm">Recent Uploads</h3>
                            <div className="flex gap-2">
                                {onNavigateToPending && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleNavigateToPending}
                                        className="text-xs"
                                    >
                                        Review All
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={clearNotifications}
                                    className="text-xs"
                                >
                                    Clear
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                        {notifications.slice(0, 5).map((notification) => (
                            <div
                                key={notification.id}
                                className="p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-1">
                                        {notification.type === 'bulk_upload' ? (
                                            <Upload className="h-4 w-4 text-blue-600" />
                                        ) : (
                                            <Upload className="h-4 w-4 text-green-600" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-3 w-3 text-gray-400" />
                                            <span className="text-sm font-medium truncate">
                                                {notification.uploaderName}
                                            </span>
                                        </div>

                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            Uploaded {notification.count} photo{notification.count > 1 ? 's' : ''}
                                            {notification.requiresApproval && (
                                                <span className="ml-1 text-orange-600">• Needs approval</span>
                                            )}
                                        </p>

                                        <p className="text-xs text-gray-500 mt-1">
                                            {notification.timestamp.toLocaleTimeString()}
                                        </p>
                                    </div>

                                    {notification.requiresApproval && (
                                        <Badge variant="outline" className="text-xs">
                                            Pending
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {notifications.length > 5 && (
                        <div className="p-2 text-center border-t border-gray-200 dark:border-gray-700">
                            <span className="text-xs text-gray-500">
                                {notifications.length - 5} more upload{notifications.length - 5 > 1 ? 's' : ''}...
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Simple version for just showing a count
export function SimpleNotificationBadge({
    eventId,
    className = ''
}: {
    eventId: string;
    className?: string;
}) {
    const [count, setCount] = useState(0);
    const webSocket = useSimpleWebSocket(eventId, undefined, 'admin');

    useEffect(() => {
        if (!webSocket.socket || !webSocket.isAuthenticated) return;

        const handleNotification = (payload: any) => {
            const uploadCount = payload.bulkUpload?.totalCount || 1;
            setCount(prev => prev + uploadCount);
        };

        webSocket.socket.on('admin_new_upload_notification', handleNotification);

        return () => {
            webSocket.socket?.off('admin_new_upload_notification', handleNotification);
        };
    }, [webSocket.socket, webSocket.isAuthenticated]);

    // Auto-clear after 30 seconds
    useEffect(() => {
        if (count > 0) {
            const timer = setTimeout(() => setCount(0), 30000);
            return () => clearTimeout(timer);
        }
    }, [count]);

    if (!webSocket.isAuthenticated || count === 0) {
        return null;
    }

    return (
        <Badge variant="destructive" className={`${className}`}>
            +{count} new
        </Badge>
    );
}