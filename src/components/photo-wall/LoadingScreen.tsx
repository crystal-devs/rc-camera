// app/wall/[shareToken]/components/LoadingScreen.tsx

import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-green-400" />
                <h2 className="text-xl font-semibold mb-2">Loading Photo Wall</h2>
                <p className="text-slate-400">Preparing your real-time gallery...</p>
            </div>
        </div>
    );
};

