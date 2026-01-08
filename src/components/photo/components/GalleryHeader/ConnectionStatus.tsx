/**
 * ConnectionStatus - WebSocket connection status indicator
 */

'use client';

import { memo } from 'react';
import { WifiIcon, WifiOffIcon } from 'lucide-react';

interface ConnectionStatusProps {
    isConnected: boolean;
    isAuthenticated: boolean;
}

export const ConnectionStatus = memo(function ConnectionStatus({
    isConnected,
    isAuthenticated,
}: ConnectionStatusProps) {
    if (!isConnected) {
        return (
            <div className="flex items-center gap-2 text-xs text-red-600">
                <WifiOffIcon className="h-3 w-3" />
                <span>Disconnected</span>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex items-center gap-2 text-xs text-yellow-600">
                <WifiIcon className="h-3 w-3" />
                <span>Connecting...</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 text-xs text-green-600">
            <WifiIcon className="h-3 w-3" />
            <span>Connected</span>
        </div>
    );
});
