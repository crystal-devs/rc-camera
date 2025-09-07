// hooks/useEventDetailsQuery.ts
import { useQuery } from '@tanstack/react-query';
import { getTokenInfo } from '@/services/apis/sharing.api';

interface EventDetails {
  title: string;
  start_date?: string;
  location?: {
    name: string;
  };
  permissions?: {
    can_upload: boolean;
    can_download: boolean;
    require_approval: boolean;
  };
}

interface AccessDetails {
  // Add access details type as needed
}

interface EventResponse {
  event: EventDetails;
  access: AccessDetails;
}

export const useEventDetailsQuery = (shareToken: string, auth: string | null) => {
  return useQuery({
    queryKey: ['eventDetails', shareToken, auth],
    queryFn: async (): Promise<EventResponse> => {
      const response = await getTokenInfo(shareToken, auth);
      
      if (response && response.status === true && response.data) {
        return response.data;
      } else {
        throw new Error('Failed to fetch event details');
      }
    },
    enabled: !!shareToken,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount, error: any) => {
      if (error?.status === 404 || error?.status === 403) {
        return false;
      }
      return failureCount < 2;
    }
  });
};