'use client';

import { useRouter } from 'next/navigation';
import ImageGallery from '@/components/ImageGallery';
import { Camera } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Camera App</h1>
      <ImageGallery />
      <button
        onClick={() => router.push('/capture')}
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-full"
      >
        <Camera size={24} />
      </button>
    </div>
  );
}