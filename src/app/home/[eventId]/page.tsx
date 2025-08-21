import { Badge } from '@/components/ui/badge';
import { useSimpleWebSocket } from '@/hooks/useWebSocket';
import React, { useCallback, useEffect, useState } from 'react'

function Home() {


    const [roomStats, setRoomStats] = useState<{
        eventId?: string;
        guestCount?: number;
        adminCount?: number;
        total?: number;
    }>({});
    // WebSocket connection
    const webSocket = useSimpleWebSocket(eventId, shareToken, 'admin');

    // Room stats handler
    const handleRoomStats = useCallback((payload: any) => {
        console.log('📊 Room stats update:', payload);
        setRoomStats(payload);
    }, []);

    // WebSocket effects
    useEffect(() => {
        if (!webSocket.socket) return;
        webSocket.socket.on('room_user_counts', handleRoomStats);
        return () => webSocket.socket?.off('room_user_counts', handleRoomStats);
    }, [webSocket.socket, handleRoomStats]);

    // Room Stats Display
    const RoomStatsDisplay = memo(({ roomStats }: { roomStats: any }) => {
        if (!roomStats.adminCount && !roomStats.guestCount) return null;

        return (
            <Badge variant="secondary" className="text-xs">
                {roomStats.guestCount > 0 && (
                    <span>👥 {roomStats.guestCount} guest{roomStats.guestCount !== 1 ? 's' : ''}</span>
                )}
                {roomStats.adminCount > 0 && (
                    <span className={roomStats.guestCount > 0 ? 'ml-2' : ''}>
                        🔧 {roomStats.adminCount} admin{roomStats.adminCount !== 1 ? 's' : ''}
                    </span>
                )}
                {roomStats.total && roomStats.total !== (roomStats.guestCount + roomStats.adminCount) && (
                    <span className="ml-1 text-gray-500">
                        ({roomStats.total} total)
                    </span>
                )}
            </Badge>
        );
    });


    return (
        <div>Home
            <RoomStatsDisplay roomStats={roomStats} />

        </div>
    )
}

export default Home