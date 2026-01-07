import React, { useState, useRef, useEffect } from 'react';
import {
    Camera,
    X,
    UserSearch,
    RefreshCcw,
    Check,
    Loader2,
    ShieldCheck,
    Upload,
    Sparkles
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { findMyPhotos } from '@/services/apis/ai.api';

interface FindMeModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    onMatchesFound: (mediaIds: string[]) => void;
}

export function FindMeModal({ isOpen, onClose, eventId, onMatchesFound }: FindMeModalProps) {
    const [step, setStep] = useState<'intro' | 'capture' | 'preview' | 'searching' | 'results'>('intro');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [useLooseThreshold, setUseLooseThreshold] = useState(false);

    // Stop stream on close
    useEffect(() => {
        if (!isOpen) {
            stopCamera();
            setStep('intro');
            setCapturedImage(null);
        }
    }, [isOpen]);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' },
                audio: false
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setStep('capture');
        } catch (error) {
            console.error('Camera access denied:', error);
            toast.error('Could not access camera. Please check permissions or upload a photo.');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(videoRef.current, 0, 0);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setCapturedImage(dataUrl);
            stopCamera();
            setStep('preview');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setCapturedImage(event.target?.result as string);
                setStep('preview');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSearch = async (arg?: boolean | React.MouseEvent) => {
        if (!capturedImage) return;
        const loose = typeof arg === 'boolean' ? arg : useLooseThreshold;

        try {
            setIsSearching(true);
            setStep('searching');

            const response = await findMyPhotos(eventId, capturedImage, loose);

            if (response.status) {
                if (response.data.count > 0) {
                    toast.success(`We found ${response.data.count} photos of you!`);
                    onMatchesFound(response.data.mediaIds);
                    onClose();
                } else {
                    setStep('results');
                }
            } else {
                toast.error(response.message || 'Search failed');
                setStep('preview');
            }
        } catch (error: any) {
            console.error('Search error:', error);
            toast.error('Something went wrong during the search.');
            setStep('preview');
        } finally {
            setIsSearching(false);
        }
    };

    const toggleLooseAndSearch = () => {
        const newValue = !useLooseThreshold;
        setUseLooseThreshold(newValue);
        handleSearch(newValue);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white dark:bg-zinc-900 border-none rounded-2xl shadow-2xl">
                <div className="absolute top-4 right-4 z-10">
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white border-none">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="relative">
                    {/* Header Image/Pattern */}
                    <div className="h-32 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                        <Sparkles className="h-12 w-12 text-white/30 animate-pulse" />
                    </div>

                    <div className="p-6 -mt-10 bg-white dark:bg-zinc-900 rounded-t-3xl relative">
                        <AnimatePresence mode="wait">
                            {step === 'intro' && (
                                <motion.div
                                    key="intro"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6"
                                >
                                    <div className="text-center space-y-2">
                                        <DialogTitle className="text-2xl font-bold">Find My Photos</DialogTitle>
                                        <DialogDescription className="text-zinc-500 dark:text-zinc-400">
                                            Take a quick selfie and we'll instantly find every photo you're in!
                                        </DialogDescription>
                                    </div>

                                    <div className="space-y-4 pt-2">
                                        <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                                            <ShieldCheck className="h-6 w-6 text-blue-600 mt-0.5" />
                                            <div className="space-y-1">
                                                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Privacy First</p>
                                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                                    Your selfie is processed instantly and never stored on our servers.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3">
                                            <Button onClick={startCamera} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-lg font-semibold">
                                                <Camera className="mr-2 h-5 w-5" />
                                                Take Selfie
                                            </Button>
                                            <div className="relative py-2">
                                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-200 dark:border-zinc-800" /></div>
                                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400">or</span></div>
                                            </div>
                                            <label className="w-full h-12 flex items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                                <Upload className="mr-2 h-5 w-5 text-zinc-500" />
                                                <span className="text-zinc-600 dark:text-zinc-300 font-medium">Upload Photo</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                            </label>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {step === 'capture' && (
                                <motion.div
                                    key="capture"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="space-y-4"
                                >
                                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-black shadow-inner">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            className="w-full h-full object-cover mirror"
                                            style={{ transform: 'scaleX(-1)' }}
                                        />
                                        <div className="absolute inset-0 border-2 border-white/20 rounded-2xl pointer-events-none" />
                                    </div>
                                    <div className="flex gap-3">
                                        <Button variant="outline" onClick={() => setStep('intro')} className="flex-1 h-12 rounded-xl">
                                            Back
                                        </Button>
                                        <Button onClick={capturePhoto} className="flex-[2] h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                                            Capture
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 'preview' && (
                                <motion.div
                                    key="preview"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="space-y-6"
                                >
                                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-100 shadow-inner">
                                        {capturedImage && (
                                            <img src={capturedImage} alt="Preview" className="w-full h-full object-cover" />
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <Button
                                            onClick={handleSearch}
                                            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-lg font-bold shadow-lg shadow-blue-500/20"
                                        >
                                            <UserSearch className="mr-2 h-6 w-6" />
                                            Search for My Face
                                        </Button>
                                        <Button variant="ghost" onClick={() => setStep('intro')} className="w-full h-10 text-zinc-500">
                                            <RefreshCcw className="mr-2 h-4 w-4" />
                                            Try another photo
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 'searching' && (
                                <motion.div
                                    key="searching"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="py-12 flex flex-col items-center justify-center space-y-6"
                                >
                                    <div className="relative">
                                        <div className="h-24 w-24 rounded-full border-4 border-blue-100 dark:border-blue-900/30 flex items-center justify-center">
                                            <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                                        </div>
                                        <motion.div
                                            animate={{ opacity: [0, 1, 0] }}
                                            transition={{ repeat: Infinity, duration: 2 }}
                                            className="absolute -top-1 -right-1 h-6 w-6 bg-blue-600 rounded-full flex items-center justify-center text-white"
                                        >
                                            <Sparkles className="h-3 w-3" />
                                        </motion.div>
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h3 className="text-xl font-bold">Analyzing Event...</h3>
                                        <p className="text-zinc-500">Comparing your features against thousands of memories.</p>
                                    </div>
                                </motion.div>
                            )}

                            {step === 'results' && (
                                <motion.div
                                    key="results"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="py-6 text-center space-y-8"
                                >
                                    <div className="mx-auto h-20 w-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                        <UserSearch className="h-10 w-10 text-zinc-400" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-bold">No matches found yet</h3>
                                        <p className="text-zinc-500 px-6">
                                            We couldn't find a strong match. Try a clearer photo or check back later as more photos are uploaded!
                                        </p>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <Button
                                            variant="outline"
                                            onClick={toggleLooseAndSearch}
                                            className={cn(
                                                "w-full h-12 rounded-xl border-2 transition-all",
                                                useLooseThreshold ? "border-blue-600 bg-blue-50 text-blue-600" : ""
                                            )}
                                        >
                                            {useLooseThreshold ? <Check className="mr-2 h-4 w-4" /> : null}
                                            Show more possible matches
                                        </Button>

                                        <div className="flex gap-3">
                                            <Button variant="ghost" onClick={() => setStep('intro')} className="flex-1">
                                                Try Again
                                            </Button>
                                            <Button onClick={onClose} className="flex-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl">
                                                Close
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function cn(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
}
