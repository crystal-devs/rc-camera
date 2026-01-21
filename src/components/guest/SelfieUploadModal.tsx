import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Upload, Loader2, Search } from 'lucide-react';
import { searchFaces } from '@/services/apis/media.api';
import { Button } from '@/components/ui/button'; // Assuming you have a Button component
import { toast } from 'sonner';

interface SelfieUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    onSearchResults: (results: any[]) => void;
    token?: string; // Optional auth token if needed
}

export const SelfieUploadModal: React.FC<SelfieUploadModalProps> = ({
    isOpen,
    onClose,
    eventId,
    onSearchResults,
    token
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            // Auto search could be triggered here or require a button press
        }
    };

    const handleSearch = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        try {
            const results = await searchFaces(eventId, selectedFile, token);

            if (results && results.length > 0) {
                toast.success(`Found ${results.length} photos of you!`);
                // Pass full results back to parent
                onSearchResults(results);
                onClose();
            } else {
                toast.info("No matching photos found yet. Try again later!");
                onSearchResults([]); // Optional: clear filter or keep previous?
                // Maybe don't close, let them try another selfie
            }
        } catch (error: any) {
            console.error("Search failed", error);
            toast.error(error.message || "Failed to search photos");
        } finally {
            setIsUploading(false);
        }
    };

    const clearSelection = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                onClick={onClose}
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
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Find My Photos</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Upload a selfie to find your moments</p>
                        <button
                            onClick={onClose}
                            className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 flex flex-col items-center gap-6">
                        {!previewUrl ? (
                            <label className="w-full aspect-square max-w-[240px] rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-zinc-50 dark:bg-zinc-900/50 group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="user" // Opens front camera on mobile
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
                                    className="w-full h-full object-cover rounded-full border-4 border-white dark:border-zinc-800 shadow-lg"
                                />
                                <button
                                    onClick={clearSelection}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}

                        <div className="w-full space-y-3">
                            {previewUrl && (
                                <Button
                                    onClick={handleSearch}
                                    disabled={isUploading}
                                    className="w-full py-6 text-base bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Scanning Gallery...
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

                        <p className="text-[10px] text-zinc-400 text-center px-4">
                            Your selfie is processed securely to find matches and is not stored or shared.
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
