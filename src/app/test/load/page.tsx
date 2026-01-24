
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function LoadTestPage() {
    const [token, setToken] = useState('');
    const router = useRouter();

    const handleGo = () => {
        if (token) {
            router.push(`/guest/${token}`);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Load Test Launcher</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Event Share Token</label>
                        <Input
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            placeholder="Enter token (e.g. evt_123456)"
                        />
                    </div>
                    <Button className="w-full" onClick={handleGo} disabled={!token}>
                        Launch Verification
                    </Button>

                    <div className="text-xs text-gray-500 mt-4 p-4 bg-gray-100 rounded">
                        <p className="font-semibold">How to get token:</p>
                        <p>1. Check backend logs for "SHARE TOKEN"</p>
                        <p>2. Or run: <code>node scripts/get-token-clean.js</code> in rc-api</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
