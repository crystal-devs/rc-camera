// app/wall/[shareToken]/components/Controls.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Grid3X3,
    Maximize,
    Settings
} from 'lucide-react';

interface ControlsProps {
    showControls: boolean;
    isPlaying: boolean;
    onPrevSlide: () => void;
    onTogglePlayPause: () => void;
    onNextSlide: () => void;
    onToggleGrid: () => void;
    onToggleFullscreen: () => void;
    onToggleSettings: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
    showControls,
    isPlaying,
    onPrevSlide,
    onTogglePlayPause,
    onNextSlide,
    onToggleGrid,
    onToggleFullscreen,
    onToggleSettings
}) => {
    return (
        <AnimatePresence>
            {showControls && (
                <motion.div
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50"
                >
                    <Card className="bg-black/70 backdrop-blur-lg border-slate-700">
                        <div className="p-3 flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onPrevSlide}
                                className="text-white hover:bg-white/20"
                            >
                                <SkipBack className="h-4 w-4" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onTogglePlayPause}
                                className="text-white hover:bg-white/20"
                            >
                                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onNextSlide}
                                className="text-white hover:bg-white/20"
                            >
                                <SkipForward className="h-4 w-4" />
                            </Button>

                            <div className="w-px h-6 bg-slate-600 mx-1" />

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onToggleGrid}
                                className="text-white hover:bg-white/20"
                            >
                                <Grid3X3 className="h-4 w-4" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onToggleFullscreen}
                                className="text-white hover:bg-white/20"
                            >
                                <Maximize className="h-4 w-4" />
                            </Button>

                            <div className="w-px h-6 bg-slate-600 mx-1" />

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onToggleSettings}
                                className="text-white hover:bg-white/20"
                            >
                                <Settings className="h-4 w-4" />
                            </Button>
                        </div>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    );
};