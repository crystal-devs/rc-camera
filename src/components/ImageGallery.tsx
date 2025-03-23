'use client';

import { useState, useEffect } from 'react';
import { getImages } from '@/lib/storage';

export default function ImageGallery() {
  const [images, setImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1670272505284-8faba1c31f7d',
    'https://images.unsplash.com/photo-1670272505342-8f02e39f575f',
    'https://images.unsplash.com/photo-1670272505288-5d673f6e0b8e',
  ]);

  useEffect(() => {
    async function loadImages() {
      const savedImages = await getImages();
      setImages((prev) => [...prev, ...savedImages]);
    }
    loadImages();
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4">
      {images.map((img, index) => (
        <div
          key={index}
          className="relative group overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow"
        >
          <img
            src={img}
            alt={`Gallery ${index}`}
            className="w-full h-64 object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        </div>
      ))}
    </div>
  );
}