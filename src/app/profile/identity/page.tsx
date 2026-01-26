'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Camera, Upload, Loader2, CheckCircle, ShieldCheck, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useSecureAuth } from '@/contexts/SecureAuthContext';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/api-config';
import Image from 'next/image';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function IdentityManagementPage() {
    const { getAccessToken, user, refreshAuth } = useSecureAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Initialize based on user profile
    const [isClaimed, setIsClaimed] = useState(() => !!user?.aws_face_id);

    // Sync with user prop updates
    React.useEffect(() => {
        if (user?.aws_face_id) setIsClaimed(true);
    }, [user?.aws_face_id]);

    const handleDelete = async () => {
        try {
            const token = getAccessToken();
            await axios.delete(`${API_BASE_URL}/user/identity/face`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            toast.success("Face data deleted successfully");
            setIsClaimed(false);
            setPreviewUrl(null);
            refreshAuth(); // Update user context
        } catch (error) {
            console.error("Delete failed", error);
            toast.error("Failed to delete face data");
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPreviewUrl(URL.createObjectURL(file));
            await handleUpload(file);
        }
    };

    const handleUpload = async (file: File) => {
        setIsUploading(true);
        try {
            const token = getAccessToken();
            const formData = new FormData();
            formData.append('selfie', file);

            await axios.post(`${API_BASE_URL}/user/identity/face`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            toast.success("Face Identity Claimed successfully!");
            setIsClaimed(true);
        } catch (error) {
            console.error("Identity claim failed", error);
            toast.error("Failed to claim identity. Please try again.");
            setPreviewUrl(null);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="container max-w-2xl mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold mb-2">My Face Identity</h1>
            <p className="text-gray-500 mb-8">
                Claim your face to automatically find your photos in any event you attend.
            </p>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="text-indigo-600" />
                        Global Face Login
                    </CardTitle>
                    <CardDescription>
                        Upload a clear selfie. We'll use this securely to match you in future events.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-6 py-8">

                    {isClaimed ? (
                        <div className="text-center space-y-4">
                            <div className="w-32 h-32 rounded-full bg-green-100 flex items-center justify-center text-green-600 mx-auto">
                                <CheckCircle size={48} />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-green-700">Identity Active</h3>
                                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                                    You are all set! When you visit an event link, we will automatically show photos of you.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => { setIsClaimed(false); setPreviewUrl(null); }}>
                                    Update Face Data
                                </Button>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="icon">
                                            <Trash2 size={18} />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Face Data?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently delete your biometric data. You will no longer be recognized automatically in events.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="relative group cursor-pointer w-48 h-48">
                                {previewUrl ? (
                                    <Image
                                        src={previewUrl}
                                        alt="Selfie"
                                        fill
                                        className="object-cover rounded-full border-4 border-indigo-100"
                                    />
                                ) : (
                                    <div className="w-full h-full rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50 group-hover:bg-gray-100 transition-colors">
                                        <Camera className="text-gray-400 mb-2" size={32} />
                                        <span className="text-xs text-gray-500 text-center px-4">Tap to take selfie</span>
                                    </div>
                                )}

                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                    disabled={isUploading}
                                />

                                {isUploading && (
                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-full">
                                        <Loader2 className="animate-spin text-indigo-600" />
                                    </div>
                                )}
                            </div>

                            <p className="text-xs text-center text-gray-400 max-w-xs">
                                Your face data is encrypted and used only to match your photos.
                                You can delete your biometric data at any time.
                            </p>
                        </>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}
