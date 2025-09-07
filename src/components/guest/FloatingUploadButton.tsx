// components/event/FloatingUploadButton.tsx
'use client';

import React from 'react';
import { Plus } from 'lucide-react';

interface FloatingUploadButtonProps {
  onClick: () => void;
}

export const FloatingUploadButton: React.FC<FloatingUploadButtonProps> = ({ onClick }) => {
  return (
    <div className="fixed bottom-20 right-6 z-30">
      <button
        onClick={onClick}
        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl rounded-full w-14 h-14 p-0 transition-all duration-200 hover:scale-110"
        title="Upload Photos"
      >
        <Plus className="w-6 h-6 mx-auto" />
      </button>
    </div>
  );
};