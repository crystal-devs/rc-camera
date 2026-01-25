import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Upload, Loader2, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { loginWithFace, loginWithGlobalIdentity } from '@/services/apis/guest.api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSecureAuth } from '@/contexts/SecureAuthContext';

interface SelfieUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    onSearchResults: (results: any[]) => void;
    token?: string;
    socket?: any; // WebSocket instance for progress updates
}

interface ScanProgress {
    current: number;
    total: number;
    matchCount: number;
    status: 'idle' | 'uploading' | 'indexing' | 'scanning' | 'complete' | 'error';
}

export const SelfieUploadModal: React.FC<SelfieUploadModalProps> = ({
    isOpen,
    onClose,
    eventId,
    onSearchResults,
    token,
    socket
}) => {
    const { user } = useSecureAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [scanProgress, setScanProgress] = useState<ScanProgress>({
        current: 0,
        total: 0,
        matchCount: 0,
        status: 'idle'
    });

    // Listen for WebSocket progress updates
    useEffect(() => {
        if (!socket || !isOpen) return;

        const handleProgress = (data: { current: number; total: number; matchCount: number }) => {
            setScanProgress(prev => ({
                ...prev,
                current: data.current,
                total: data.total,
                matchCount: data.matchCount,
                status: 'scanning'
            }));
        };

        socket.on('face:scan:progress', handleProgress);

        return () => {
            socket.off('face:scan:progress', handleProgress);
        };
    }, [socket, isOpen]);

    // Auto-login logic
    const handleGlobalLogin = async () => {
        setIsUploading(true);
        setScanProgress({ current: 0, total: 0, matchCount: 0, status: 'uploading' });

        try {
            const { token: sessionToken, isNewIdentity, message } = await loginWithGlobalIdentity(eventId);
            if (sessionToken) {
                onSearchResults([{ token: sessionToken, isNewIdentity }]);
                toast.success("Welcome back! " + message);
                onClose();
            }
        } catch (error) {
            toast.error("Auto-login failed. Please try a selfie.");
            setScanProgress(prev => ({ ...prev, status: 'error' }));
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setScanProgress({ current: 0, total: 0, matchCount: 0, status: 'idle' });
        }
    };

    const handleSearch = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        setScanProgress({ current: 0, total: 0, matchCount: 0, status: 'uploading' });

        try {
            // Perform Face Login
            const { token, isNewIdentity, message } = await loginWithFace(selectedFile, eventId);

            // Show indexing status
            setScanProgress(prev => ({ ...prev, status: 'indexing' }));
            await new Promise(resolve => setTimeout(resolve, 500));

            // Start scanning (progress will come via WebSocket)
            setScanProgress(prev => ({ ...prev, status: 'scanning' }));

            // Simulate completion after a delay if no WebSocket updates
            setTimeout(() => {
                if (scanProgress.status === 'scanning') {
                    setScanProgress(prev => ({ ...prev, status: 'complete' }));
                }
            }, 3000);

            // Save Token
            if (token) {
                onSearchResults([{ token, isNewIdentity }]);
                setScanProgress(prev => ({ ...prev, status: 'complete' }));

                // Show success message but keep modal open to show results
                toast.success(message);
            }
        } catch (error: any) {
            console.error("Login failed", error);
            toast.error("Failed to process selfie. Please try again.");
            setScanProgress(prev => ({ ...prev, status: 'error' }));
        } finally {
            setIsUploading(false);
        }
    };

    const handleViewMatches = () => {
        onClose();
        // Parent will handle switching to my_photos tab
    };

    const clearSelection = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setScanProgress({ current: 0, total: 0, matchCount: 0, status: 'idle' });
    };

    const handleClose = () => {
        clearSelection();
        setScanProgress({ current: 0, total: 0, matchCount: 0, status: 'idle' });
        onClose();
    };

    if (!isOpen) return null;

    const progressPercent = scanProgress.total > 0
        ? Math.round((scanProgress.current / scanProgress.total) * 100)
        : 0;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                onClick={handleClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl"
                >
                    {/* Header */}
                    <div className="relative p-4 text-center border-b border-zinc-100 dark:border-zinc-800">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {scanProgress.status === 'complete' && scanProgress.matchCount > 0
                                ? '🎉 Photos Found!'
                                : 'Find My Photos'}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {scanProgress.status === 'scanning'
                                ? `Scanning gallery...`
                                : scanProgress.status === 'complete' && scanProgress.matchCount > 0
                                    ? `We found ${scanProgress.matchCount} photo${scanProgress.matchCount > 1 ? 's' : ''} of you!`
                                    : 'Upload a selfie to find your moments'}
                        </p>
                        <button
                            onClick={handleClose}
                            className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 flex flex-col items-center gap-6">

                        {/* Global Identity Option */}
                        {user?.aws_face_id && !previewUrl && scanProgress.status === 'idle' && (
                            <div className="w-full bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl flex flex-col items-center gap-3 border border-indigo-100 dark:border-indigo-800">
                                <div className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
                                    Identity Found
                                </div>
                                <Button
                                    onClick={handleGlobalLogin}
                                    disabled={isUploading}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    {isUploading ? <Loader2 className="animate-spin" /> : "Use My Saved Face"}
                                </Button>
                                <div className="text-xs text-center text-gray-500">
                                    OR upload a new selfie below
                                </div>
                            </div>
                        )}

                        {/* Results Preview */}
                        {scanProgress.status === 'complete' && scanProgress.matchCount > 0 && (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-full bg-green-50 dark:bg-green-900/20 p-6 rounded-2xl border-2 border-green-200 dark:border-green-800 text-center"
                            >
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                                </div>
                                <h4 className="text-xl font-bold text-green-900 dark:text-green-100 mb-2">
                                    {scanProgress.matchCount} Photo{scanProgress.matchCount > 1 ? 's' : ''} Found!
                                </h4>
                                <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                                    Ready to view your personalized gallery
                                </p>
                                <Button
                                    onClick={handleViewMatches}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white text-base py-6 rounded-xl"
                                >
                                    View My Photos
                                </Button>
                            </motion.div>
                        )}

                        {/* No matches found */}
                        {scanProgress.status === 'complete' && scanProgress.matchCount === 0 && (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-full bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl border-2 border-amber-200 dark:border-amber-800 text-center"
                            >
                                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                                </div>
                                <h4 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-2">
                                    No Matches Found
                                </h4>
                                <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                                    Try a different photo or check back later as more photos are added
                                </p>
                                <Button
                                    onClick={clearSelection}
                                    variant="outline"
                                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
                                >
                                    Try Another Photo
                                </Button>
                            </motion.div>
                        )}

                        {/* Preview/Upload Flow */}
                        {scanProgress.status !== 'complete' && (
                            <>
                                {!previewUrl ? (
                                    <label className="w-full aspect-square max-w-[240px] rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-zinc-50 dark:bg-zinc-900/50 group">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="user"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                            <Camera size={28} />
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Take a Selfie</span>
                                            <p className="text-[10px] text-zinc-400 mt-1">or upload from gallery</p>
                                        </div>
                                    </label>
                                ) : (
                                    <div className="relative w-48 h-48">
                                        <img
                                            src={previewUrl}
                                            alt="Selfie preview"
                                            className="w-full h-full object-cover rounded-full border-4 border-white dark:border-zinc-800 shadow-lg relative z-10"
                                        />

                                        {/* Scanning Progress Overlay */}
                                        {(scanProgress.status === 'uploading' || scanProgress.status === 'indexing' || scanProgress.status === 'scanning') && (
                                            <>
                                                <div className="absolute inset-0 rounded-full overflow-hidden z-20">
                                                    <motion.div
                                                        className="w-full h-1 bg-green-500/80 shadow-[0_0_15px_rgba(34,197,94,0.8)]"
                                                        animate={{ top: ['0%', '100%', '0%'] }}
                                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                        style={{ position: 'absolute' }}
                                                    />
                                                    <div className="absolute inset-0 bg-green-500/10" />
                                                </div>
                                                <motion.div
                                                    className="absolute -inset-4 border-2 border-green-500 rounded-full z-0"
                                                    animate={{ scale: [1, 1.2], opacity: [0.8, 0] }}
                                                    transition={{ duration: 1.5, repeat: Infinity }}
                                                />
                                            </>
                                        )}

                                        {!isUploading && scanProgress.status === 'idle' && (
                                            <button
                                                onClick={clearSelection}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors z-30"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Progress Bar */}
                                {scanProgress.status === 'scanning' && (
                                    <div className="w-full space-y-2">
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                            <motion.div
                                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progressPercent}%` }}
                                                transition={{ duration: 0.3 }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                            <span>Scanning {scanProgress.current} of {scanProgress.total} photos...</span>
                                            <span className="font-semibold">{progressPercent}%</span>
                                        </div>
                                        {scanProgress.matchCount > 0 && (
                                            <p className="text-xs text-center text-green-600 dark:text-green-400 font-medium">
                                                ✓ {scanProgress.matchCount} match{scanProgress.matchCount > 1 ? 'es' : ''} found so far
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Status Messages */}
                                {scanProgress.status === 'uploading' && (
                                    <p className="text-sm text-blue-600 dark:text-blue-400">
                                        Uploading selfie...
                                    </p>
                                )}
                                {scanProgress.status === 'indexing' && (
                                    <p className="text-sm text-purple-600 dark:text-purple-400">
                                        Processing your face...
                                    </p>
                                )}

                                {/* Action Button */}
                                <div className="w-full space-y-3">
                                    {previewUrl && scanProgress.status === 'idle' && (
                                        <Button
                                            onClick={handleSearch}
                                            disabled={isUploading}
                                            className="w-full py-6 text-base bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20"
                                        >
                                            {isUploading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <Search className="mr-2 h-5 w-5" />
                                                    Find My Photos
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </>
                        )}

                        <p className="text-[10px] text-zinc-400 text-center px-4">
                            Your selfie is processed securely to find matches and is not stored or shared.
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
