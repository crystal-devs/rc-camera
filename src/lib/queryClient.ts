// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

// Create optimized query client with proper caching
export const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      // Cache settings - longer cache times since you'll use WebSocket for real-time updates
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      
      // Network settings - less aggressive since WebSocket will handle updates
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      
      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 408, 429
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          if (error.response.status === 408 || error.response.status === 429) {
            return failureCount < 2;
          }
          return false;
        }
        // Retry up to 2 times for network errors and 5xx errors
        return failureCount < 2;
      },
      
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'online'
    },
    mutations: {
      // Retry failed mutations
      retry: (failureCount, error: any) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false; // Don't retry client errors
        }
        return failureCount < 1; // Only retry once for mutations
      },
      networkMode: 'online'
    }
  }
});

// Query client instance
let queryClient: QueryClient | undefined;

export const getQueryClient = () => {
  if (!queryClient) {
    queryClient = createQueryClient();
  }
  return queryClient;
};