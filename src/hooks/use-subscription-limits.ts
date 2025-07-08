import { useCallback, useRef } from 'react';
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
  
  // Add refs to cache the latest check result and track ongoing requests
  const eventLimitCheckRef = useRef({
    lastCheckedAt: 0,
    canCreate: null as boolean | null,
    checkedEventCount: 0
  });
  
  // Add a ref to track ongoing check requests to prevent duplicate calls
  const checkInProgressRef = useRef(false);
  
  /**
   * Navigate to the subscription upgrade page
   */
  const navigateToUpgrade = useCallback(() => {
    router.push('/settings');
    toast.info('Choose a plan to upgrade your subscription.');
  }, [router]);
  
  /**
   * Check if the user can create a new event
   * @param forceFetchUsage If true, force a refresh of usage data before checking
   * @param bypassCache If true, ignore cached results even if they're recent
   * @returns Promise<boolean> - true if the user can create an event, false otherwise
   */
  const canCreateEvent = useCallback(async (
    forceFetchUsage: boolean = false,
    bypassCache: boolean = false
  ): Promise<boolean> => {
    // Check authentication and hydration status
    if (!hydrated) {
      console.log('Subscription check: Store not yet hydrated');
      return false;
    }
    
    if (!isAuthenticated) {
      toast.error('You need to be logged in to create events.');
      return false;
    }
    
    // Check if another check is already in progress to avoid race conditions
    if (checkInProgressRef.current) {
      console.log('Subscription check: Another check is already in progress, waiting...');
      
      // Wait for the ongoing check to complete (max 2 seconds)
      let waitCount = 0;
      while (checkInProgressRef.current && waitCount < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }
      
      // If we have a cached result after waiting, use it
      if (eventLimitCheckRef.current.canCreate !== null) {
        console.log('Subscription check: Using result from completed check:', 
          eventLimitCheckRef.current.canCreate ? 'CAN create event' : 'CANNOT create event');
        return eventLimitCheckRef.current.canCreate;
      }
    }
    
    // Check if we have a recent cached result (within last 30 seconds) and usage count matches
    const currentTime = Date.now();
    const cachedResult = eventLimitCheckRef.current;
    const currentEventCount = usage?.totals?.events || 0;
    const cacheAge = currentTime - cachedResult.lastCheckedAt;
    
    // Use cached result if:
    // 1. Cache is less than 30 seconds old
    // 2. Event count hasn't changed since last check
    // 3. We're not explicitly bypassing cache
    // 4. We're not forcing a usage refresh
    // 5. We have a definite boolean result (not null)
    if (
      !bypassCache && 
      !forceFetchUsage && 
      cacheAge < 30000 && 
      cachedResult.checkedEventCount === currentEventCount &&
      cachedResult.canCreate !== null
    ) {
      console.log('Subscription check: Using cached result from', 
        Math.round(cacheAge/1000), 'seconds ago:', 
        cachedResult.canCreate ? 'CAN create event' : 'CANNOT create event'
      );
      
      // If the cached result indicates the user can't create an event, show the message again
      if (cachedResult.canCreate === false) {
        const maxEvents = subscription?.limits?.maxEvents || 0;
        toast.error(`You've reached your limit of ${maxEvents} events. Please upgrade your plan to create more events.`, {
          duration: 6000,
          action: {
            label: 'Upgrade Plan',
            onClick: navigateToUpgrade
          }
        });
      }
      
      return cachedResult.canCreate;
    }
    
    // Set the check in progress flag to prevent concurrent checks
    checkInProgressRef.current = true;
    
    try {
      // Need to check with fresh data
      let subToCheck = subscription;
      let usageToCheck = usage;
      
      // Refresh usage data if needed
      if (forceFetchUsage || !usage) {
        console.log('Subscription check: Fetching fresh usage data from server');
        const { fetchUsage } = useStore.getState();
        
        try {
          await fetchUsage();
          
          // Get updated state after fetching usage
          const storeState = useStore.getState();
          subToCheck = storeState.subscription;
          usageToCheck = storeState.usage;
          
          // Check if we still don't have usage data after trying to fetch it
          if (!usageToCheck) {
            console.error('Subscription check: Failed to fetch usage data from server');
            toast.error('Unable to verify your subscription limits. Please try again.');
            return false;
          }
        } catch (fetchError) {
          console.error('Subscription check: Error fetching usage data:', fetchError);
          // Continue with existing data if fetch fails
        }
      }
      
      console.log('Subscription check: Checking limits with', forceFetchUsage ? 'fresh' : 'current', 'usage data', {
        events: usageToCheck?.totals?.events || 0,
        maxEvents: subToCheck?.limits?.maxEvents || 0
      });
      
      // Check against the subscription data
      const checkResult = checkSubscriptionLimit(
        LimitType.EVENT_COUNT,
        subToCheck,
        usageToCheck
      );
      
      const canCreate = handleLimitCheck(checkResult, undefined, navigateToUpgrade);
      
      // Cache the result to avoid redundant API calls
      eventLimitCheckRef.current = {
        lastCheckedAt: Date.now(),
        canCreate,
        checkedEventCount: usageToCheck?.totals?.events || 0
      };
      
      return canCreate;
    } catch (error) {
      console.error('Error checking event creation limits:', error);
      toast.error('Something went wrong checking your subscription limits. Please try again.');
      return false;
    } finally {
      // Clear the in-progress flag
      checkInProgressRef.current = false;
    }
  }, [subscription, usage, isAuthenticated, hydrated, navigateToUpgrade]);
  
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
    
    return handleLimitCheck(checkResult, undefined, navigateToUpgrade);
  }, [subscription, usage, isAuthenticated, hydrated, navigateToUpgrade]);
  
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
    
    return handleLimitCheck(checkResult, undefined, navigateToUpgrade);
  }, [subscription, usage, isAuthenticated, hydrated, navigateToUpgrade]);
  
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
    
    return handleLimitCheck(checkResult, undefined, navigateToUpgrade);
  }, [subscription, usage, isAuthenticated, hydrated, navigateToUpgrade]);
  
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
