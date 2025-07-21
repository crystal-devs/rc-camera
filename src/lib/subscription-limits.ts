import { toast } from 'sonner';
import { UserSubscription, UserUsage, getSafeSubscriptionProperty, getSafeUsageProperty } from './store';
import { formatStorageSize } from './subscription-utils';

/**
 * Types of subscription limits that can be checked
 */
export enum LimitType {
  EVENT_COUNT = 'event_count',
  PHOTOS_PER_EVENT = 'photos_per_event',
  STORAGE_SPACE = 'storage_space',
  PHOTO_SIZE = 'photo_size'
}

/**
 * Response from checking a subscription limit
 */
export interface LimitCheckResult {
  allowed: boolean;
  message: string;
  currentValue: number;
  limit: number;
  percentUsed: number;
}

/**
 * Check if a user is within their subscription limits
 * 
 * @param type The type of limit to check
 * @param subscription The user's subscription data
 * @param usage The user's usage data
 * @param additionalValue Extra amount to add to current usage (e.g., size of a new upload)
 * @param eventId Optional event ID for per-event checks
 * @returns Result indicating whether the action is allowed
 */
export function checkSubscriptionLimit(
  type: LimitType,
  subscription: UserSubscription | null,
  usage: UserUsage | null,
  additionalValue: number = 1,
  eventId?: string
): LimitCheckResult {
  
  switch (type) {
    case LimitType.EVENT_COUNT: {
      // Check if user can create more events
      const currentEventCount = getSafeUsageProperty(usage, ['totals', 'events'], 0);
      const maxEvents = getSafeSubscriptionProperty(subscription, ['limits', 'maxEvents'], 3);
      
      const newTotal = currentEventCount + additionalValue;
      const percentUsed = (newTotal / maxEvents) * 100;
      
      return {
        allowed: newTotal <= maxEvents,
        message: newTotal > maxEvents 
          ? `You've reached your limit of ${maxEvents} events. Please upgrade your plan to create more events.`
          : `You can create ${maxEvents - currentEventCount} more events.`,
        currentValue: currentEventCount,
        limit: maxEvents,
        percentUsed
      };
    }
    
    case LimitType.PHOTOS_PER_EVENT: {
      // Check if user can upload more photos to a specific event
      if (!eventId) {
        return {
          allowed: false,
          message: 'Invalid event ID',
          currentValue: 0,
          limit: 0,
          percentUsed: 0
        };
      }
      
      // Find event in active events
      const eventPhotoCount = findEventPhotoCount(usage, eventId);
      const maxPhotosPerEvent = getSafeSubscriptionProperty(subscription, ['limits', 'maxPhotosPerEvent'], 50);
      
      const newTotal = eventPhotoCount + additionalValue;
      const percentUsed = (newTotal / maxPhotosPerEvent) * 100;
      
      return {
        allowed: newTotal <= maxPhotosPerEvent,
        message: newTotal > maxPhotosPerEvent 
          ? `You've reached your limit of ${maxPhotosPerEvent} photos per event. Please upgrade your plan to add more.`
          : `You can add ${maxPhotosPerEvent - eventPhotoCount} more photos to this event.`,
        currentValue: eventPhotoCount,
        limit: maxPhotosPerEvent,
        percentUsed
      };
    }
    
    case LimitType.STORAGE_SPACE: {
      // Check if user has enough storage space
      const usedStorageMB = getSafeUsageProperty(usage, ['totals', 'storage'], 0);
      const maxStorageMB = getSafeSubscriptionProperty(subscription, ['limits', 'maxStorage'], 100);
      
      const newTotal = usedStorageMB + additionalValue;
      const percentUsed = (newTotal / maxStorageMB) * 100;
      
      return {
        allowed: newTotal <= maxStorageMB,
        message: newTotal > maxStorageMB 
          ? `You've reached your storage limit of ${formatStorageSize(maxStorageMB)}. Please upgrade your plan for more space.`
          : `You have ${formatStorageSize(maxStorageMB - usedStorageMB)} of storage remaining.`,
        currentValue: usedStorageMB,
        limit: maxStorageMB,
        percentUsed
      };
    }
    
    case LimitType.PHOTO_SIZE: {
      // Check if a specific photo is within size limits
      const maxPhotoSizeMB = getSafeSubscriptionProperty(subscription, ['limits', 'maxPhotoSize'], 5);
      const photoSizeMB = additionalValue; // In this case, additionalValue is the photo size
      
      const percentUsed = (photoSizeMB / maxPhotoSizeMB) * 100;
      
      return {
        allowed: photoSizeMB <= maxPhotoSizeMB,
        message: photoSizeMB > maxPhotoSizeMB 
          ? `This photo exceeds your plan's maximum size of ${formatStorageSize(maxPhotoSizeMB)}. Please upload a smaller file or upgrade your plan.`
          : `Photo size is within allowed limits.`,
        currentValue: photoSizeMB,
        limit: maxPhotoSizeMB,
        percentUsed
      };
    }
  }
}   

// Keep track of the last time we showed a toast for each limit type
// This prevents multiple toasts from appearing for the same limit check in rapid succession
const lastToastShown = {
  limitExceeded: 0,
  warningHigh: 0,
  warningMedium: 0
};

