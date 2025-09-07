// app/wall/[shareToken]/components/ErrorScreen.tsx

import React from 'react';
import { Button } from '@/components/ui/button';

interface ErrorScreenProps {
    error: string;
    onRetry: () => void;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ error, onRetry }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white flex items-center justify-center">
            <div className="text-center max-w-md">
                <div className="text-6xl mb-4">❌</div>
                <h2 className="text-xl font-semibold mb-2">Unable to Load Photo Wall</h2>
                <p className="text-slate-400 mb-6">{error}</p>
                <Button onClick={onRetry} className="bg-green-600 hover:bg-green-700">
                    Try Again
                </Button>
            </div>
        </div>
    );
};