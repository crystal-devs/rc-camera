import { UserSubscription, UserUsage, getSafeSubscriptionProperty, getSafeUsageProperty } from './store';

// These helper functions are no longer needed since we're using getSafeSubscriptionProperty 
// and getSafeUsageProperty directly from the store

/**
 * Format storage size from MB to appropriate unit (MB or GB)
 * @param sizeInMB Size in megabytes
 * @returns Formatted string with unit
 */
export const formatStorageSize = (sizeInMB: number): string => {
  if (sizeInMB < 1000) {
    return `${sizeInMB.toFixed(1)} MB`;
  } else {
    return `${(sizeInMB / 1000).toFixed(1)} GB`;
  }
};

/**
 * Format price with correct currency symbol and decimals
 * @param price Price value 
 * @param currency Currency code (default: USD)
 * @returns Formatted price string with currency symbol
 */
export const formatPrice = (price: number, currency = 'USD'): string => {
  // Handle Stripe-style prices (in cents)
  const actualPrice = price > 1000 && Number.isInteger(price) ? price / 100 : price;
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(actualPrice);
  } catch (error) {
    // Fallback if currency formatting fails
    return `${currency} ${actualPrice.toFixed(2)}`;
  }
};

/**
 * Calculate storage percentage with proper error handling
 * @param subscription Subscription object
 * @param usage Usage object
 * @returns Percentage of storage used (0-100)
 */
export const calculateStoragePercentage = (
  subscription: UserSubscription | null,
  usage: UserUsage | null
): number => {
  console.log('Calculating storage percentage with:', { subscription, usage });
  
  // Get storage values using the safe accessor functions
  const maxStorage = getSafeSubscriptionProperty(subscription, ['limits', 'maxStorage'], 1000);
  const usedStorage = getSafeUsageProperty(usage, ['totals', 'storage'], 0);
  
  console.log('Storage values:', { maxStorage, usedStorage });
  
  // Validate values before calculation
  if (!maxStorage || maxStorage <= 0) {
    console.warn('Invalid maxStorage value:', maxStorage);
    return 0;
  }
  
  if (typeof usedStorage !== 'number') {
    console.warn('Invalid usedStorage type:', typeof usedStorage, usedStorage);
    return 0;
  }
  
  // Ensure both values are numbers
  const usedStorageNum = Number(usedStorage);
  const maxStorageNum = Number(maxStorage);
  
  if (isNaN(usedStorageNum) || isNaN(maxStorageNum)) {
    console.warn('Storage values are not valid numbers:', { usedStorage, maxStorage });
    return 0;
  }
  
  // Calculate percentage and cap at 100%
  const percentage = Math.min(Math.round((usedStorageNum / maxStorageNum) * 100), 100);
  console.log('Calculated percentage:', percentage);
  
  return percentage;
};

/**
 * Get the color for storage status based on percentage used
 * @param percentage Percentage of storage used
 * @returns CSS class name for text color
 */
export const getStorageStatusColor = (percentage: number): string => {
  if (percentage > 90) return 'text-red-500';
  if (percentage > 70) return 'text-amber-500';
  return 'text-green-500';
};
