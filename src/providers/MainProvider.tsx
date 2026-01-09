// components/Providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from '@/providers/AuthProvider';
import { ThemeProvider } from "@/lib/ThemeContext";
import { SecureAuthProvider } from "@/contexts/SecureAuthContext";
import { useState } from 'react';
import { ServiceWorkerRegister } from '@/components/common/ServiceWorkerRegister';

interface ProvidersProps {
    children: React.ReactNode;
}

function Providers({ children }: ProvidersProps) {
    // Create QueryClient instance - use useState to ensure it's stable across re-renders
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 5 * 60 * 1000, // 5 minutes
                gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
                refetchOnWindowFocus: false,
                retry: (failureCount, error: any) => {
                    // Don't retry on 4xx errors (client errors)
                    if (error?.status >= 400 && error?.status < 500) {
                        return false;
                    }
                    return failureCount < 2;
                }
            },
            mutations: {
                retry: 1,
                onError: (error: any) => {
                    console.error('Mutation error:', error);
                }
            }
        }
    }));

    // Listen for logout events to clear cache
    if (typeof window !== 'undefined') {
        const handleAuthUpdate = async (event: any) => {
            if (event.detail?.type === 'auth_logout') {
                console.log('🧹 Providers: Clearing all query caches and stores due to logout');

                // 1. Clear React Query Cache
                queryClient.removeQueries();
                queryClient.clear();

                // 2. Clear Zustand Stores (dynamically import to avoid circular deps if needed)
                const { default: useEventStore } = await import('@/stores/useEventStore');
                useEventStore.getState().clearState();

                // Add other stores here if needed
                // useOtherStore.getState().reset();
            }
        };

        // Remove listener first to avoid duplicates (though rare in this scope)
        window.removeEventListener('rc-auth-update', handleAuthUpdate);
        window.addEventListener('rc-auth-update', handleAuthUpdate);
    }

    return (
        <QueryClientProvider client={queryClient}>
            <SecureAuthProvider>
                <ThemeProvider>
                    <ServiceWorkerRegister />
                    {children}
                    {/* Add React Query DevTools in development only */}
                    {process.env.NODE_ENV === 'development' && (
                        <ReactQueryDevtools
                            initialIsOpen={false}
                            buttonPosition="bottom-left"
                        />
                    )}
                </ThemeProvider>
            </SecureAuthProvider>
        </QueryClientProvider>
    );
}

export { Providers };