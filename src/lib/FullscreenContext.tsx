// lib/FullscreenContext.tsx
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FullscreenContextType {
  isFullscreenActive: boolean;
  setIsFullscreenActive: (isActive: boolean) => void;
}

const FullscreenContext = createContext<FullscreenContextType>({
  isFullscreenActive: false,
  setIsFullscreenActive: () => {},
});

export const FullscreenProvider = ({ children }: { children: ReactNode }) => {
  const [isFullscreenActive, setIsFullscreenActive] = useState<boolean>(false);

  return (
    <FullscreenContext.Provider value={{ isFullscreenActive, setIsFullscreenActive }}>
      {children}
    </FullscreenContext.Provider>
  );
};

export const useFullscreen = () => useContext(FullscreenContext);
