'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveImage } from '@/lib/storage';

export default function Camera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function setupCamera() {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera not supported on this device or browser.');
        return;
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }, // Use rear camera by default on mobile
        });
        setStream(mediaStream);
      } catch (err: any) {
        setError(`Failed to access camera: ${err.message}`);
      }
    }

    setupCamera();

    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const captureImage = async () => {
    if (!stream) return;

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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 bg-blue-500 text-white p-2 rounded"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {stream ? (
        <video
          autoPlay
          ref={(video) => {
            if (video && !video.srcObject) video.srcObject = stream;
          }}
          className="w-full max-w-md"
        />
      ) : (
        <p>Loading camera...</p>
      )}
      <button
        onClick={captureImage}
        className="mt-4 bg-green-500 text-white p-2 rounded"
        disabled={!stream}
      >
        Capture
      </button>
    </div>
  );
}