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

/**
 * Handle subscription limit check with user notification
 * 
 * @param checkResult Result from checkSubscriptionLimit
 * @param onSuccess Optional callback to run if check passes
 * @returns True if within limits, false otherwise
 */
export function handleLimitCheck(
  checkResult: LimitCheckResult, 
  onSuccess?: () => void
): boolean {
  if (!checkResult.allowed) {
    // Show error message to user
    toast.error(checkResult.message, {
      duration: 5000,
      action: {
        label: 'Upgrade Plan',
        onClick: () => {
          // Navigate to settings page
          window.location.href = '/settings';
        }
      }
    });
    return false;
  } else {
    // If we're close to the limit (80% or more), show a warning
    if (checkResult.percentUsed >= 80) {
      toast.warning(`You're approaching your limit. ${checkResult.message}`, {
        duration: 5000,
        action: {
          label: 'View Plans',
          onClick: () => {
            window.location.href = '/settings';
          }
        }
      });
    }
    
    // Run success callback if provided
    if (onSuccess) onSuccess();
    return true;
  }
}

/**
 * Find the number of photos in a specific event
 */
function findEventPhotoCount(usage: UserUsage | null, eventId: string): number {
  if (!usage || !usage.metrics || !Array.isArray(usage.metrics.activeEvents)) {
    return 0;
  }
  
  // This is a simplified version - in reality, you might need to fetch this data
  // from a separate API endpoint that gives you per-event metrics
  const eventDetails = usage.metrics.activeEvents.find(e => 
    typeof e === 'object' && e !== null && e.id === eventId
  );
  
  if (eventDetails && typeof eventDetails === 'object' && 'photoCount' in eventDetails) {
    return (eventDetails as any).photoCount || 0;
  }
  
  return 0;
}
