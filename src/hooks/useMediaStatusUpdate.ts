// hooks/useMediaStatusUpdate.ts - Custom hook using your existing API function
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { updateMediaStatus } from '@/services/apis/media.api'; // Your existing function

export function useMediaStatusUpdate(eventId: string) {
  const token = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      mediaId, 
      status, 
      reason 
    }: { 
      mediaId: string; 
      status: 'approved' | 'pending' | 'rejected' | 'hidden' | 'auto_approved';
      reason?: string;
    }) => {
      if (!token) throw new Error('Authentication required');

      // Use your existing updateMediaStatus function
      return await updateMediaStatus(mediaId, status, token, {
        reason,
        hideReason: status === 'hidden' ? reason : undefined
      });
    },
    onSuccess: (_, { status }) => {
      // Invalidate all relevant queries
      ['approved', 'pending', 'rejected', 'hidden'].forEach(s => {
        queryClient.invalidateQueries({ 
          queryKey: ['event-media', eventId, s] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ['event-media', eventId, s, 'infinite'] 
        });
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['event-media-counts', eventId] 
      });

      const statusMessages = {
        approved: 'Photo approved successfully',
        rejected: 'Photo rejected',
        hidden: 'Photo hidden',
        pending: 'Photo moved to pending',
        auto_approved: 'Photo auto-approved'
      };

      toast.success(statusMessages[status as keyof typeof statusMessages] || 'Status updated');
    },
    onError: (error: Error) => {
      console.error('Failed to update media status:', error);
      toast.error(error.message || 'Failed to update photo status');
    }
  });
}