import { useCallback } from 'react';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  checkSubscriptionLimit,
  LimitType,
  LimitCheckResult,
  handleLimitCheck
} from '@/lib/subscription-limits';

/**
 * Hook that provides subscription limit checking functionality
 */
export function useSubscriptionLimits() {
  const { subscription, usage, isAuthenticated, hydrated } = useStore();
  const router = useRouter();
  
  /**
   * Check if the user can create a new event
   */
  const canCreateEvent = useCallback((): boolean => {
    if (!hydrated || !isAuthenticated) {
      toast.error('You need to be logged in to create events.');
      return false;
    }
    
    const checkResult = checkSubscriptionLimit(
      LimitType.EVENT_COUNT,
      subscription,
      usage
    );
    
    return handleLimitCheck(checkResult);
  }, [subscription, usage, isAuthenticated, hydrated]);
  
  /**
   * Check if the user can upload more photos to an event
   */
  const canAddPhotoToEvent = useCallback((eventId: string, photoCount: number = 1): boolean => {
    if (!hydrated || !isAuthenticated) {
      toast.error('You need to be logged in to upload photos.');
      return false;
    }
    
    const checkResult = checkSubscriptionLimit(
      LimitType.PHOTOS_PER_EVENT,
      subscription,
      usage,
      photoCount,
      eventId
    );
    
    return handleLimitCheck(checkResult);
  }, [subscription, usage, isAuthenticated, hydrated]);
  
  /**
   * Check if a photo's size is within the allowed limit
   * @param sizeInMB Size of the photo in MB
   */
  const isPhotoSizeAllowed = useCallback((sizeInMB: number): boolean => {
    if (!hydrated || !isAuthenticated) {
      toast.error('You need to be logged in to upload photos.');
      return false;
    }
    
    const checkResult = checkSubscriptionLimit(
      LimitType.PHOTO_SIZE,
      subscription,
      usage,
      sizeInMB
    );
    
    return handleLimitCheck(checkResult);
  }, [subscription, usage, isAuthenticated, hydrated]);
  
  /**
   * Check if the user has enough storage space for an upload
   * @param sizeInMB Size of the upload in MB
   */
  const hasStorageSpace = useCallback((sizeInMB: number): boolean => {
    if (!hydrated || !isAuthenticated) {
      toast.error('You need to be logged in to upload photos.');
      return false;
    }
    
    const checkResult = checkSubscriptionLimit(
      LimitType.STORAGE_SPACE,
      subscription,
      usage,
      sizeInMB
    );
    
    return handleLimitCheck(checkResult);
  }, [subscription, usage, isAuthenticated, hydrated]);
  
  /**
   * Navigate to the subscription upgrade page
   */
  const navigateToUpgrade = useCallback(() => {
    router.push('/settings');
    toast.info('Choose a plan to upgrade your subscription.');
  }, [router]);
  
  return {
    canCreateEvent,
    canAddPhotoToEvent,
    isPhotoSizeAllowed,
    hasStorageSpace,
    navigateToUpgrade,
    isAuthenticated,
    hydrated,
    subscription,
    usage
  };
}