// Minimum time between toasts (in milliseconds) to prevent spam
const TOAST_THROTTLE_MS = 5000;

/**
 * Handle subscription limit check with user notification
 * 
 * @param checkResult Result from checkSubscriptionLimit
 * @param onSuccess Optional callback to run if check passes
 * @param customUpgradeAction Optional custom function to navigate to upgrade page
 * @returns True if within limits, false otherwise
 */
export function handleLimitCheck(
  checkResult: LimitCheckResult, 
  onSuccess?: () => void,
  customUpgradeAction?: () => void
): boolean {
  // Log the limit check result for debugging
  console.log('Subscription limit check:', {
    type: 'limit_check',
    allowed: checkResult.allowed,
    message: checkResult.message,
    current: checkResult.currentValue,
    limit: checkResult.limit,
    percentUsed: checkResult.percentUsed.toFixed(2) + '%'
  });
  
  const currentTime = Date.now();
  
  if (!checkResult.allowed) {
    // User has reached their limit
    
    // Check if we've shown a toast recently to avoid spamming
    const timeSinceLastToast = currentTime - lastToastShown.limitExceeded;
    const shouldShowToast = timeSinceLastToast > TOAST_THROTTLE_MS;
    
    if (shouldShowToast) {
      // Show error message and update the last shown time
      lastToastShown.limitExceeded = currentTime;
      
      toast.error(checkResult.message, {
        duration: 6000,
        action: {
          label: 'Upgrade Plan',
          onClick: () => {
            // Use custom upgrade action if provided
            if (customUpgradeAction) {
              console.log('Using custom upgrade action');
              customUpgradeAction();
            } else {
              // Default navigation to settings page
              console.log('Using default upgrade action (navigate to /settings)');
              window.location.href = '/settings';
            }
          }
        }
      });
    } else {
      console.log(`Suppressing duplicate limit exceeded toast (last shown ${Math.round(timeSinceLastToast/1000)}s ago)`);
    }
    
    return false;
  } else {
    // User is within their limits, but check if they're approaching the limit
    if (checkResult.percentUsed >= 90) {
      // Critical warning - very close to limit (90%+)
      const timeSinceLastHighWarning = currentTime - lastToastShown.warningHigh;
      
      if (timeSinceLastHighWarning > TOAST_THROTTLE_MS) {
        lastToastShown.warningHigh = currentTime;
        
        toast.warning(`You're very close to your limit! ${checkResult.message}`, {
          duration: 6000,
          action: {
            label: 'Upgrade Now',
            onClick: () => {
              if (customUpgradeAction) {
                customUpgradeAction();
              } else {
                window.location.href = '/settings';
              }
            }
          }
        });
      }
    } else if (checkResult.percentUsed >= 75) {
      // Standard warning - approaching limit (75-90%)
      const timeSinceLastMediumWarning = currentTime - lastToastShown.warningMedium;
      
      if (timeSinceLastMediumWarning > TOAST_THROTTLE_MS) {
        lastToastShown.warningMedium = currentTime;
        
        toast.warning(`You're approaching your limit. ${checkResult.message}`, {
          duration: 5000,
          action: {
            label: 'View Plans',
            onClick: () => {
              if (customUpgradeAction) {
                customUpgradeAction();
              } else {
                window.location.href = '/settings';
              }
            }
          }
        });
      }
    }
    
    // Run success callback if provided
    if (onSuccess) onSuccess();
    return true;
  }
}

/**
 * Find the number of photos in a specific event
 * 
 * @param usage The user's usage data from the store
 * @param eventId The ID of the event to check
 * @returns The number of photos in the event, or 0 if not found or error
 */
function findEventPhotoCount(usage: UserUsage | null, eventId: string): number {
  // Safety check - if usage data is missing or invalid, return 0
  if (!usage || !usage.metrics || !Array.isArray(usage.metrics.activeEvents)) {
    console.log('Event photo count: No valid usage data available');
    return 0;
  }
  
  try {
    // Find the event in the activeEvents array, which may contain string IDs or objects
    const eventDetails = usage.metrics.activeEvents.find(e => {
      // Case 1: Event ID is stored as a plain string
      if (typeof e === 'string') {
        return e === eventId;
      } 
      // Case 2: Event ID is stored in an object with id or _id property
      else if (typeof e === 'object' && e !== null) {
        // Use explicit type assertion to avoid TypeScript errors
        const eventObj = e as { id?: string, _id?: string, photoCount?: number };
        return eventObj.id === eventId || eventObj._id === eventId;
      }
      return false;
    });
    
    // If we found a matching event object with a photoCount property
    if (eventDetails && typeof eventDetails === 'object' && 'photoCount' in eventDetails) {
      // Cast to ensure TypeScript understands the type and extract the count
      const count = (eventDetails as { photoCount: number }).photoCount || 0;
      return count;
    }
    
    // If we found a matching event but it doesn't have a photoCount property,
    // or if we didn't find a match, return 0
    return 0;
  } catch (error) {
    console.error('Error finding event photo count:', error);
    return 0;
  }
}
