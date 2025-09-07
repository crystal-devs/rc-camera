// components/Providers.tsx
'use client';

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SidebarProvider } from "./ui/sidebar";
import { ThemeProvider } from "@/lib/ThemeContext";
import { useState } from 'react';

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
                // Global error handler for mutations
                onError: (error: any) => {
                    console.error('Mutation error:', error);
                }
            }
        }
    }));

    return (
        <SessionProvider>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    {children}
                    {/* Add React Query DevTools in development only */}
                    {process.env.NODE_ENV === 'development' && (
                        <ReactQueryDevtools
                            initialIsOpen={false}
                            buttonPosition="bottom-left"
                        />
                    )}
                </ThemeProvider>
            </QueryClientProvider>
        </SessionProvider>
    );
}

export default Providers;