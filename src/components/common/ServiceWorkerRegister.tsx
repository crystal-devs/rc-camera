'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
    useEffect(() => {
        if (
            typeof window !== 'undefined' &&
            'serviceWorker' in navigator &&
            // Only register in production or if explicitly testing PWA in dev
            // process.env.NODE_ENV === 'production' 
            true
        ) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('[ServiceWorker] Registered with scope:', registration.scope);
                })
                .catch((error) => {
                    console.error('[ServiceWorker] Registration failed:', error);
                });
        }
    }, []);

    return null;
}
