'use client';

import React, { createContext, useContext } from 'react';

interface ScrollContextType {
    scrollRef: React.RefObject<HTMLDivElement>;
}

export const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

export function useScrollContainer() {
    const context = useContext(ScrollContext);
    if (!context) {
        if (process.env.NODE_ENV === 'development') {
            console.warn('useScrollContainer must be used within a ScrollContext.Provider');
        }
        return { scrollRef: { current: null } as React.RefObject<HTMLDivElement> };
    }
    return context;
}
