'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { saveImage } from '@/lib/storage';
import { CameraIcon, X } from 'lucide-react';
import { SessionProvider } from 'next-auth/react';

export default function Camera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  // const { data: session, status } = useSession();

  useEffect(() => {
    async function setupCamera() {
      if (status === 'loading') {
        return;
      }
      
      if (status === 'unauthenticated') {
        router.push('/auth/signin');
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera not supported on this device or browser.');
        return;
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: unknown) {
        setError(`Failed to access camera: ${(err as Error).message}`);
      }
    }

    setupCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [status, router]);

  const captureImage = async () => {
    if (!stream || status !== 'authenticated') return;

    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/png');
    await saveImage(imageData);
    router.push('/');
  };

  if (status === 'loading') {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return null; // This will not render anything as we're redirecting in the useEffect
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <p className="text-red-500 text-center mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Gallery
          </button>
        </div>
      </div>
    );
  }

  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-between p-4">
        {stream ? (
          <div className="relative w-full max-w-md rounded-lg overflow-hidden shadow-xl">
            <video autoPlay ref={videoRef} className="w-full" />
            <button
              onClick={() => router.push('/')}
              className="absolute top-4 right-4 bg-gray-800/70 p-2 rounded-full text-white hover:bg-gray-800 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        ) : (
          <div className="text-white text-lg">Loading camera...</div>
        )}
        <button
          onClick={captureImage}
          className="mt-4 bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          disabled={!stream}
        >
          <CameraIcon size={24} />
          Capture Photo
        </button>
      </div>
    </SessionProvider>
  );
}