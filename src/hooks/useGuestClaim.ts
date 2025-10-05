// src/hooks/useGuestClaim.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { getClaimableSummary, claimGuestContent, ClaimableSummary, ClaimResult } from '@/services/apis/guest-claim.api';
import { toast } from 'sonner';

interface UseGuestClaimOptions {
  eventId: string;
  authToken: string | null;
  enabled?: boolean;
  autoClaimOnMount?: boolean;
}

interface UseGuestClaimReturn {
  summary: ClaimableSummary | null;
  isChecking: boolean;
  isClaiming: boolean;
  hasClaimableContent: boolean;
  claimResult: ClaimResult | null;
  checkClaimable: () => Promise<void>;
  claimContent: (sessionIds?: string[]) => Promise<void>;
  resetClaimState: () => void;
}

export const useGuestClaim = ({
  eventId,
  authToken,
  enabled = true,
  autoClaimOnMount = true,
}: UseGuestClaimOptions): UseGuestClaimReturn => {
  const [summary, setSummary] = useState<ClaimableSummary | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const hasAttemptedClaim = useRef(false);

  const checkClaimable = useCallback(async () => {
    if (!authToken || !enabled || !eventId) return;

    try {
      setIsChecking(true);
      const response = await getClaimableSummary(eventId, authToken);
      
      if (response.status && response.data) {
        setSummary(response.data);
        return response.data;
      }
    } catch (error: any) {
      console.error('Error checking claimable content:', error);
      if (error?.response?.status !== 404 && error?.response?.status !== 401) {
        toast.error('Could not check for previous uploads');
      }
    } finally {
      setIsChecking(false);
    }
  }, [eventId, authToken, enabled]);

  const claimContent = useCallback(async (sessionIds?: string[]) => {
    if (!authToken || !eventId) {
      toast.error('Authentication required to claim content');
      return;
    }

    try {
      setIsClaiming(true);
      const response = await claimGuestContent(eventId, authToken, sessionIds);
      
      if (response.status && response.data) {
        setClaimResult(response.data);
        setSummary(null);
        
        const { mediaMigrated } = response.data;
        if (mediaMigrated > 0) {
          toast.success(
            `Successfully claimed ${mediaMigrated} photo${mediaMigrated !== 1 ? 's' : ''} from your previous uploads!`,
            {
              duration: 5000,
              position: 'top-center',
            }
          );
        }
        
        return response.data;
      }
    } catch (error: any) {
      console.error('Error claiming content:', error);
      toast.error(error?.response?.data?.message || 'Failed to claim content');
      throw error;
    } finally {
      setIsClaiming(false);
    }
  }, [eventId, authToken]);

  const resetClaimState = useCallback(() => {
    setSummary(null);
    setClaimResult(null);
    hasAttemptedClaim.current = false;
  }, []);

  useEffect(() => {
    const autoClaimProcess = async () => {
      if (!authToken || !enabled || !eventId || !autoClaimOnMount || hasAttemptedClaim.current) {
        return;
      }

      hasAttemptedClaim.current = true;

      const claimableSummary = await checkClaimable();

      if (claimableSummary && claimableSummary.hasClaimableContent && claimableSummary.totalMedia > 0) {
        setTimeout(async () => {
          await claimContent();
        }, 500);
      }
    };

    autoClaimProcess();
  }, [authToken, enabled, eventId, autoClaimOnMount, checkClaimable, claimContent]);

  return {
    summary,
    isChecking,
    isClaiming,
    hasClaimableContent: summary?.hasClaimableContent ?? false,
    claimResult,
    checkClaimable,
    claimContent,
    resetClaimState,
  };
};