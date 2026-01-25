import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FindMePromptBannerProps {
    isVisible: boolean;
    totalPhotos: number;
    onFindMe: () => void;
    onDismiss: () => void;
}

export const FindMePromptBanner: React.FC<FindMePromptBannerProps> = ({
    isVisible,
    totalPhotos,
    onFindMe,
    onDismiss
}) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 w-full max-w-2xl px-4"
                >
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl p-6 relative overflow-hidden">
                        {/* Animated background pattern */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.8),transparent_50%)]" />
                        </div>

                        {/* Content */}
                        <div className="relative flex items-center gap-4">
                            {/* Icon */}
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                                className="flex-shrink-0"
                            >
                                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                    <Sparkles className="w-7 h-7 text-white" />
                                </div>
                            </motion.div>

                            {/* Text */}
                            <div className="flex-1">
                                <h3 className="text-white font-bold text-lg mb-1">
                                    Find yourself instantly! ✨
                                </h3>
                                <p className="text-white/90 text-sm">
                                    Upload a quick selfie to see only your photos from {totalPhotos} total images
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={onFindMe}
                                    className="bg-white text-blue-600 hover:bg-white/90 font-semibold px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                                >
                                    <Camera className="w-4 h-4 mr-2" />
                                    Find Me
                                </Button>
                                <button
                                    onClick={onDismiss}
                                    className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                                    aria-label="Dismiss"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Bottom accent line with animation */}
                        <motion.div
                            className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-yellow-300 to-pink-300"
                            initial={{ width: '0%' }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 3, ease: 'easeInOut' }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
