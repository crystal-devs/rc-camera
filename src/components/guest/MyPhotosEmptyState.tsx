import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Sparkles, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MyPhotosEmptyStateProps {
    onFindMe: () => void;
}

export const MyPhotosEmptyState: React.FC<MyPhotosEmptyStateProps> = ({ onFindMe }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12"
        >
            {/* Icon Stack */}
            <div className="relative mb-8">
                <motion.div
                    animate={{
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.05, 1]
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center"
                >
                    <UserCircle className="w-16 h-16 text-blue-500 dark:text-blue-400" />
                </motion.div>

                {/* Floating sparkle */}
                <motion.div
                    animate={{
                        y: [-5, 5, -5],
                        x: [-5, 5, -5],
                        rotate: [0, 180, 360]
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute -top-2 -right-2"
                >
                    <Sparkles className="w-6 h-6 text-yellow-400" />
                </motion.div>
            </div>

            {/* Heading */}
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 text-center">
                Find Your Photos
            </h3>

            {/* Description */}
            <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8">
                Upload a quick selfie and our AI will instantly find all the photos you appear in.
                No more scrolling through hundreds of images!
            </p>

            {/* CTA Button */}
            <Button
                onClick={onFindMe}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
                <Camera className="w-5 h-5 mr-2" />
                Upload Selfie to Find Me
            </Button>

            {/* Feature Highlights */}
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl">
                <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">⚡</span>
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">
                        Instant Results
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        AI scans the entire gallery in seconds
                    </p>
                </div>

                <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">🔒</span>
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">
                        Private & Secure
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Your selfie is not stored or shared
                    </p>
                </div>

                <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">✨</span>
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">
                        Accurate Matching
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Advanced facial recognition technology
                    </p>
                </div>
            </div>
        </motion.div>
    );
};
