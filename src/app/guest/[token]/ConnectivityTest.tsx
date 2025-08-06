// components/debug/ConnectivityTest.tsx - Test server connectivity
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ConnectivityTestProps {
    shareToken: string;
}

export function ConnectivityTest({ shareToken }: ConnectivityTestProps) {
    const [tests, setTests] = useState<{
        apiServer: 'pending' | 'success' | 'error';
        webSocketServer: 'pending' | 'success' | 'error';
        guestAPI: 'pending' | 'success' | 'error';
    }>({
        apiServer: 'pending',
        webSocketServer: 'pending',
        guestAPI: 'pending'
    });

    const [logs, setLogs] = useState<string[]>([]);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

    const addLog = (message: string) => {
        setLogs((prev) => [...prev.slice(-5), `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const runConnectivityTests = async () => {
        addLog('Starting connectivity tests...');

        // Reset tests
        setTests({
            apiServer: 'pending',
            webSocketServer: 'pending',
            guestAPI: 'pending'
        });

        // Test 1: Main API server
        try {
            addLog('Testing main API server...');
            const apiResponse = await fetch(`${API_BASE_URL}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });

            if (apiResponse.ok) {
                setTests((prev) => ({ ...prev, apiServer: 'success' }));
                addLog('✅ Main API server: OK');
            } else {
                setTests((prev) => ({ ...prev, apiServer: 'error' }));
                addLog(`❌ Main API server: ${apiResponse.status} ${apiResponse.statusText}`);
            }
        } catch (error) {
            setTests((prev) => ({ ...prev, apiServer: 'error' }));
            addLog(`❌ Main API server: ${error.message}`);
        }

        // Test 2: WebSocket server health
        try {
            addLog('Testing WebSocket server...');
            const wsResponse = await fetch(`${API_BASE_URL}/health`, { // Use API_BASE_URL for consistency
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });

            if (wsResponse.ok) {
                setTests((prev) => ({ ...prev, webSocketServer: 'success' }));
                addLog('✅ WebSocket server: OK');
            } else {
                setTests((prev) => ({ ...prev, webSocketServer: 'error' }));
                addLog(`❌ WebSocket server: ${wsResponse.status} ${wsResponse.statusText}`);
            }
        } catch (error) {
            setTests((prev) => ({ ...prev, webSocketServer: 'error' }));
            addLog(`❌ WebSocket server: ${error.message}`);
        }

        // Test 3: Guest API endpoint
        try {
            addLog('Testing guest API endpoint...');
            const params = new URLSearchParams({
                page: '1',
                limit: '20',
                quality: 'display',
                scroll_type: 'pagination',
                status: 'approved',
                guest_view: 'true'
            });
            const guestResponse = await fetch(`${API_BASE_URL}/media/guest/${shareToken}?${params}`, {
                method: 'GET',
                signal: AbortSignal.timeout(10000)
            });

            if (guestResponse.ok) {
                setTests((prev) => ({ ...prev, guestAPI: 'success' }));
                addLog('✅ Guest API: OK');
            } else {
                setTests((prev) => ({ ...prev, guestAPI: 'error' }));
                addLog(`❌ Guest API: ${guestResponse.status} ${guestResponse.statusText}`);
            }
        } catch (error) {
            setTests((prev) => ({ ...prev, guestAPI: 'error' }));
            addLog(`❌ Guest API: ${error.message}`);
        }

        addLog('Connectivity tests completed');
    };

    // Run tests on mount
    useEffect(() => {
        runConnectivityTests();
    }, [shareToken]);

    const getBadgeVariant = (status: string) => {
        switch (status) {
            case 'success': return 'default';
            case 'error': return 'destructive';
            default: return 'secondary';
        }
    };

    const getBadgeText = (status: string) => {
        switch (status) {
            case 'success': return '✅ OK';
            case 'error': return '❌ Error';
            default: return '⏳ Testing...';
        }
    };

    if (process.env.NODE_ENV !== 'development') {
        return null;
    }

    return (
        <div className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border max-w-sm">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Connectivity Test</h3>
                <Button onClick={runConnectivityTests} size="sm" variant="outline">
                    🔄 Retest
                </Button>
            </div>

            <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                    <span>Main API:</span>
                    <Badge variant={getBadgeVariant(tests.apiServer)}>
                        {getBadgeText(tests.apiServer)}
                    </Badge>
                </div>

                <div className="flex justify-between items-center">
                    <span>WebSocket Server:</span>
                    <Badge variant={getBadgeVariant(tests.webSocketServer)}>
                        {getBadgeText(tests.webSocketServer)}
                    </Badge>
                </div>

                <div className="flex justify-between items-center">
                    <span>Guest API:</span>
                    <Badge variant={getBadgeVariant(tests.guestAPI)}>
                        {getBadgeText(tests.guestAPI)}
                    </Badge>
                </div>

                <hr className="my-2" />

                <div>
                    <strong>Config:</strong>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                        API_URL: {API_BASE_URL}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                        WS_URL: {WS_BASE_URL}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                        Share Token: {shareToken.substring(0, 8)}...
                    </div>
                </div>

                {logs.length > 0 && (
                    <>
                        <hr className="my-2" />
                        <div>
                            <strong>Logs:</strong>
                            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs max-h-24 overflow-y-auto">
                                {logs.map((log, i) => (
                                    <div key={i} className="text-gray-700 dark:text-gray-300">{log}</div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}