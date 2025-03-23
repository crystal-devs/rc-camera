'use client';

import { useRouter } from 'next/navigation';
import ImageGallery from '@/components/ImageGallery';
import { Camera, LogOut } from 'lucide-react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { SessionProvider } from 'next-auth/react';

export default function HomeClient() {
    const router = useRouter();
    const { data: session, status } = useSession();

    const handleCaptureClick = () => {
        if (status === 'authenticated') {
            router.push('/capture');
        } else {
            router.push('/auth/signin');
        }
    };

    return (
        <SessionProvider>
            <div className="min-h-screen bg-gray-100">
                <header className="bg-white shadow-md p-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Photo Gallery</h1>
                    {status === 'loading' ? (
                        <span className="text-gray-500">Loading...</span>
                    ) : status === 'authenticated' ? (
                        <div className="flex items-center gap-4">
                            <span className="text-green-600 font-medium">
                                Welcome, {session?.user?.name}
                            </span>
                            <button
                                onClick={() => signOut()}
                                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex items-center gap-2 transition-colors"
                            >
                                <LogOut size={20} />
                                Logout
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => router.push('/auth/signin')}
                            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            Login
                        </button>
                    )}
                </header>
                <main>
                    <ImageGallery />
                </main>
                <button
                    onClick={handleCaptureClick}
                    className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <Camera size={24} />
                    Take Photo
                </button>
            </div>
        </SessionProvider>
    );
}