// app/wall/[shareToken]/components/ProgressBar.tsx

import React, { useEffect, useState } from 'react';

interface ProgressBarProps {
    duration: number;
}

export const ProgressBar = React.memo<ProgressBarProps>(({ duration }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        setProgress(0);
        const interval = setInterval(() => {
            setProgress(prev => {
                const increment = 100 / (duration / 100);
                const newProgress = prev + increment;
                return newProgress >= 100 ? 0 : newProgress;
            });
        }, 100);

        return () => clearInterval(interval);
    }, [duration]);

    return (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-800">
            <div
                className="h-full bg-green-400 transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
});

ProgressBar.displayName = 'ProgressBar';

