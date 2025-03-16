'use client';

import { useState, useEffect } from 'react';
import { getImages } from '@/lib/storage';

export default function ImageGallery() {
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    async function loadImages() {
      const savedImages = await getImages();
      setImages(savedImages);
    }
    loadImages();
  }, []);

  return (
    <div className="grid grid-cols-2 gap-4">
      {images.map((img, index) => (
        <img
          key={index}
          src={img}
          alt={`Captured ${index}`}
          className="w-full h-auto rounded"
        />
      ))}
    </div>
  );
}